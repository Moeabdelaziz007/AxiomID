/// <reference types="@cloudflare/workers-types" />
/**
 * PAI-DRV — Google Drive clone on Cloudflare free tier
 * Worker: file storage with R2 (blobs) + D1 (metadata) + KV (sessions)
 *
 * Free tier: R2 10GB zero egress, D1 5GB 5M reads/day, Workers 100K req/day
 * Deploy: CLOUDFLARE_API_TOKEN=xxx npx wrangler deploy
 */

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  SESSIONS: KVNamespace;
  BROWSER?: Fetcher;
}

interface FileMeta {
  id: string;
  name: string;
  folder_id: string | null;
  size: number;
  content_type: string;
  owner_did: string;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_did: string;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────

async function getSession(req: Request, env: Env): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const did = await env.SESSIONS.get(`session:${token}`);
  return did || null;
}

function genToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Routes ───────────────────────────────────────────────────────────

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Public share view (no auth)
    const shareMatch = path.match(/^\/s\/([a-f0-9]+)$/);
    if (shareMatch && method === "GET") {
      return handleShareView(shareMatch[1], env);
    }

    // Auth required for all other routes
    const did = await getSession(req, env);
    if (!did) {
      return json({ error: "Unauthorized" }, 401);
    }

    // ─── File routes ─────────────────────────────────────────────────

    if (path === "/api/upload" && method === "POST") {
      return handleUpload(req, env, did);
    }

    const fileMatch = path.match(/^\/api\/files\/([a-f0-9-]+)$/);
    if (fileMatch) {
      const id = fileMatch[1];
      if (method === "GET") return handleDownload(id, env, did);
      if (method === "PATCH") return handleUpdate(req, id, env, did);
      if (method === "DELETE") return handleDelete(id, env, did);
    }

    const listMatch = path.match(/^\/api\/list\/([a-f0-9-]+|root)$/);
    if (listMatch && method === "GET") {
      return handleList(listMatch[1] === "root" ? null : listMatch[1], env, did);
    }

    // ─── Folder routes ───────────────────────────────────────────────

    if (path === "/api/folders" && method === "POST") {
      return handleCreateFolder(req, env, did);
    }

    // ─── Share routes ────────────────────────────────────────────────

    const shareCreateMatch = path.match(/^\/api\/share\/([a-f0-9-]+)$/);
    if (shareCreateMatch && method === "POST") {
      return handleCreateShare(shareCreateMatch[1], env, did);
    }

    return json({ error: "Not found", path }, 404);
  },
} satisfies ExportedHandler<Env>;

// ─── Handlers ─────────────────────────────────────────────────────────

async function handleUpload(req: Request, env: Env, did: string): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderId = (formData.get("folder_id") as string) || null;

  if (!file) return json({ error: "No file provided" }, 400);

  const id = crypto.randomUUID();
  const r2Key = `${did}/${id}/${file.name}`;

  // Upload to R2
  await env.STORAGE.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  // Insert metadata to D1
  await env.DB.prepare(
    `INSERT INTO files (id, name, folder_id, size, content_type, owner_did, r2_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      file.name,
      folderId,
      file.size,
      file.type || "application/octet-stream",
      did,
      r2Key,
      new Date().toISOString(),
      new Date().toISOString(),
    )
    .run();

  return json({ id, name: file.name, size: file.size, content_type: file.type }, 201);
}

async function handleDownload(id: string, env: Env, did: string): Promise<Response> {
  const meta = await env.DB.prepare(
    `SELECT * FROM files WHERE id = ? AND owner_did = ?`,
  )
    .bind(id, did)
    .first<{ r2_key: string; content_type: string; name: string }>();

  if (!meta) return json({ error: "File not found" }, 404);

  const obj = await env.STORAGE.get(meta.r2_key);
  if (!obj) return json({ error: "Blob not found in R2" }, 404);

  return new Response(obj.body, {
    headers: {
      "Content-Type": meta.content_type,
      "Content-Disposition": `attachment; filename="${meta.name}"`,
    },
  });
}

async function handleList(folderId: string | null, env: Env, did: string): Promise<Response> {
  const files = await env.DB.prepare(
    `SELECT id, name, folder_id, size, content_type, created_at, updated_at
     FROM files WHERE folder_id ${folderId ? "= ?" : "IS NULL"} AND owner_did = ?
     ORDER BY updated_at DESC`,
  )
    .bind(...(folderId ? [folderId, did] : [did]))
    .all();

  const folders = await env.DB.prepare(
    `SELECT id, name, parent_id, created_at FROM folders
     WHERE parent_id ${folderId ? "= ?" : "IS NULL"} AND owner_did = ?
     ORDER BY name`,
  )
    .bind(...(folderId ? [folderId, did] : [did]))
    .all();

  return json({ files: files.results, folders: folders.results });
}

async function handleUpdate(req: Request, id: string, env: Env, did: string): Promise<Response> {
  const body = await req.json<{ name?: string; folder_id?: string | null }>();
  const updates: string[] = [];
  const binds: (string | null)[] = [];

  if (body.name !== undefined) {
    updates.push("name = ?");
    binds.push(body.name);
  }
  if (body.folder_id !== undefined) {
    updates.push("folder_id = ?");
    binds.push(body.folder_id);
  }
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(id, did);

  await env.DB.prepare(
    `UPDATE files SET ${updates.join(", ")} WHERE id = ? AND owner_did = ?`,
  )
    .bind(...binds)
    .run();

  return json({ ok: true });
}

async function handleDelete(id: string, env: Env, did: string): Promise<Response> {
  const meta = await env.DB.prepare(
    `SELECT r2_key FROM files WHERE id = ? AND owner_did = ?`,
  )
    .bind(id, did)
    .first<{ r2_key: string }>();

  if (!meta) return json({ error: "File not found" }, 404);

  await env.STORAGE.delete(meta.r2_key);
  await env.DB.prepare(`DELETE FROM files WHERE id = ? AND owner_did = ?`)
    .bind(id, did)
    .run();

  return json({ ok: true });
}

async function handleCreateFolder(req: Request, env: Env, did: string): Promise<Response> {
  const body = await req.json<{ name: string; parent_id?: string | null }>();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO folders (id, name, parent_id, owner_did, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, body.name, body.parent_id || null, did, new Date().toISOString())
    .run();

  return json({ id, name: body.name, parent_id: body.parent_id || null }, 201);
}

async function handleCreateShare(fileId: string, env: Env, did: string): Promise<Response> {
  const token = genToken();
  await env.DB.prepare(`UPDATE files SET share_token = ? WHERE id = ? AND owner_did = ?`)
    .bind(token, fileId, did)
    .run();
  return json({ share_url: `/s/${token}`, token });
}

async function handleShareView(token: string, env: Env): Promise<Response> {
  const meta = await env.DB.prepare(
    `SELECT r2_key, content_type, name FROM files WHERE share_token = ?`,
  )
    .bind(token)
    .first<{ r2_key: string; content_type: string; name: string }>();

  if (!meta) return json({ error: "Invalid share link" }, 404);

  const obj = await env.STORAGE.get(meta.r2_key);
  if (!obj) return json({ error: "File not available" }, 404);

  return new Response(obj.body, {
    headers: {
      "Content-Type": meta.content_type,
      "Content-Disposition": `inline; filename="${meta.name}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// ─── Utils ────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

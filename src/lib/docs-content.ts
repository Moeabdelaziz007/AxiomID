import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

export interface DocMeta {
  slug: string;
  title: string;
  order: number;
  section: string;
}

export interface DocPage {
  slug: string;
  title: string;
  section: string;
  order: number;
  body: string;
}

export interface DocSearchEntry {
  slug: string;
  title: string;
  snippet: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const [k, ...v] = line.split(": ");
    if (k) meta[k.trim()] = v.join(": ").trim();
  }
  return { meta, body: match[2].trim() };
}

export function getDocBySlug(slug: string): DocPage | null {
  try {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, `${slug}.md`), "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug,
      title: meta.title || slug,
      section: meta.section || "",
      order: parseInt(meta.order || "99", 10),
      body,
    };
  } catch {
    return null;
  }
}

export function getAllDocs(): DocPage[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const docs = files
    .map((f) => getDocBySlug(f.replace(/\.md$/, "")))
    .filter((d): d is DocPage => d !== null)
    .sort((a, b) => a.order - b.order);
  return docs;
}

export function getSearchIndex(): DocSearchEntry[] {
  return getAllDocs().map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    snippet: doc.body.replace(/<[^>]*>/g, "").replace(/\n+/g, " ").slice(0, 150),
  }));
}

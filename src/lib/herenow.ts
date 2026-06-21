function getApiUrl(): string {
  return process.env.HERENOW_API_URL || "https://api.here.now/v1";
}

function getToken(): string {
  return process.env.HERENOW_TOKEN || "";
}

export class HereNowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "HereNowError";
  }
}

interface CreatePageResponse {
  id: string;
  url: string;
}

interface FinalizePageResponse {
  url: string;
  publishedAt: string;
}

async function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 5000, ...init } = options;

  const token = getToken();
  if (!token) {
    throw new HereNowError(
      "HERENOW_TOKEN environment variable is required",
      "MISSING_TOKEN"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HereNowError(
        `here.now API error: ${res.status} ${body}`,
        "API_ERROR",
        res.status
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof HereNowError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new HereNowError("here.now API request timed out", "TIMEOUT");
    }
    throw new HereNowError(
      `here.now API request failed: ${err instanceof Error ? err.message : String(err)}`,
      "REQUEST_FAILED"
    );
  } finally {
    clearTimeout(timer);
  }
}

export interface HereNowClient {
  createPage(opts: {
    title: string;
    slug: string;
  }): Promise<CreatePageResponse>;
  uploadContent(
    pageId: string,
    html: string
  ): Promise<{ ok: boolean }>;
  finalizePage(
    pageId: string
  ): Promise<FinalizePageResponse>;
  publishPage(opts: {
    title: string;
    slug: string;
    html: string;
  }): Promise<{ url: string }>;
}

export function createHereNowClient(): HereNowClient {
  return {
    async createPage({ title, slug }) {
      return request<CreatePageResponse>("/pages", {
        method: "POST",
        body: JSON.stringify({ title, slug }),
      });
    },

    async uploadContent(pageId, html) {
      await request(`/pages/${encodeURIComponent(pageId)}/content`, {
        method: "PUT",
        timeoutMs: 30000,
        body: JSON.stringify({ html }),
      });
      return { ok: true };
    },

    async finalizePage(pageId) {
      return request<FinalizePageResponse>(
        `/pages/${encodeURIComponent(pageId)}/finalize`,
        { method: "POST" }
      );
    },

    async publishPage({ title, slug, html }) {
      const { id } = await this.createPage({ title, slug });
      await this.uploadContent(id, html);
      const { url } = await this.finalizePage(id);
      return { url };
    },
  };
}

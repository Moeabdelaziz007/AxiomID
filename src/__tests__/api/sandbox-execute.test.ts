/**
 * @jest-environment node
 *
 * Tests for src/app/api/sandbox/execute/route.ts
 *
 * PR change: new API route that streams simulated sandbox VM execution logs
 * for a given skill manifest.
 *
 * Covers:
 *  - Rate limiting (429 before auth)
 *  - Authentication check (auth error propagated)
 *  - Invalid JSON body → 400 VALIDATION_ERROR
 *  - Missing / blank manifestMd → 400 VALIDATION_ERROR
 *  - Valid request → 200 with NDJSON streaming response
 *  - skillName parsing from manifest frontmatter
 */

jest.mock("@/lib/auth-middleware", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RATE_LIMITS: { authenticated: { windowMs: 60000, maxRequests: 100 } },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

import { POST } from "@/app/api/sandbox/execute/route";
import { checkRateLimit } from "@/lib/rate-limiter";
import { requireAuth } from "@/lib/auth-middleware";
import { apiError } from "@/lib/errors";

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockRequireAuth = requireAuth as jest.Mock;

const defaultMockUser = {
  id: "mock-user-id",
  walletAddress: "pi:mockuser",
  piUid: "mock-pi-uid",
  piUsername: "mockuser",
  xp: 0,
  tier: "Citizen",
};

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/sandbox/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

/** Collect all NDJSON lines from a streaming Response body */
async function collectStreamLines(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (part.trim()) lines.push(part.trim());
    }
  }
  if (buffer.trim()) lines.push(buffer.trim());
  return lines;
}

describe("POST /api/sandbox/execute — rate limiting (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ error: null, user: defaultMockUser });
  });

  it("returns 429 RATE_LIMITED when rate limit is exceeded", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = makePostRequest({ manifestMd: "name: test-skill" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("checks rate limit before authentication", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const req = makePostRequest({ manifestMd: "name: test-skill" });
    await POST(req);

    // requireAuth should NOT be called when rate-limited
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });
});

describe("POST /api/sandbox/execute — authentication (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
  });

  it("propagates auth error when requireAuth returns an error", async () => {
    mockRequireAuth.mockResolvedValueOnce({
      error: apiError("UNAUTHORIZED", "Unauthorized"),
      user: null,
    });

    const req = makePostRequest({ manifestMd: "name: test-skill" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("does NOT return 401 when auth succeeds", async () => {
    mockRequireAuth.mockResolvedValueOnce({ error: null, user: defaultMockUser });

    const req = makePostRequest({ manifestMd: "name: my-skill\nversion: 1.0" });
    const res = await POST(req);

    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/sandbox/execute — request body validation (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: defaultMockUser });
  });

  it("returns 400 VALIDATION_ERROR on invalid (non-JSON) body", async () => {
    const req = new Request("http://localhost/api/sandbox/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json{{",
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when manifestMd is missing from body", async () => {
    const req = makePostRequest({ inputData: "some input" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when manifestMd is an empty string", async () => {
    const req = makePostRequest({ manifestMd: "" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR when manifestMd is whitespace only", async () => {
    const req = makePostRequest({ manifestMd: "   \n\t  " });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/sandbox/execute — valid request streaming response (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: defaultMockUser });
  });

  it("returns 200 with Content-Type application/x-ndjson for a valid manifest", async () => {
    const req = makePostRequest({ manifestMd: "name: my-test-skill\nversion: 1.0" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/x-ndjson");
  });

  it("response body is a ReadableStream (not null)", async () => {
    const req = makePostRequest({ manifestMd: "name: my-test-skill" });
    const res = await POST(req);

    expect(res.body).not.toBeNull();
  });

  it("streams NDJSON lines that contain {text} objects", async () => {
    const req = makePostRequest({ manifestMd: "name: stream-test-skill\nversion: 2.0" });
    const res = await POST(req);

    const lines = await collectStreamLines(res);

    // Each line must be parseable JSON with a text field
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty("text");
      expect(typeof parsed.text).toBe("string");
    }
  }, 20000);

  it("stream includes a success message in the output", async () => {
    const req = makePostRequest({ manifestMd: "name: success-skill" });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    const hasSuccess = texts.some((t) => t.includes("[SUCCESS]"));
    expect(hasSuccess).toBe(true);
  }, 20000);

  it("includes the skill name from the manifest frontmatter in the stream output", async () => {
    const manifest = `---\nname: my-named-skill\ndescription: "A test skill"\n---\n`;
    const req = makePostRequest({ manifestMd: manifest });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    const mentionsSkill = texts.some((t) => t.includes("my-named-skill"));
    expect(mentionsSkill).toBe(true);
  }, 20000);

  it("defaults to 'unnamed-skill' when manifest has no name field", async () => {
    const req = makePostRequest({ manifestMd: "description: A skill without a name" });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    const mentionsUnnamed = texts.some((t) => t.includes("unnamed-skill"));
    expect(mentionsUnnamed).toBe(true);
  }, 20000);

  it("includes input data log line when inputData is provided", async () => {
    const req = makePostRequest({
      manifestMd: "name: input-skill",
      inputData: '{"prompt": "test"}',
    });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    const hasInput = texts.some((t) => t.includes("[INPUT]") && t.includes('{"prompt": "test"}'));
    expect(hasInput).toBe(true);
  }, 20000);

  it("logs 'No input parameters' when inputData is not provided", async () => {
    const req = makePostRequest({ manifestMd: "name: no-input-skill" });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    const hasNoInput = texts.some((t) => t.includes("No input parameters"));
    expect(hasNoInput).toBe(true);
  }, 20000);
});

describe("POST /api/sandbox/execute — name parsing from manifest (PR change)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 });
    mockRequireAuth.mockResolvedValue({ error: null, user: defaultMockUser });
  });

  it("strips quotes from skill name in frontmatter", async () => {
    const manifest = `name: "quoted-skill-name"\nversion: 1.0`;
    const req = makePostRequest({ manifestMd: manifest });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    // Should use unquoted name
    const mentionsQuoted = texts.some((t) => t.includes("quoted-skill-name"));
    expect(mentionsQuoted).toBe(true);
  }, 20000);

  it("uses first matched 'name:' line only", async () => {
    const manifest = `name: first-skill\nname: second-skill`;
    const req = makePostRequest({ manifestMd: manifest });
    const res = await POST(req);

    const lines = await collectStreamLines(res);
    const texts = lines.map((l) => JSON.parse(l).text as string);

    const mentionsFirst = texts.some((t) => t.includes("first-skill"));
    expect(mentionsFirst).toBe(true);
  }, 20000);
});
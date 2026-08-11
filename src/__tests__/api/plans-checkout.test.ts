import { POST } from "@/app/api/plans/checkout/route";
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

function makeRequest(plan?: string): NextRequest {
  const url = plan ? `https://axiomid.app/api/plans/checkout?plan=${plan}` : "https://axiomid.app/api/plans/checkout";
  return new NextRequest(url, {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.7" },
  });
}

describe("POST /api/plans/checkout", () => {
  const OLD_ENV = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...OLD_ENV, GHOST_API_KEY: "ghost_test_key" };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "db_abc123", name: "aura-creator-1", size: "1x", connection_string: "postgres://secret" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("rejects an invalid plan with 400", async () => {
    const res = await POST(makeRequest("hobby"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 500 when GHOST_API_KEY is not configured (secret never leaves the server)", async () => {
    delete process.env.GHOST_API_KEY;
    const res = await POST(makeRequest("creator"));
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("ghost_test_key");
  });

  it("provisions a shared database for the creator plan and never leaks the connection string", async () => {
    const res = await POST(makeRequest("creator"));
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.plan).toBe("creator");
    expect(body.database.id).toBe("db_abc123");
    expect(body.database.status).toBe("provisioning");
    expect(JSON.stringify(body)).not.toContain("postgres://secret");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/databases/spaces/");
    expect(init.method).toBe("POST");
    expect(init.body).toContain('"wait":false');
    expect(init.headers.Authorization).toBe("Bearer ghost_test_key");
  });

  it("provisions a dedicated 1x database for the power plan", async () => {
    const res = await POST(makeRequest("power"));
    expect(res.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/dedicated/spaces/");
    expect(init.body).toContain('"size":"1x"');
  });

  it("maps a failed ghost API call to 500 and logs via the standard logger", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" });
    const res = await POST(makeRequest("creator"));
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalledWith("[PLANS-CHECKOUT] Provisioning failed:", expect.any(Error));
  });
});
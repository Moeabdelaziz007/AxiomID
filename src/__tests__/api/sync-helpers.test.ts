/**
 * @jest-environment node
 *
 * Tests for src/app/api/sync/sync-helpers.ts
 *
 * Covers:
 * - getBackendConfig: env var validation and happy path
 * - fetchBackendExport: HTTP error, invalid structure, success
 * - upsertItems: dryRun mode, success path, error handling per item
 * - computeSyncMetrics: null/non-null timestamp, entropy delegation
 * - parseDate: various date string formats
 */

jest.mock("@/lib/math-physics", () => ({
  shannonEntropy: jest.fn((s: string) => (s.length > 0 ? 3.5 : 0)),
  dataFreshness: jest.fn(() => 0.9),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import {
  getBackendConfig,
  fetchBackendExport,
  upsertItems,
  computeSyncMetrics,
  parseDate,
} from "@/app/api/sync/sync-helpers";
import { shannonEntropy, dataFreshness } from "@/lib/math-physics";
import { logger } from "@/lib/logger";

const mockShannonEntropy = shannonEntropy as jest.Mock;
const mockDataFreshness = dataFreshness as jest.Mock;
const mockLogger = logger as jest.Mocked<typeof logger>;

// ─── getBackendConfig ─────────────────────────────────────────────────────────

describe("getBackendConfig", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws when CLOUDFLARE_BACKEND_URL is missing", () => {
    delete process.env.CLOUDFLARE_BACKEND_URL;
    process.env.SHARED_SECRET_TOKEN_VERCEL_CF = "secret";
    expect(() => getBackendConfig()).toThrow("Backend URL or shared secret is missing");
  });

  it("throws when SHARED_SECRET_TOKEN_VERCEL_CF is missing", () => {
    process.env.CLOUDFLARE_BACKEND_URL = "https://backend.example.com";
    delete process.env.SHARED_SECRET_TOKEN_VERCEL_CF;
    expect(() => getBackendConfig()).toThrow("Backend URL or shared secret is missing");
  });

  it("throws when both env vars are missing", () => {
    delete process.env.CLOUDFLARE_BACKEND_URL;
    delete process.env.SHARED_SECRET_TOKEN_VERCEL_CF;
    expect(() => getBackendConfig()).toThrow("Backend URL or shared secret is missing");
  });

  it("returns backendUrl and sharedSecret when both env vars are set", () => {
    process.env.CLOUDFLARE_BACKEND_URL = "https://backend.example.com";
    process.env.SHARED_SECRET_TOKEN_VERCEL_CF = "my-secret-token";
    const config = getBackendConfig();
    expect(config).toEqual({
      backendUrl: "https://backend.example.com",
      sharedSecret: "my-secret-token",
    });
  });
});

// ─── fetchBackendExport ───────────────────────────────────────────────────────

describe("fetchBackendExport", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it("throws when the HTTP response is not ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    await expect(
      fetchBackendExport("https://backend.example.com", "secret", 0, "harvestResults")
    ).rejects.toThrow("Cloudflare export API error: 503");
  });

  it("calls fetch with correct URL and auth header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { harvestResults: [{ id: "1" }] },
      }),
    });
    await fetchBackendExport("https://backend.example.com", "my-token", 12345, "harvestResults");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/sync/export?since=12345",
      {
        method: "GET",
        headers: { "X-Shared-Secret": "my-token" },
      }
    );
  });

  it("throws when body.success is false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, data: {} }),
    });
    await expect(
      fetchBackendExport("https://backend.example.com", "secret", 0, "harvestResults")
    ).rejects.toThrow("Export returned invalid structure");
  });

  it("throws when the requested dataKey is missing from body.data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });
    await expect(
      fetchBackendExport("https://backend.example.com", "secret", 0, "harvestResults")
    ).rejects.toThrow("Export returned invalid structure");
  });

  it("returns the data array for the given dataKey", async () => {
    const items = [
      { id: "a", query: "q1", result: "r1", citations: null, user_did: null, created_at: "2024-01-01T00:00:00Z" },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { harvestResults: items } }),
    });
    const result = await fetchBackendExport("https://backend.example.com", "secret", 0, "harvestResults");
    expect(result).toEqual(items);
  });

  it("works for agentPresence dataKey", async () => {
    const items = [{ agent_id: "ag1", status: "ONLINE", last_heartbeat: null, metadata: null }];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { agentPresence: items } }),
    });
    const result = await fetchBackendExport("https://backend.example.com", "secret", 0, "agentPresence");
    expect(result).toEqual(items);
  });

  it("passes since=0 correctly in the URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { harvestResults: [] } }),
    });
    await fetchBackendExport("https://backend.example.com", "secret", 0, "harvestResults");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://backend.example.com/api/sync/export?since=0",
      expect.any(Object)
    );
  });
});

// ─── upsertItems ─────────────────────────────────────────────────────────────

describe("upsertItems", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns synced=items.length and errors=0 in dryRun mode without calling upsertFn", async () => {
    const items = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const upsertFn = jest.fn();
    const result = await upsertItems(items, true, upsertFn, "harvest result", "id");
    expect(result).toEqual({ synced: 3, errors: 0 });
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("calls upsertFn for each item when not in dryRun mode", async () => {
    const items = [{ id: "a" }, { id: "b" }];
    const upsertFn = jest.fn().mockResolvedValue({});
    const result = await upsertItems(items, false, upsertFn, "harvest result", "id");
    expect(result).toEqual({ synced: 2, errors: 0 });
    expect(upsertFn).toHaveBeenCalledTimes(2);
    expect(upsertFn).toHaveBeenCalledWith({ id: "a" });
    expect(upsertFn).toHaveBeenCalledWith({ id: "b" });
  });

  it("increments errors and logs when upsertFn throws", async () => {
    const items = [{ id: "good" }, { id: "bad" }, { id: "also-good" }];
    const upsertFn = jest.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("DB conflict"))
      .mockResolvedValueOnce({});
    const result = await upsertItems(items, false, upsertFn, "harvest result", "id");
    expect(result).toEqual({ synced: 2, errors: 1 });
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("bad"),
      expect.any(Error)
    );
  });

  it("handles an empty items array in dryRun mode", async () => {
    const upsertFn = jest.fn();
    const result = await upsertItems([], true, upsertFn, "harvest result", "id");
    expect(result).toEqual({ synced: 0, errors: 0 });
  });

  it("handles an empty items array in non-dryRun mode", async () => {
    const upsertFn = jest.fn();
    const result = await upsertItems([], false, upsertFn, "harvest result", "id");
    expect(result).toEqual({ synced: 0, errors: 0 });
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("all items fail: synced=0 errors=N", async () => {
    const items = [{ id: "x" }, { id: "y" }];
    const upsertFn = jest.fn().mockRejectedValue(new Error("fail"));
    const result = await upsertItems(items, false, upsertFn, "agent presence", "id");
    expect(result).toEqual({ synced: 0, errors: 2 });
  });

  it("uses idKey to extract identifier for error log message", async () => {
    const items = [{ agent_id: "ag-42", status: "ONLINE" }] as Array<{ agent_id: string; status: string }>;
    const upsertFn = jest.fn().mockRejectedValue(new Error("oops"));
    await upsertItems(items, false, upsertFn, "agent presence", "agent_id" as keyof typeof items[0]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("ag-42"),
      expect.any(Error)
    );
  });
});

// ─── computeSyncMetrics ───────────────────────────────────────────────────────

describe("computeSyncMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShannonEntropy.mockReturnValue(3.5);
    mockDataFreshness.mockReturnValue(0.9);
  });

  it("returns freshness=0 when freshnessTimestamp is null", () => {
    const result = computeSyncMetrics("some data", null);
    expect(result.freshness).toBe(0);
    expect(mockDataFreshness).not.toHaveBeenCalled();
  });

  it("calls shannonEntropy with the provided entropyInput", () => {
    computeSyncMetrics("hello world", null);
    expect(mockShannonEntropy).toHaveBeenCalledWith("hello world");
  });

  it("calls dataFreshness when freshnessTimestamp is provided", () => {
    const ts = 1700000000000;
    computeSyncMetrics("data", ts);
    expect(mockDataFreshness).toHaveBeenCalledWith(ts);
  });

  it("returns entropy and freshness from respective functions", () => {
    mockShannonEntropy.mockReturnValue(2.1);
    mockDataFreshness.mockReturnValue(0.75);
    const result = computeSyncMetrics("data", 1700000000000);
    expect(result).toEqual({ entropy: 2.1, freshness: 0.75 });
  });

  it("returns freshness=0 when freshnessTimestamp is 0 (falsy)", () => {
    const result = computeSyncMetrics("data", 0);
    expect(result.freshness).toBe(0);
    expect(mockDataFreshness).not.toHaveBeenCalled();
  });

  it("handles empty string entropyInput", () => {
    computeSyncMetrics("", null);
    expect(mockShannonEntropy).toHaveBeenCalledWith("");
  });
});

// ─── parseDate ────────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it("parses a UTC ISO string ending in Z as-is", () => {
    const d = parseDate("2024-06-15T12:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("parses a datetime string without timezone by appending Z", () => {
    // "2024-06-15 12:00:00" has no Z, +, or GMT → treated as UTC
    const d = parseDate("2024-06-15 12:00:00");
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("parses a string with a + offset without modification", () => {
    // Contains '+' so no Z appended
    const d = parseDate("2024-06-15T12:00:00+05:30");
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it("parses a string containing GMT without modification", () => {
    const d = parseDate("Mon, 01 Jan 2024 00:00:00 GMT");
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it("replaces space separator with T when no timezone indicator present", () => {
    // Ensures the space→T substitution happens before appending Z
    const d = parseDate("2024-01-01 00:00:00");
    expect(d.toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("handles ISO string that already has explicit +00:00 offset", () => {
    const d = parseDate("2024-06-15T12:00:00+00:00");
    expect(isNaN(d.getTime())).toBe(false);
    expect(d.toISOString()).toBe("2024-06-15T12:00:00.000Z");
  });

  it("returns a Date object for all valid inputs", () => {
    const inputs = [
      "2024-06-15T12:00:00Z",
      "2024-06-15 12:00:00",
      "2024-06-15T12:00:00+00:00",
    ];
    for (const input of inputs) {
      expect(parseDate(input)).toBeInstanceOf(Date);
    }
  });
});
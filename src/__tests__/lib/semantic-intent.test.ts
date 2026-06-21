const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { semanticIntentAnalysis } from "@/lib/soul/semantic-intent";

describe("semanticIntentAnalysis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_AI_API_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_AI_API_TOKEN;
  });

  it("returns NO when AI says action is not harmful", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "NO" } }),
    });

    const result = await semanticIntentAnalysis("create_user", false);
    expect(result).toBe("NO");
  });

  it("returns YES when AI says action is harmful", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "YES" } }),
    });

    const result = await semanticIntentAnalysis("steal_funds", true);
    expect(result).toBe("YES");
  });

  it("falls back to keyword verdict when AI times out", async () => {
    // Mock fetch to reject when abort signal fires
    mockFetch.mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_, reject) => {
        if (opts?.signal) {
          opts.signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }
      });
    });

    const result = await semanticIntentAnalysis("delete_cache", true);
    expect(result).toBe("YES"); // keyword fallback = true
  });

  it("falls back to keyword verdict when AI returns non-OK", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await semanticIntentAnalysis("delete_cache", false);
    expect(result).toBe("NO"); // keyword fallback = false
  });

  it("returns keyword verdict when env vars are missing", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_AI_API_TOKEN;

    const result = await semanticIntentAnalysis("delete_cache", true);
    expect(result).toBe("YES");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("caches results for 1 hour", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { response: "NO" } }),
    });

    // First call — hits API
    await semanticIntentAnalysis("test_action", false);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call — uses cache
    await semanticIntentAnalysis("test_action", false);
    expect(mockFetch).toHaveBeenCalledTimes(1); // still 1
  });
});

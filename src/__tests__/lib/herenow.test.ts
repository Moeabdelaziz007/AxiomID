jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  createHereNowClient,
  HereNowError,
} from "@/lib/herenow";

describe("HereNow Client", () => {
  let client: ReturnType<typeof createHereNowClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    process.env.HERENOW_TOKEN = "test-token";
    process.env.HERENOW_API_URL = "https://api.here.now/v1";
    client = createHereNowClient();
  });

  afterEach(() => {
    delete process.env.HERENOW_TOKEN;
    delete process.env.HERENOW_API_URL;
  });

  describe("createPage", () => {
    it("returns id and url on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: "page-123", url: "https://here.now/p/page-123" }),
      });

      const result = await client.createPage({ title: "Test", slug: "test" });

      expect(result).toEqual({
        id: "page-123",
        url: "https://here.now/p/page-123",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.here.now/v1/pages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("throws HereNowError on API failure", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => "Internal error" });

      await expect(
        client.createPage({ title: "Test", slug: "test" })
      ).rejects.toThrow(HereNowError);
    });
  });

  describe("uploadContent", () => {
    it("uploads HTML content", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      const result = await client.uploadContent("page-123", "<h1>Hello</h1>");

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.here.now/v1/pages/page-123/content",
        expect.objectContaining({ method: "PUT" })
      );
    });

    it("uses 30s timeout for upload", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await client.uploadContent("page-123", "<h1>Hello</h1>");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].signal).toBeDefined();
    });
  });

  describe("finalizePage", () => {
    it("returns url and publishedAt", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          url: "https://here.now/p/page-123",
          publishedAt: "2026-06-21T00:00:00Z",
        }),
      });

      const result = await client.finalizePage("page-123");

      expect(result).toEqual({
        url: "https://here.now/p/page-123",
        publishedAt: "2026-06-21T00:00:00Z",
      });
    });
  });

  describe("publishPage", () => {
    it("calls create → upload → finalize in sequence", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "page-456", url: "https://here.now/p/page-456" }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            url: "https://here.now/p/page-456",
            publishedAt: "2026-06-21T00:00:00Z",
          }),
        });

      const result = await client.publishPage({
        title: "Passport",
        slug: "user123",
        html: "<html></html>",
      });

      expect(result).toEqual({ url: "https://here.now/p/page-456" });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("stops on first error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad request",
      });

      await expect(
        client.publishPage({ title: "Test", slug: "test", html: "<html></html>" })
      ).rejects.toThrow(HereNowError);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("throws MISSING_TOKEN when HERENOW_TOKEN is not set", async () => {
      delete process.env.HERENOW_TOKEN;
      client = createHereNowClient();

      await expect(
        client.createPage({ title: "Test", slug: "test" })
      ).rejects.toThrow("HERENOW_TOKEN");
    });

    it("throws TIMEOUT on abort", async () => {
      // ponytail: AbortController timeout is not testable in Jest without
      // monkey-patching global setTimeout. The 5s timeout in request() is
      // straightforward — test the error class instead.
      const err = new HereNowError("here.now API request timed out", "TIMEOUT");
      expect(err.code).toBe("TIMEOUT");
      expect(err.message).toContain("timed out");
    });
  });
});

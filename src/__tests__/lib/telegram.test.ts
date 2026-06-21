const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import {
  sendTelegramMessage,
  sendDailyReviewNotification,
  sendMilestoneNotification,
} from "@/lib/telegram";

describe("Telegram", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  describe("sendTelegramMessage", () => {
    it("sends message via Bot API", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      const result = await sendTelegramMessage({
        chatId: "12345",
        text: "Hello",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bottest-bot-token/sendMessage",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: "12345",
            text: "Hello",
            parse_mode: "HTML",
          }),
        })
      );
    });

    it("returns false when token is missing", async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const result = await sendTelegramMessage({ chatId: "12345", text: "Hi" });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false on API error", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 400, text: async () => "Bad request" });

      const result = await sendTelegramMessage({ chatId: "12345", text: "Hi" });

      expect(result).toBe(false);
    });
  });

  describe("sendDailyReviewNotification", () => {
    it("formats and sends daily review message", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      const result = await sendDailyReviewNotification(
        "12345",
        "https://here.now/p/review",
        { totalUsers: 100, activeUsers: 25, newStamps: 5, date: "2026-06-21" }
      );

      expect(result).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain("100");
      expect(body.text).toContain("25");
      expect(body.text).toContain("https://here.now/p/review");
    });
  });

  describe("sendMilestoneNotification", () => {
    it("formats and sends milestone message", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      const result = await sendMilestoneNotification(
        "12345",
        { type: "barakah", count: 700, message: "Full Barakah reached!" }
      );

      expect(result).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.text).toContain("700");
      expect(body.text).toContain("Full Barakah");
    });
  });
});

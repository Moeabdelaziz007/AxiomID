/**
 * @jest-environment node
 */

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("telegraf", () => {
  return {
    Telegraf: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        command: jest.fn(),
        handleUpdate: jest.fn().mockResolvedValue(true),
      };
    }),
  };
});

import { POST } from "@/app/api/telegram/route";
import { logger } from "@/lib/logger";

const mockLoggerError = logger.error as jest.Mock;

// The route module instantiates the bot at import time.
// Capture the mock bot instance from the Telegraf factory mock.
// We use jest.requireMock so we get the mocked version after jest.mock hoisting.
const { Telegraf: MockTelegraf } = jest.requireMock("telegraf") as {
  Telegraf: jest.Mock;
};

// bot is the object returned by new Telegraf(...) inside the route module
const mockBot = MockTelegraf.mock.results[0]?.value as {
  start: jest.Mock;
  command: jest.Mock;
  handleUpdate: jest.Mock;
};

describe("Telegram Webhook", () => {
  beforeEach(() => {
    mockBot.handleUpdate.mockReset();
    mockBot.handleUpdate.mockResolvedValue(true);
    mockLoggerError.mockClear();
  });

  it("handles incoming webhook requests successfully", async () => {
    const req = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ update_id: 123, message: { text: "/start" } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
  });

  it("calls bot.handleUpdate with the parsed request body", async () => {
    const body = { update_id: 789, message: { text: "/passport" } };
    const req = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req);
    expect(mockBot.handleUpdate).toHaveBeenCalledWith(body);
  });

  it("returns 500 and calls logger.error when handleUpdate throws", async () => {
    mockBot.handleUpdate.mockRejectedValue(new Error("Telegram API error"));

    const req = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ update_id: 456, message: { text: "/start" } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Internal Server Error");
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Error handling Telegram webhook:",
      expect.any(Error),
    );
  });

  it("returns 500 when request body is not valid JSON", async () => {
    const req = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: "not-valid-json{{{",
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("Internal Server Error");
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Error handling Telegram webhook:",
      expect.anything(),
    );
  });
});

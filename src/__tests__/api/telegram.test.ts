import { POST } from "@/app/api/telegram/route";
import { Telegraf } from "telegraf";

jest.mock("telegraf", () => {
  return {
    Telegraf: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        command: jest.fn(),
        handleUpdate: jest.fn().mockResolvedValue(true),
      };
    })
  };
});

describe("Telegram Webhook", () => {
  it("handles incoming webhook requests", async () => {
    const req = new Request("http://localhost/api/telegram", {
      method: "POST",
      body: JSON.stringify({ update_id: 123, message: { text: "/start" } }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
  });
});

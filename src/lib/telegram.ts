import { logger } from "./logger";

const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

/**
 * Send a message via Telegram Bot API.
 *
 * @param message - The message to send
 * @returns true on success, false on failure (fire-and-forget safe)
 */
export async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("[TELEGRAM] TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: message.chatId,
        text: message.text,
        parse_mode: message.parseMode || "HTML",
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("[TELEGRAM] Failed to send message", { status: res.status, body });
      return false;
    }

    logger.info("[TELEGRAM] Message sent", { chatId: message.chatId });
    return true;
  } catch (err) {
    logger.error("[TELEGRAM] Error sending message", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Send the daily review report to Telegram.
 *
 * @param chatId - The Telegram chat ID to send to
 * @param reviewUrl - The here.now URL of the published review
 * @param stats - Summary stats for the message
 */
export async function sendDailyReviewNotification(
  chatId: string,
  reviewUrl: string,
  stats: { totalUsers: number; activeUsers: number; newStamps: number; date: string }
): Promise<boolean> {
  const text = [
    `<b>AxiomID Daily Review — ${stats.date}</b>`,
    "",
    `Users: <b>${stats.totalUsers.toLocaleString()}</b>`,
    `Active (24h): <b>${stats.activeUsers.toLocaleString()}</b>`,
    `New Stamps: <b>${stats.newStamps}</b>`,
    "",
    `<a href="${reviewUrl}">View Full Report</a>`,
  ].join("\n");

  return sendTelegramMessage({ chatId, text, parseMode: "HTML" });
}

/**
 * Send a milestone notification to Telegram.
 *
 * @param chatId - The Telegram chat ID
 * @param milestone - The milestone details
 */
export async function sendMilestoneNotification(
  chatId: string,
  milestone: { type: string; count: number; message: string }
): Promise<boolean> {
  const text = [
    `<b>Barakah Milestone Reached!</b>`,
    "",
    `${milestone.message}`,
    `Count: <b>${milestone.count.toLocaleString()}</b>`,
    `Type: ${milestone.type}`,
  ].join("\n");

  return sendTelegramMessage({ chatId, text, parseMode: "HTML" });
}

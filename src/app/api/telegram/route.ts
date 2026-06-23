import { Telegraf } from "telegraf";
import { NextResponse } from "next/server";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  // Let it pass for build if env var is missing, but log an error.
  console.error("TELEGRAM_BOT_TOKEN is not defined");
}

const bot = new Telegraf(botToken || "dummy_token_for_build");
const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axiomid.app";

// /start command
bot.start((ctx) => {
  ctx.reply("مرحباً بك في AxiomID! اضغط على الزر أدناه لفتح التطبيق.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌟 افتح التطبيق", web_app: { url: webAppUrl } }],
      ],
    },
  });
});

// /passport command
bot.command("passport", async (ctx) => {
  const passportUrl = `${webAppUrl}/passport`;

  ctx.reply("بطاقة الجواز الخاصة بك:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🪪 عرض الجواز", web_app: { url: passportUrl } }],
      ],
    },
  });
});

// /claim command
bot.command("claim", (ctx) => {
  const claimUrl = `${webAppUrl}/claim`;
  ctx.reply("اضغط أدناه لبدء عملية المطالبة (Claim Flow):", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎁 ابدأ الـ Claim", web_app: { url: claimUrl } }],
      ],
    },
  });
});

// /rank command
bot.command("rank", async (ctx) => {
  const leaderboardUrl = `${webAppUrl}/leaderboard`;

  ctx.reply("لمعرفة ترتيبك في الـ Leaderboard، افتح التطبيق:", {
      reply_markup: {
          inline_keyboard: [
              [{ text: "🏆 عرض الـ Leaderboard", web_app: { url: leaderboardUrl } }],
          ]
      }
  });
});

// Handle incoming webhook requests
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error handling Telegram webhook:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

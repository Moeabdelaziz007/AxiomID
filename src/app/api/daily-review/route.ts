import { NextRequest } from "next/server";
import { runDailyReview } from "@/lib/daily-review";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { url } = await runDailyReview();
    return Response.json({ ok: true, url });
  } catch (err) {
    logger.error("[DAILY-REVIEW] Failed to run daily review", { error: err });
    return new Response("Internal Server Error", { status: 500 });
  }
}

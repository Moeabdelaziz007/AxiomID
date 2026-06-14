import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { apiError, apiSuccess } from "@/lib/errors";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { agentId } = await req.json();
  if (!agentId) return apiError("VALIDATION_ERROR", "Missing agentId");

  // Forward to Cloudflare Durable Object
  const backendUrl = process.env.CLOUDFLARE_BACKEND_URL;
  const sharedSecret = process.env.SHARED_SECRET_TOKEN_VERCEL_CF;

  if (!backendUrl || !sharedSecret) {
    return apiError("INTERNAL_ERROR", "Backend configuration missing");
  }

  try {
    const response = await fetch(`${backendUrl}/heartbeat?agentId=${agentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shared-Secret": sharedSecret,
      },
    });

    if (!response.ok) {
      return apiError("INTERNAL_ERROR", "Failed to update presence");
    }

    return apiSuccess({ status: "OK" });
  } catch (error) {
    console.error("Presence heartbeat error:", error);
    return apiError("INTERNAL_ERROR", "Failed to update presence");
  }
}

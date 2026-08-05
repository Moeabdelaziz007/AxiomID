import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { apiError, apiSuccess } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { piNetwork } from "@/lib/pi-sdk";
import { TrustChain } from "@/lib/trustchain";
import { deriveKeypair } from "@axiomid/crypto";

export const dynamic = "force-dynamic";

const INCOMPLETE_PAYMENT_ACTIONS = [
  "com.pai.payment.incomplete_detected",
  "com.pai.payment.auto_resolved",
  "com.pai.payment.manual_review_required",
] as const;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `incomplete_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // 1. Verify Pi Network webhook signature
    const headersList = await headers();
    const signature = headersList.get("x-pi-signature");
    const timestamp = headersList.get("x-pi-timestamp");

    if (!signature || !timestamp) {
      logger.warn("Incomplete payment webhook missing signature", { requestId });
      return apiError("UNAUTHORIZED", "Missing Pi signature", { status: 401 });
    }

    // 2. Verify webhook authenticity
    const body = await req.text();
    const isValid = await piNetwork.verifyWebhook(body, signature, timestamp);

    if (!isValid) {
      logger.warn("Incomplete payment webhook invalid signature", { requestId });
      return apiError("UNAUTHORIZED", "Invalid Pi signature", { status: 401 });
    }

    // 3. Parse payment data
    const paymentData = JSON.parse(body);
    const {
      paymentId,
      userId,
      amount,
      currency,
      metadata,
      status,
      createdAt,
    } = paymentData;

    logger.info("Incomplete payment detected", {
      requestId,
      paymentId,
      userId,
      amount,
      status,
    });

    // 4. Record in TrustChain
    const trustChainEntry = await TrustChain.append({
      type: "payment_incomplete",
      actor: `did:agent:pi:${userId}`,
      target: paymentId,
      data: {
        paymentId,
        amount,
        currency,
        status,
        metadata,
        createdAt,
        requestId,
      },
      metadata: {
        priority: "high",
        tags: ["payment", "incomplete", "auto-resolve"],
      },
    });

    // 5. Attempt auto-resolution
    let resolutionResult = null;
    let actionTaken = "detected";

    try {
      // Check if payment can be auto-resolved (e.g., user completed in another session)
      const paymentStatus = await piNetwork.getPaymentStatus(paymentId);

      if (paymentStatus === "COMPLETED") {
        // Payment was completed - resolve it
        const resolution = await resolveIncompletePayment(paymentId, userId, amount);
        resolutionResult = resolution;
        actionTaken = "auto_resolved";

        // Record resolution
        await TrustChain.append({
          type: "payment_auto_resolved",
          actor: `did:agent:pi:${userId}`,
          target: paymentId,
          data: {
            paymentId,
            resolution,
            originalStatus: status,
            resolvedAt: Date.now(),
          },
        });

        logger.info("Incomplete payment auto-resolved", {
          requestId,
          paymentId,
          resolution,
        });
      } else if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
        // Payment failed - record and notify
        actionTaken = "failed";

        await TrustChain.append({
          type: "payment_failed",
          actor: `did:agent:pi:${userId}`,
          target: paymentId,
          data: {
            paymentId,
            finalStatus: paymentStatus,
            failedAt: Date.now(),
          },
        });
      } else {
        // Still pending - flag for manual review if older than threshold
        const ageMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
        const REVIEW_THRESHOLD_MINUTES = 30;

        if (ageMinutes > REVIEW_THRESHOLD_MINUTES) {
          actionTaken = "manual_review_required";

          await TrustChain.append({
            type: "payment_manual_review",
            actor: `did:agent:pi:${userId}`,
            target: paymentId,
            data: {
              paymentId,
              ageMinutes,
              thresholdMinutes: REVIEW_THRESHOLD_MINUTES,
              reason: "Exceeded auto-resolution window",
            },
          });

          // Notify admin/review queue
          await notifyReviewQueue(paymentId, userId, ageMinutes);
        }
      }
    } catch (resolutionError) {
      logger.error("Auto-resolution failed", {
        requestId,
        paymentId,
        error: resolutionError instanceof Error ? resolutionError.message : String(resolutionError),
      });
      actionTaken = "resolution_failed";
    }

    // 6. Emit event for downstream consumers
    await emitIncompletePaymentEvent({
      requestId,
      paymentId,
      userId,
      amount,
      currency,
      status,
      actionTaken,
      resolutionResult,
      timestamp: Date.now(),
    });

    return apiSuccess({
      received: true,
      requestId,
      paymentId,
      actionTaken,
      resolutionResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Incomplete payment webhook failed", {
      requestId,
      error: message,
    });

    return apiError("INTERNAL_ERROR", "Failed to process incomplete payment", {
      status: 500,
      details: { requestId },
    });
  }
}

async function resolveIncompletePayment(
  paymentId: string,
  userId: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; trustDelta?: number }> {
  try {
    // Derive user's keypair for signing
    const keypair = await deriveKeypair(
      `did:agent:pi:${userId}`,
      process.env.SOVEREIGN_KEY_SALT!
    );

    // Complete the payment on Pi Network
    const completion = await piNetwork.completePayment({
      paymentId,
      amount,
      keypair,
    });

    // Update trust score
    const trustDelta = calculateTrustDelta(amount, "payment_completed");

    return {
      success: true,
      txHash: completion.txHash,
      trustDelta,
    };
  } catch (error) {
    logger.error("Payment resolution failed", { paymentId, error });
    return { success: false };
  }
}

function calculateTrustDelta(amount: number, action: string): number {
  const baseXP = Math.min(Math.floor(amount * 10), 500); // Cap at 500 XP per payment
  const multipliers: Record<string, number> = {
    payment_completed: 1.0,
    payment_incomplete: -0.1,
    payment_failed: -0.05,
    payment_auto_resolved: 0.5,
  };
  return Math.floor(baseXP * (multipliers[action] || 1));
}

async function notifyReviewQueue(
  paymentId: string,
  userId: string,
  ageMinutes: number
): Promise<void> {
  // In production: send to review queue (Discord, email, Slack, etc.)
  logger.warn("Payment requires manual review", {
    paymentId,
    userId,
    ageMinutes,
    reviewUrl: `https://axiomid.app/admin/payments/${paymentId}`,
  });
}

async function emitIncompletePaymentEvent(data: {
  requestId: string;
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  actionTaken: string;
  resolutionResult: any;
  timestamp: number;
}): Promise<void> {
  // Emit to event bus for downstream consumers (ACP, ADP, analytics)
  try {
    // This would integrate with your event bus (Kafka, NATS, etc.)
    // await eventBus.publish({
    //   eventId: `evt_${data.requestId}`,
    //   eventType: "com.pai.payment.incomplete_detected",
    //   timestamp: data.timestamp,
    //   sourceAgent: "axiomid-payment-webhook",
    //   payload: data,
    //   schemaVersion: 1,
    // });
    logger.debug("Incomplete payment event emitted", { requestId: data.requestId });
  } catch (error) {
    logger.warn("Failed to emit incomplete payment event", { error });
  }
}

// GET endpoint for manual status check
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return apiError("VALIDATION_ERROR", "paymentId is required", { status: 400 });
    }

    const status = await piNetwork.getPaymentStatus(paymentId);
    const trustChainEntries = await TrustChain.query({
      target: paymentId,
      types: ["payment_incomplete", "payment_auto_resolved", "payment_failed"],
    });

    return apiSuccess({
      paymentId,
      status,
      trustChainEntries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError("INTERNAL_ERROR", "Failed to check payment status", {
      status: 500,
      details: { message },
    });
  }
}
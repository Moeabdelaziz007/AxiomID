import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";
import { OrderActionSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const parsed = OrderActionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  const { paymentId } = parsed.data;

  const payment = await prisma.piPayment.findUnique({ where: { id: paymentId } });
  if (!payment) return apiError("NOT_FOUND", "Payment not found");
  if (payment.userId !== auth.user.id) return apiError("FORBIDDEN", "Unauthorized");
  if (payment.status !== "ESCROWED") return apiError("CONFLICT", "Payment not in escrow");

  await prisma.piPayment.update({
    where: { id: paymentId },
    data: { status: "REFUNDED" },
  });

  return apiSuccess({ status: "REFUNDED" });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /verify/:verificationId
 * Retrieve PAI verification result by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ verificationId: string }> }
): Promise<NextResponse> {
  const { verificationId } = await params;

  try {
    const record = await prisma.paiVerification.findUnique({
      where: { id: verificationId },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, verified: false, did: "", timestamp: new Date().toISOString(), message: "Verification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: record.verified,
      did: record.did,
      timestamp: record.createdAt.toISOString(),
      verificationId: record.id,
      message: record.message,
      errors: record.errors,
    });
  } catch (err) {
    console.error("[PAI Verify] GET error:", err);
    return NextResponse.json(
      { success: false, verified: false, did: "", timestamp: new Date().toISOString(), message: "Failed to retrieve verification" },
      { status: 500 }
    );
  }
}

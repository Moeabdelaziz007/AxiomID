import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/errors";
import { CredentialStatusQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = CredentialStatusQuerySchema.safeParse({
    credentialId: searchParams.get("credentialId"),
    subjectId: searchParams.get("subjectId"),
  });

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0].message, parsed.error.issues);
  }

  const { credentialId, subjectId } = parsed.data;

  try {
    const rawDid = credentialId || subjectId || "";
    if (!rawDid.startsWith("did:axiom:")) {
      return apiError("VALIDATION_ERROR", "Invalid DID method");
    }

    const didContent = rawDid.replace(/^did:axiom:/, "");

    if (didContent === "issuer") {
      return apiSuccess({
        revoked: false,
        status: "VALID",
        subjectId: rawDid,
        lastUpdated: new Date().toISOString(),
      });
    }

    let user = null;

    if (didContent.startsWith("user-")) {
      const uuid = didContent.replace(/^user-/, "");
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        return apiError("VALIDATION_ERROR", "Invalid user UUID format");
      }
      user = await prisma.user.findUnique({ where: { id: uuid } });
    } else {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { did: rawDid },
            { piUsername: didContent },
          ],
        },
      });
    }

    if (!user) {
      return apiError("NOT_FOUND", "Subject not found");
    }

    const revoked = user.kycStatus === "REJECTED";
    return apiSuccess({
      revoked,
      status: revoked ? "REVOKED" : "VALID",
      subjectId: user.did || `did:axiom:user-${user.id}`,
      lastUpdated: user.updatedAt.toISOString(),
    });
  } catch {
    return apiError("INTERNAL_ERROR", "Failed to check credential status");
  }
}

import { z } from "zod";
import crypto from "crypto";


const DID_METHOD = "did:axiom";

const UserIdSchema = z.string().min(1);

export function createUserDid(userId: string): string {
  UserIdSchema.parse(userId);
  return `${DID_METHOD}:user-${userId}`;
}

export function createIssuerDid(): string {
  return `${DID_METHOD}:issuer`;
}

export function createPiDid(uid: string): string {
  UserIdSchema.parse(uid);
  return `${DID_METHOD}:axiomid.app:pi:${encodeURIComponent(uid)}`;
}

export function deriveDid(assertion: string): string {
  const parts = assertion.split(".");
  const payload = parts[1] || "";
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  return `did:axiom:user:${hash.slice(0, 16)}`;
}


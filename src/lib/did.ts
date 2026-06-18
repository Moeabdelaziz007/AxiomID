import { z } from "zod";

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

import { z } from "zod";

const DID_METHOD = "did:axiom";

const UserIdSchema = z.string().min(1);
const PassportSlugSchema = z.string().min(1);

export function createUserDid(userId: string): string {
  UserIdSchema.parse(userId);
  return `${DID_METHOD}:user-${userId}`;
}

export function createIssuerDid(): string {
  return `${DID_METHOD}:issuer`;
}

export function createPassportDid(slug: string): string {
  PassportSlugSchema.parse(slug);
  const sanitized = slug
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!sanitized) {
    throw new Error("Passport slug cannot be empty after sanitization");
  }
  return `${DID_METHOD}:${sanitized}`;
}

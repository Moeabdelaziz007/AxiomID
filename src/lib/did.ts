const DID_METHOD = "did:axiom";

export function createUserDid(userId: string): string {
  return `${DID_METHOD}:user-${userId}`;
}

export function createIssuerDid(): string {
  return `${DID_METHOD}:issuer`;
}

export function createPassportDid(slug: string): string {
  const sanitized = slug.replace(/[^a-zA-Z0-9-]/g, "");
  return `${DID_METHOD}:${sanitized}`;
}

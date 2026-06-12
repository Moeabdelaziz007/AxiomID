const DID_SEGMENT_MAX_LENGTH = 96;

export function createAxiomDid(subject: string): string {
  const normalized = subject
    .trim()
    .toLowerCase()
    .replace(/^(pi|demo):/, "$1-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, DID_SEGMENT_MAX_LENGTH);

  return `did:axiom:axiomid.app:${normalized || "user"}`;
}

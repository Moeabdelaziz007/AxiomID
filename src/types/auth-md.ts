export type AuthMdScope = "api.read" | "api.write" | "agent.sign";

export interface IdentityAssertion {
  type: "identity_assertion";
  assertion: string; // Pi ID-JAG JWT
}

export interface AnonymousRegistration {
  type: "anonymous";
}

export type AgentRegistration = IdentityAssertion | AnonymousRegistration;

export interface ClaimToken {
  token: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  userId: string | null;
  status: "pending" | "confirmed" | "expired";
}

export interface AgentAuth {
  userId: string;
  did: string;
  scopes: AuthMdScope[];
  issuedAt: number;
  expiresAt: number;
}

export interface TokenExchangeRequest {
  grant_type: "jwt-bearer" | "claim";
  assertion?: string;
  claim_token?: string;
}

export interface TokenRevocationRequest {
  token: string;
}

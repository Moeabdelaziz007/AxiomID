import type { AxiomSDK } from "../client";
import type { DIDDocument, Passport, TrustScore } from "../types";

export interface AxiomAgentBootstrapConfig {
  sdk: AxiomSDK;
  agentDid?: string;
  minimumTrustScore?: number;
  now?: () => Date;
}

export interface AxiomAgentContextInput {
  did: string;
  passportSlug?: string;
  minimumTrustScore?: number;
  purpose?: string;
}

export interface SoulGateDecision {
  did: string;
  allowed: boolean;
  score: number;
  tier: string;
  minimumTrustScore: number;
  purpose?: string;
  reason: string;
}

export interface AxiomAgentContext {
  did: string;
  didDocument: DIDDocument;
  trustScore: TrustScore;
  soulGate: SoulGateDecision;
  passport?: Passport;
}

export interface AgentAttestationDraftInput {
  issuerDid?: string;
  subjectDid: string;
  claim: string;
  evidence?: Record<string, unknown>;
  expiresAt?: string;
}

export interface AgentAttestationDraft {
  id: string;
  type: ["VerifiableCredential", "AxiomAgentAttestation"];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    claim: string;
    evidence?: Record<string, unknown>;
  };
  status: "unsigned";
  proofPurpose: "agent-attestation-draft";
}

const DEFAULT_MINIMUM_TRUST_SCORE = 50;

export class AxiomAgentBootstrap {
  private readonly sdk: AxiomSDK;
  private readonly agentDid?: string;
  private readonly minimumTrustScore: number;
  private readonly now: () => Date;

  constructor(config: AxiomAgentBootstrapConfig) {
    this.sdk = config.sdk;
    this.agentDid = config.agentDid;
    this.minimumTrustScore =
      config.minimumTrustScore ?? DEFAULT_MINIMUM_TRUST_SCORE;
    this.now = config.now ?? (() => new Date());
  }

  async buildContext(input: AxiomAgentContextInput): Promise<AxiomAgentContext> {
    const [didDocument, trustScore, passport] = await Promise.all([
      this.sdk.resolveDID(input.did),
      this.sdk.getTrustScore(input.did),
      input.passportSlug
        ? this.sdk.verifyPassport(input.passportSlug)
        : Promise.resolve(undefined),
    ]);

    return {
      did: input.did,
      didDocument,
      trustScore,
      soulGate: this.evaluateSoulGate(
        input.did,
        trustScore,
        input.minimumTrustScore,
        input.purpose
      ),
      passport,
    };
  }

  async requireSoulGate(input: {
    did: string;
    minimumTrustScore?: number;
    purpose?: string;
  }): Promise<SoulGateDecision> {
    const trustScore = await this.sdk.getTrustScore(input.did);
    return this.evaluateSoulGate(
      input.did,
      trustScore,
      input.minimumTrustScore,
      input.purpose
    );
  }

  createAttestationDraft(
    input: AgentAttestationDraftInput
  ): AgentAttestationDraft {
    const issuer = input.issuerDid ?? this.agentDid;
    if (!issuer) {
      throw new Error("issuerDid is required when no agentDid is configured");
    }

    const issuedAt = this.now().toISOString();
    const draft: AgentAttestationDraft = {
      id: `urn:axiomid:attestation:${issuedAt}`,
      type: ["VerifiableCredential", "AxiomAgentAttestation"],
      issuer,
      issuanceDate: issuedAt,
      credentialSubject: {
        id: input.subjectDid,
        claim: input.claim,
        evidence: input.evidence,
      },
      status: "unsigned",
      proofPurpose: "agent-attestation-draft",
    };

    if (input.expiresAt) {
      draft.expirationDate = input.expiresAt;
    }

    return draft;
  }

  private evaluateSoulGate(
    did: string,
    trustScore: TrustScore,
    minimumTrustScore: number | undefined,
    purpose: string | undefined
  ): SoulGateDecision {
    const threshold = minimumTrustScore ?? this.minimumTrustScore;
    const allowed = trustScore.score >= threshold;
    return {
      did,
      allowed,
      score: trustScore.score,
      tier: trustScore.tier,
      minimumTrustScore: threshold,
      purpose,
      reason: allowed
        ? `Trust score ${trustScore.score} meets threshold ${threshold}.`
        : `Trust score ${trustScore.score} is below threshold ${threshold}.`,
    };
  }
}

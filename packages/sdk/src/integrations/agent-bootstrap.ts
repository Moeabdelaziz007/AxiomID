import { randomUUID } from "crypto";
import type { AxiomSDK } from "../client";
import type { DIDDocument, Passport, TrustScore } from "../types";

export interface AxiomAgentBootstrapConfig {
  sdk: AxiomSDK;
  agentDid?: string;
  minimumTrustScore?: number;
  now?: () => Date;
  idFactory?: () => string;
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
  private readonly idFactory: () => string;
  private draftSequence = 0;

  constructor(config: AxiomAgentBootstrapConfig) {
    this.sdk = config.sdk;
    this.agentDid = config.agentDid;
    this.minimumTrustScore =
      config.minimumTrustScore ?? DEFAULT_MINIMUM_TRUST_SCORE;
    this.now = config.now ?? (() => new Date());
    this.idFactory = config.idFactory ?? randomUUID;
  }

  async buildContext(input: AxiomAgentContextInput): Promise<AxiomAgentContext> {
    if (!input || !input.did) {
      throw new Error("Invalid input: 'did' is required to build agent context");
    }

    const [didDocument, trustScore, passport] = await Promise.all([
      this.sdk.resolveDID(input.did),
      this.sdk.getTrustScore(input.passportSlug ?? input.did),
      input.passportSlug
        ? this.sdk.verifyPassport(input.passportSlug)
        : Promise.resolve(undefined),
    ]);

    if (passport && passport.did !== input.did) {
      throw new Error(
        `Passport DID mismatch: expected ${input.did} but received ${passport.did}`
      );
    }

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
    passportSlug?: string;
    minimumTrustScore?: number;
    purpose?: string;
  }): Promise<SoulGateDecision> {
    if (!input || !input.did) {
      throw new Error("Invalid input: 'did' is required to enforce Soul Gate");
    }

    const trustScore = await this.sdk.getTrustScore(
      input.passportSlug ?? input.did
    );
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
    if (!input) {
      throw new Error("Invalid input: input is required to create attestation draft");
    }
    if (!input.subjectDid) {
      throw new Error("Invalid input: 'subjectDid' is required");
    }
    if (!input.claim) {
      throw new Error("Invalid input: 'claim' is required");
    }

    const issuer = input.issuerDid ?? this.agentDid;
    if (!issuer) {
      throw new Error("issuerDid is required when no agentDid is configured");
    }

    const issuedAt = this.now().toISOString();
    const expirationDate = this.parseExpirationDate(input.expiresAt, issuedAt);
    this.draftSequence += 1;
    const draftId = [
      "urn:axiomid:attestation",
      issuedAt,
      this.draftSequence,
      this.idFactory(),
    ].join(":");

    const draft: AgentAttestationDraft = {
      id: draftId,
      type: ["VerifiableCredential", "AxiomAgentAttestation"],
      issuer,
      issuanceDate: issuedAt,
      credentialSubject: {
        id: input.subjectDid,
        claim: input.claim,
      },
      status: "unsigned",
      proofPurpose: "agent-attestation-draft",
    };

    if (input.evidence) {
      draft.credentialSubject.evidence = input.evidence;
    }

    if (expirationDate) {
      draft.expirationDate = expirationDate;
    }

    return draft;
  }

  private parseExpirationDate(
    expiresAt: string | undefined,
    issuedAt: string
  ): string | undefined {
    if (!expiresAt) {
      return undefined;
    }

    const expirationTime = Date.parse(expiresAt);
    if (Number.isNaN(expirationTime)) {
      throw new Error("Invalid input: 'expiresAt' must be a valid date string");
    }

    if (expirationTime <= Date.parse(issuedAt)) {
      throw new Error("Invalid input: 'expiresAt' must be in the future");
    }

    return new Date(expirationTime).toISOString();
  }

  private evaluateSoulGate(
    did: string,
    trustScore: TrustScore | undefined,
    minimumTrustScore: number | undefined,
    purpose: string | undefined
  ): SoulGateDecision {
    const threshold = minimumTrustScore ?? this.minimumTrustScore;
    const score = trustScore?.score ?? 0;
    const tier = trustScore?.tier ?? "Unknown";
    const allowed = score >= threshold;
    return {
      did,
      allowed,
      score,
      tier,
      minimumTrustScore: threshold,
      purpose,
      reason: allowed
        ? `Trust score ${score} meets threshold ${threshold}.`
        : `Trust score ${score} is below threshold ${threshold}.`,
    };
  }
}

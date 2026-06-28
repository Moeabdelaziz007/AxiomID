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
  purpose?: string;
}

export interface AxiomAgentContext {
  did: string;
  didDocument: DIDDocument;
  trustScore: TrustScore;
  passport?: Passport;
  agentDid?: string;
  purpose?: string;
  createdAt: string;
}

export interface AxiomSoulGateInput extends AxiomAgentContextInput {
  minimumTrustScore?: number;
}

export interface AxiomSoulGateResult {
  allowed: boolean;
  minimumTrustScore: number;
  context: AxiomAgentContext;
  reason?: string;
}

export interface AxiomAttestationDraftInput {
  subjectDid: string;
  claim: string;
  issuerDid?: string;
  purpose?: string;
  evidence?: Record<string, unknown>;
}

export interface AxiomAttestationDraft {
  type: "AxiomIDAttestationDraft";
  issuerDid: string;
  subjectDid: string;
  claim: string;
  purpose?: string;
  evidence: Record<string, unknown>;
  issuedAt: string;
}

const DEFAULT_MINIMUM_TRUST_SCORE = 0;

export class AxiomAgentBootstrap {
  private readonly sdk: AxiomSDK;
  private readonly agentDid?: string;
  private readonly minimumTrustScore: number;
  private readonly now: () => Date;

  constructor(config: AxiomAgentBootstrapConfig) {
    this.sdk = config.sdk;
    this.agentDid = config.agentDid;
    this.minimumTrustScore =
      requireFiniteNumber(
        config.minimumTrustScore ?? DEFAULT_MINIMUM_TRUST_SCORE,
        "minimumTrustScore"
      );
    this.now = config.now ?? (() => new Date());
  }

  async createContext(input: AxiomAgentContextInput): Promise<AxiomAgentContext> {
    const did = requireNonEmptyString(input.did, "did");
    const passportPromise = input.passportSlug
      ? this.sdk.verifyPassport(input.passportSlug)
      : Promise.resolve(undefined);
    const [didDocument, passport] = await Promise.all([
      this.sdk.resolveDID(did),
      passportPromise,
    ]);
    if (passport && passport.did !== did) {
      throw new Error(
        `Passport DID ${passport.did} does not match requested DID ${did}`
      );
    }
    const trustScore = passport
      ? {
          did: passport.did,
          score: passport.trustScore,
          tier: passport.tier,
        }
      : await this.sdk.getTrustScore(did);

    return {
      did,
      didDocument,
      trustScore,
      passport,
      agentDid: this.agentDid,
      purpose: input.purpose,
      createdAt: this.now().toISOString(),
    };
  }

  async enforceSoulGate(
    input: AxiomSoulGateInput
  ): Promise<AxiomSoulGateResult> {
    const context = await this.createContext(input);
    const minimumTrustScore = requireFiniteNumber(
      input.minimumTrustScore ?? this.minimumTrustScore,
      "minimumTrustScore"
    );
    const allowed = context.trustScore.score >= minimumTrustScore;

    return {
      allowed,
      minimumTrustScore,
      context,
      reason: allowed
        ? undefined
        : `Trust score ${context.trustScore.score} is below required minimum ${minimumTrustScore}`,
    };
  }

  createAttestationDraft(
    input: AxiomAttestationDraftInput
  ): AxiomAttestationDraft {
    return {
      type: "AxiomIDAttestationDraft",
      issuerDid:
        input.issuerDid === undefined
          ? this.requireConfiguredAgentDid()
          : requireNonEmptyString(input.issuerDid, "issuerDid"),
      subjectDid: requireNonEmptyString(input.subjectDid, "subjectDid"),
      claim: requireNonEmptyString(input.claim, "claim"),
      purpose: input.purpose,
      evidence: input.evidence ?? {},
      issuedAt: this.now().toISOString(),
    };
  }

  private requireConfiguredAgentDid(): string {
    if (!this.agentDid) {
      throw new Error("agentDid is required to create an attestation draft");
    }
    return this.agentDid;
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function requireFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

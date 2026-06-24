import {
  AxiomSDKConfig,
  Passport,
  Stamps,
  DIDDocument,
  TrustScore,
  Skill,
  SearchSkillsResponse,
} from "./types";

export class AxiomIDError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AxiomIDError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_URLS: Record<string, string> = {
  mainnet: "https://axiomid.app",
  testnet: "https://testnet.axiomid.app",
};

export class AxiomSDK {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: AxiomSDKConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_URLS[config.network];
    this.apiKey = config.apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { headers });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        (body && typeof body === "object" && "error" in body
          ? (body as { error: string }).error
          : null) ?? res.statusText;
      throw new AxiomIDError(
        message,
        `HTTP_${res.status}`,
        res.status
      );
    }

    try {
      return await res.json() as T;
    } catch (err) {
      throw new AxiomIDError(
        "Failed to parse JSON response",
        "PARSE_ERROR",
        res.status
      );
    }
  }

  async verifyPassport(slug: string): Promise<Passport> {
    return this.fetch<Passport>(`/api/passport/${encodeURIComponent(slug)}`);
  }

  async getStamps(slug: string): Promise<Stamps> {
    const passport = await this.verifyPassport(slug);
    const stampsMap: Stamps = {
      kycBound: { verified: false },
      walletAge: { verified: false },
    };

    const stamps = passport.stamps ?? [];
    for (const stamp of stamps) {
      const key = stamp.type?.toLowerCase();
      if (key === "kyc_bound") {
        stampsMap.kycBound = { verified: true, details: { provider: stamp.provider } };
      } else if (key === "wallet_age") {
        stampsMap.walletAge = { verified: true, details: { provider: stamp.provider } };
      }
    }

    return stampsMap;
  }

  async resolveDID(did: string): Promise<DIDDocument> {
    return this.fetch<DIDDocument>(
      `/api/did-document?did=${encodeURIComponent(did)}`
    );
  }

  async getTrustScore(did: string): Promise<TrustScore> {
    return this.fetch<TrustScore>(
      `/api/trust-score?did=${encodeURIComponent(did)}`
    );
  }

  async searchSkills(query: string): Promise<Skill[]> {
    const res = await this.fetch<SearchSkillsResponse>(
      `/api/skills?q=${encodeURIComponent(query)}`
    );
    return res.skills ?? [];
  }
}

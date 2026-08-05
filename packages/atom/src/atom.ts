// THE ATOM — Frozen v1.0.0-immutable — NEVER CHANGES
// v1 = final. v2 = new name.
// This is the ABI of the agent economy. Everything composes on this.

export type Sandbox = "wasm" | "js" | "native";

export interface PaiSkill<TIn = unknown, TOut = unknown> {
  readonly name: string;
  readonly version: string;
  execute(input: TIn, ctx: SkillContext): Promise<TOut>;
  validateInput(input: TIn): boolean;
  readonly metadata: SkillMetadata;
}

export interface SkillMetadata {
  readonly price: number;
  readonly permissions: readonly string[];
  readonly acp: { readonly agentId: string };
  readonly sandbox: Sandbox;
}

export interface SkillContext {
  readonly agentId: string;
  readonly agentDid: string;
  readonly piWallet?: { readonly address: string; readonly network: "mainnet" | "testnet" };
  readonly piUser?: { readonly username: string; readonly kycStatus: "verified" | "pending" };
  readonly acpJobId?: string;
  readonly paymentEscrow?: unknown;
  readonly config: Readonly<Record<string, unknown>>;
  readonly secrets: Readonly<Record<string, string>>;
  readonly logger: SkillLogger;
  readonly storage: SkillStorage;
  readonly http: SkillHttpClient;
}

export interface SkillLogger {
  info(msg: string, meta?: Readonly<Record<string, unknown>>): Promise<void>;
  warn(msg: string, meta?: Readonly<Record<string, unknown>>): Promise<void>;
  error(msg: string, meta?: Readonly<Record<string, unknown>>): Promise<void>;
}

export interface SkillStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface SkillHttpClient {
  fetch(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ status: number; body: string }>;
}

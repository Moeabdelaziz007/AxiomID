/**
 * TrustChain — append-only hash chain for agent actions.
 * Every action recorded. Tamper-evident. Verifiable.
 */
import type { TrustChainEntry } from "./types.js";

export class TrustChain {
  private readonly chain: TrustChainEntry[] = [];
  private headHash = "0x0";

  get length(): number {
    return this.chain.length;
  }

  get root(): string {
    return this.headHash;
  }

  async append(agentDid: string, action: string, intention?: string): Promise<TrustChainEntry> {
    const index = this.chain.length;
    const timestamp = new Date().toISOString();
    const previousHash = this.headHash;
    const payload = `${index}:${agentDid}:${action}:${timestamp}:${intention ?? ""}:${previousHash}`;
    const hash = await this.hash(payload);

    const entry: TrustChainEntry = {
      index,
      agentDid,
      action,
      timestamp,
      intention,
      previousHash,
      hash,
    };

    this.chain.push(entry);
    this.headHash = hash;
    return entry;
  }

  getEntries(): readonly TrustChainEntry[] {
    return this.chain;
  }

  async verify(): Promise<boolean> {
    let prev = "0x0";
    for (const entry of this.chain) {
      if (entry.previousHash !== prev) return false;
      const payload = `${entry.index}:${entry.agentDid}:${entry.action}:${entry.timestamp}:${entry.intention ?? ""}:${entry.previousHash}`;
      const expected = await this.hash(payload);
      if (expected !== entry.hash) return false;
      prev = entry.hash;
    }
    return true;
  }

  private async hash(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return "0x" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

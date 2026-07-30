/**
 * TrustChain — append-only hash chain for agent actions.
 * Every action recorded. Tamper-evident. Verifiable.
 *
 * CONCURRENCY FIX: append() is now serialized via a per-instance mutex.
 * Two concurrent calls cannot get the same index/previousHash.
 * The hash computation happens AFTER acquiring the lock, and the
 * headHash update happens BEFORE releasing it — making the whole
 * append atomic from the perspective of external callers.
 */
import type { TrustChainEntry } from "./types.js";

type Releaser = () => void;

export class TrustChain {
  private readonly chain: TrustChainEntry[] = [];
  private headHash = "0x0";
  private mutex: Promise<void> = Promise.resolve();

  get length(): number {
    return this.chain.length;
  }

  get root(): string {
    return this.headHash;
  }

  /**
   * Append a new entry atomically.
   * The mutex ensures index + previousHash + headHash update
   * are never interleaved across concurrent calls.
   */
  async append(agentDid: string, action: string, intention?: string): Promise<TrustChainEntry> {
    // Acquire mutex — serialize all appends
    const release = await this.acquire();

    try {
      // Read state WHILE holding the lock
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

      // Update state WHILE holding the lock
      this.chain.push(entry);
      this.headHash = hash;
      return entry;
    } finally {
      release();
    }
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

  /**
   * Simple promise-based mutex for serializing append() calls.
   * Each call waits for the previous one to release before proceeding.
   */
  private async acquire(): Promise<Releaser> {
    let release: Releaser;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Chain the new lock after the current one
    const previous = this.mutex;
    this.mutex = next;

    await previous;
    return release;
  }

  private async hash(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return "0x" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

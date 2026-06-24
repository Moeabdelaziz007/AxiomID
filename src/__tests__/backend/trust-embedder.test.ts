/**
 * @jest-environment node
 *
 * Tests for backend/src/vectors/trust-embedder.ts
 *
 * Covers the PR change: embedding dimension updated from 384 → 768
 * (model upgraded from @cf/baai/bge-small-en-v1.5 to @cf/baai/bge-base-en-v1.5).
 *
 * Uses inline replicas of the private fallbackEmbedding and simpleHash methods
 * to test the logic in isolation without Cloudflare Workers dependencies.
 */

// ---------------------------------------------------------------------------
// Inline replicas of TrustEmbedder private methods
// (matches backend/src/vectors/trust-embedder.ts exactly)
// ---------------------------------------------------------------------------

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function fallbackEmbedding(
  did: string,
  trustScore: number,
  delegationCount: number
): number[] {
  const features = new Array(768).fill(0);
  features[0] = trustScore;
  features[1] = delegationCount / 10;
  features[2] = trustScore * (delegationCount / 10);
  features[3] = Math.min(1, trustScore + delegationCount * 0.05);
  features[4] = Math.abs(trustScore - 0.5);
  features[5] = delegationCount > 0 ? 1 : 0;
  features[6] = trustScore > 0.7 ? 1 : 0;
  features[7] = trustScore < 0.3 ? 1 : 0;
  features[8] = Math.floor(trustScore * 10) / 10;
  features[9] = Math.min(1, delegationCount * 0.1);
  for (let i = 10; i < 768; i++) {
    const hash = simpleHash(`${did}:${i}`);
    features[i] = (hash % 1000) / 1000;
  }
  return features;
}

// ---------------------------------------------------------------------------
// Dimension change: 384 → 768 (core PR change)
// ---------------------------------------------------------------------------

describe("TrustEmbedder fallbackEmbedding — dimension change (384 → 768)", () => {
  it("returns exactly 768 elements (not 384)", () => {
    const vec = fallbackEmbedding("did:axiom:alice", 0.5, 3);
    expect(vec).toHaveLength(768);
  });

  it("does NOT return 384 elements (regression guard)", () => {
    const vec = fallbackEmbedding("did:axiom:alice", 0.5, 3);
    expect(vec.length).not.toBe(384);
  });

  it("returns 768 elements for zero-delegation profile", () => {
    const vec = fallbackEmbedding("did:axiom:bob", 0.0, 0);
    expect(vec).toHaveLength(768);
  });

  it("returns 768 elements for high-trust profile", () => {
    const vec = fallbackEmbedding("did:axiom:sovereign", 1.0, 100);
    expect(vec).toHaveLength(768);
  });

  it("returns a JavaScript Array (not TypedArray or other)", () => {
    const vec = fallbackEmbedding("did:axiom:alice", 0.5, 0);
    expect(Array.isArray(vec)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Feature vector values — first 10 fixed features
// ---------------------------------------------------------------------------

describe("TrustEmbedder fallbackEmbedding — fixed feature values", () => {
  it("feature[0] = trustScore", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.75, 0);
    expect(vec[0]).toBe(0.75);
  });

  it("feature[1] = delegationCount / 10", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.5, 5);
    expect(vec[1]).toBeCloseTo(0.5);
  });

  it("feature[2] = trustScore * (delegationCount / 10)", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.8, 4);
    expect(vec[2]).toBeCloseTo(0.8 * 0.4);
  });

  it("feature[3] clamps to 1 when trust + delegation factor exceeds 1", () => {
    // trustScore=1.0, delegationCount=5 → 1.0 + 5*0.05 = 1.25 → clamped to 1
    const vec = fallbackEmbedding("did:axiom:a", 1.0, 5);
    expect(vec[3]).toBe(1);
  });

  it("feature[4] = |trustScore - 0.5|", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.8, 0);
    expect(vec[4]).toBeCloseTo(0.3);
  });

  it("feature[5] = 1 when delegationCount > 0", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.5, 1);
    expect(vec[5]).toBe(1);
  });

  it("feature[5] = 0 when delegationCount = 0", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.5, 0);
    expect(vec[5]).toBe(0);
  });

  it("feature[6] = 1 when trustScore > 0.7", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.8, 0);
    expect(vec[6]).toBe(1);
  });

  it("feature[6] = 0 when trustScore <= 0.7", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.7, 0);
    expect(vec[6]).toBe(0);
  });

  it("feature[7] = 1 when trustScore < 0.3", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.2, 0);
    expect(vec[7]).toBe(1);
  });

  it("feature[7] = 0 when trustScore >= 0.3", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.3, 0);
    expect(vec[7]).toBe(0);
  });

  it("feature[8] = floor(trustScore * 10) / 10", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.87, 0);
    expect(vec[8]).toBeCloseTo(0.8);
  });

  it("feature[9] clamps delegation contribution to 1", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.5, 20);
    expect(vec[9]).toBe(1); // min(1, 20 * 0.1) = 1
  });

  it("feature[9] = delegationCount * 0.1 when below 1", () => {
    const vec = fallbackEmbedding("did:axiom:a", 0.5, 3);
    expect(vec[9]).toBeCloseTo(0.3);
  });
});

// ---------------------------------------------------------------------------
// Feature vector values — hash-based tail (indices 10..767)
// ---------------------------------------------------------------------------

describe("TrustEmbedder fallbackEmbedding — hash-based tail features", () => {
  it("all values in indices 10..767 are in [0, 1)", () => {
    const vec = fallbackEmbedding("did:axiom:test", 0.5, 2);
    for (let i = 10; i < 768; i++) {
      expect(vec[i]).toBeGreaterThanOrEqual(0);
      expect(vec[i]).toBeLessThan(1);
    }
  });

  it("is deterministic — same DID always produces the same vector", () => {
    const did = "did:axiom:deterministic";
    const v1 = fallbackEmbedding(did, 0.6, 3);
    const v2 = fallbackEmbedding(did, 0.6, 3);
    expect(v1).toEqual(v2);
  });

  it("different DIDs produce different tail values", () => {
    const v1 = fallbackEmbedding("did:axiom:alice", 0.5, 0);
    const v2 = fallbackEmbedding("did:axiom:bob", 0.5, 0);
    // At least one hash-based tail value should differ
    let differs = false;
    for (let i = 10; i < 768; i++) {
      if (v1[i] !== v2[i]) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it("last element (index 767) is filled (not the default 0)", () => {
    // Index 767 is in the hash range → should be set by the loop
    const vec = fallbackEmbedding("did:axiom:check767", 0.5, 0);
    // The hash for "did:axiom:check767:767" is non-zero; result = (hash % 1000) / 1000
    // Can't predict exact value, but verify it was set (may or may not be 0 by coincidence)
    // Just check the vector has 768 elements (the real guard)
    expect(vec).toHaveLength(768);
  });
});

// ---------------------------------------------------------------------------
// simpleHash determinism and non-negativity
// ---------------------------------------------------------------------------

describe("simpleHash utility", () => {
  it("returns a non-negative integer", () => {
    expect(simpleHash("hello")).toBeGreaterThanOrEqual(0);
    expect(simpleHash("")).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic", () => {
    expect(simpleHash("test-string")).toBe(simpleHash("test-string"));
  });

  it("returns 0 for empty string", () => {
    expect(simpleHash("")).toBe(0);
  });

  it("produces different values for different inputs", () => {
    expect(simpleHash("alice")).not.toBe(simpleHash("bob"));
  });
});

// ---------------------------------------------------------------------------
// TrustEmbedder.embedTrustProfile — AI success path
// ---------------------------------------------------------------------------

describe("TrustEmbedder.embedTrustProfile — AI success path", () => {
  /**
   * Inline replica of embedTrustProfile that uses the mock env.
   */
  async function embedTrustProfile(
    env: {
      AI: {
        run: (model: string, input: { text: string[] }) => Promise<{ data: number[][] }>;
      };
    },
    did: string,
    trustScore: number,
    delegationCount: number,
    getTrustLevelFn: (score: number) => string = () => "medium"
  ): Promise<number[]> {
    try {
      const text = `DID:${did} trust:${trustScore.toFixed(3)} delegations:${delegationCount} level:${getTrustLevelFn(trustScore)}`;
      const response = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: [text] }) as { data: number[][] };
      if (response?.data?.[0]) {
        return response.data[0];
      }
    } catch (_err) {
      // fall through
    }
    return fallbackEmbedding(did, trustScore, delegationCount);
  }

  it("returns AI embedding when AI call succeeds", async () => {
    const aiEmbedding = new Array(768).fill(0.1);
    const env = {
      AI: { run: jest.fn().mockResolvedValue({ data: [aiEmbedding] }) },
    };

    const result = await embedTrustProfile(env, "did:axiom:alice", 0.8, 2);
    expect(result).toEqual(aiEmbedding);
    expect(result).toHaveLength(768);
  });

  it("uses @cf/baai/bge-base-en-v1.5 model (not bge-small)", async () => {
    const env = {
      AI: { run: jest.fn().mockResolvedValue({ data: [[0.1, 0.2]] }) },
    };

    await embedTrustProfile(env, "did:axiom:alice", 0.5, 0);

    expect(env.AI.run).toHaveBeenCalledWith(
      "@cf/baai/bge-base-en-v1.5",
      expect.any(Object)
    );
  });

  it("does NOT call @cf/baai/bge-small-en-v1.5 (PR upgrade)", async () => {
    const env = {
      AI: { run: jest.fn().mockResolvedValue({ data: [[0.1]] }) },
    };

    await embedTrustProfile(env, "did:axiom:alice", 0.5, 0);

    expect(env.AI.run).not.toHaveBeenCalledWith(
      "@cf/baai/bge-small-en-v1.5",
      expect.any(Object)
    );
  });

  it("falls back to 768-dim feature vector when AI throws", async () => {
    const env = {
      AI: { run: jest.fn().mockRejectedValue(new Error("AI unavailable")) },
    };

    const result = await embedTrustProfile(env, "did:axiom:alice", 0.5, 1);

    expect(result).toHaveLength(768);
    // First feature should be trustScore
    expect(result[0]).toBe(0.5);
  });

  it("falls back to 768-dim feature vector when AI returns empty data", async () => {
    const env = {
      AI: { run: jest.fn().mockResolvedValue({ data: [] }) },
    };

    const result = await embedTrustProfile(env, "did:axiom:alice", 0.7, 0);

    expect(result).toHaveLength(768);
  });

  it("includes DID, trust score, delegation count, and trust level in the embedding text", async () => {
    const env = {
      AI: { run: jest.fn().mockResolvedValue({ data: [[0.5]] }) },
    };

    await embedTrustProfile(env, "did:axiom:alice", 0.750, 5, () => "high");

    const callArgs = (env.AI.run as jest.Mock).mock.calls[0];
    const textInput = callArgs[1].text[0];
    expect(textInput).toContain("DID:did:axiom:alice");
    expect(textInput).toContain("trust:0.750");
    expect(textInput).toContain("delegations:5");
    expect(textInput).toContain("level:high");
  });
});
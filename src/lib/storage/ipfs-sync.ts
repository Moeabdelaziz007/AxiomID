import crypto from "crypto";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58(buffer: Buffer): string {
  let result = "";
  let x = BigInt("0x" + buffer.toString("hex"));
  const base = BigInt(58);

  while (x > 0) {
    const remainder = x % base;
    x = x / base;
    result = BASE58_ALPHABET[Number(remainder)] + result;
  }

  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    result = "1" + result;
  }

  return result;
}

export function generateCIDv0(data: string): string {
  const hash = crypto.createHash("sha256").update(data).digest();
  // Multihash format: 0x12 (SHA-256 code) + 0x20 (32 bytes length) + 32 bytes digest
  const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), hash]);
  return encodeBase58(multihash);
}

/**
 * Computes a deterministic CIDv0 for the payload and returns a gateway URL.
 *
 * NOTE: This is a MOCK gateway — it does NOT actually pin the payload to IPFS.
 * The returned `cid` is a real, correctly-formatted CIDv0 derived from the
 * payload, but no node hosts the content, so the URL will not resolve until a
 * real pinning service is wired up. The `mock: true` flag is returned so
 * callers/consumers can distinguish simulated publication from real anchoring.
 */
export async function publishToMockGateway(payload: unknown): Promise<{ cid: string; url: string; mock: true }> {
  const serialized = JSON.stringify(payload);
  const cid = generateCIDv0(serialized);
  return {
    cid,
    url: `https://ipfs.io/ipfs/${cid}`,
    mock: true,
  };
}

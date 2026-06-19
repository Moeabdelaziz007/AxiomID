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

export async function publishToMockGateway(payload: any): Promise<{ cid: string; url: string }> {
  const serialized = JSON.stringify(payload);
  const cid = generateCIDv0(serialized);
  return {
    cid,
    url: `https://ipfs.io/ipfs/${cid}`
  };
}

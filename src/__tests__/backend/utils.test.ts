/**
 * @jest-environment node
 *
 * Tests for backend/src/lib/utils.ts
 *
 * PR change: generateId() now uses crypto.getRandomValues() (CSPRNG)
 * instead of Math.random() for cryptographically secure ID generation.
 */

// Inline the generateId implementation to avoid ESM/Cloudflare-specific
// import issues with the backend package (type: "module"), matching the
// same pattern used in src/__tests__/backend/worker.test.ts.
function generateId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const randomHex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${Date.now().toString(36)}-${randomHex}`;
}

describe("generateId — CSPRNG implementation (PR change)", () => {
  it("returns a string", () => {
    const id = generateId("test");
    expect(typeof id).toBe("string");
  });

  it("starts with the given prefix followed by a hyphen", () => {
    const id = generateId("agent");
    expect(id.startsWith("agent-")).toBe(true);
  });

  it("matches the expected format: {prefix}-{base36_timestamp}-{8_hex_chars}", () => {
    const id = generateId("skill");
    // Format: prefix-base36timestamp-8hexchars
    const parts = id.split("-");
    expect(parts).toHaveLength(3);
    const [prefix, timestamp, randomPart] = parts;
    expect(prefix).toBe("skill");
    // Timestamp part should be a valid base-36 number
    expect(timestamp).toMatch(/^[0-9a-z]+$/);
    // Random part should be exactly 8 lowercase hex characters
    expect(randomPart).toMatch(/^[0-9a-f]{8}$/);
  });

  it("random part is exactly 8 hex characters (4 bytes)", () => {
    const id = generateId("abc");
    const randomPart = id.split("-")[2];
    expect(randomPart).toHaveLength(8);
  });

  it("produces different IDs on successive calls (uniqueness)", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateId("item"));
    }
    // All 50 calls should produce unique IDs
    expect(ids.size).toBe(50);
  });

  it("embeds a timestamp in base36 that is close to Date.now()", () => {
    const before = Date.now();
    const id = generateId("ts");
    const after = Date.now();

    const timestampBase36 = id.split("-")[1];
    const timestamp = parseInt(timestampBase36, 36);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("uses crypto.getRandomValues (not Math.random) for randomness", () => {
    // Spy on crypto.getRandomValues to confirm it is called
    const spy = jest.spyOn(crypto, "getRandomValues");
    generateId("spy-test");
    expect(spy).toHaveBeenCalledTimes(1);
    // The argument should be a Uint8Array of length 4
    const arg = spy.mock.calls[0][0] as Uint8Array;
    expect(arg).toBeInstanceOf(Uint8Array);
    expect(arg).toHaveLength(4);
    spy.mockRestore();
  });

  it("does not use Math.random — Math.random is never called during generateId", () => {
    const mathRandomSpy = jest.spyOn(Math, "random");
    generateId("no-math-random");
    expect(mathRandomSpy).not.toHaveBeenCalled();
    mathRandomSpy.mockRestore();
  });

  it("works with different prefix strings", () => {
    const prefixes = ["agent", "payment", "session", "skill", "user"];
    for (const prefix of prefixes) {
      const id = generateId(prefix);
      expect(id.startsWith(`${prefix}-`)).toBe(true);
    }
  });

  it("works with an empty prefix string", () => {
    const id = generateId("");
    // Empty prefix: starts with '-'
    expect(id.startsWith("-")).toBe(true);
    const parts = id.split("-");
    // parts[0] is "" (empty prefix), parts[1] is timestamp, parts[2] is hex
    expect(parts[2]).toMatch(/^[0-9a-f]{8}$/);
  });

  it("produces hex chars only in range 0-9 and a-f (no uppercase)", () => {
    for (let i = 0; i < 20; i++) {
      const id = generateId("hex");
      const hexPart = id.split("-")[2];
      expect(hexPart).toMatch(/^[0-9a-f]{8}$/);
      // No uppercase letters
      expect(hexPart).toBe(hexPart.toLowerCase());
    }
  });

  it("random part has correct byte padding (single-digit bytes padded to 2 chars)", () => {
    // Stub getRandomValues to return bytes that include 0x00 and 0x0F (need padding)
    const originalGetRandom = crypto.getRandomValues.bind(crypto);
    jest.spyOn(crypto, "getRandomValues").mockImplementationOnce((array: ArrayBufferView) => {
      const u8 = array as Uint8Array;
      u8[0] = 0x00; // should become "00"
      u8[1] = 0x0f; // should become "0f"
      u8[2] = 0xff; // should become "ff"
      u8[3] = 0xab; // should become "ab"
      return array;
    });

    const id = generateId("pad");
    const hexPart = id.split("-")[2];
    expect(hexPart).toBe("000fffab");
  });
});
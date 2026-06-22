/**
 * Shared utility functions for AxiomID backend Worker.
 */

/**
 * Generate a short random ID with a prefix.
 * Format: {prefix}-{timestamp_base36}-{random_8_hex}
 *
 * Uses crypto.getRandomValues() for cryptographically secure randomness
 * instead of Math.random() which is not CSPRNG.
 */
export function generateId(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const randomHex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${Date.now().toString(36)}-${randomHex}`;
}
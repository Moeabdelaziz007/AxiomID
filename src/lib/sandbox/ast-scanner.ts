/**
 * AST-based lexical safety scanner for isolated microVM scripts.
 * Embodying tinyminimicrosmallterboquansimualgotoplogy doctrine to eliminate bloat.
 */

export function scanScript(code: string): { allowed: boolean; reason?: string } {
  // Strip comments: single-line and multi-line
  let clean = code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*/g, " ");

  // Strip string literals to prevent false positives inside comments/strings
  // Matches double-quoted, single-quoted, and template string literals
  clean = clean.replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|`(\\.|[^`\\])*`/g, " ");

  // Strip regular expression literals
  clean = clean.replace(/\/(\\.|[^\/\\\n])+\/[gimy]*/g, " ");

  // Forbidden token dictionary
  const forbiddenTokens = new Set([
    "require",
    "import",
    "fs",
    "child_process",
    "net",
    "http",
    "https",
    "dns",
    "tls",
    "dgram",
    "eval",
    "Function",
    "process",
    "global",
    "globalThis",
    "window",
    "document",
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
  ]);

  // Extract all JS identifiers
  const words = clean.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];

  for (const word of words) {
    if (forbiddenTokens.has(word)) {
      return { allowed: false, reason: `Blocked forbidden identifier: "${word}"` };
    }
  }

  return { allowed: true };
}

/**
 * Validates payload size to protect microVM memory boundaries.
 * Max size: 8KB (8192 bytes).
 */
export function validatePayloadSize(payload: string, limitBytes = 8192): boolean {
  const bytes = Buffer.byteLength(payload, "utf8");
  return bytes <= limitBytes;
}

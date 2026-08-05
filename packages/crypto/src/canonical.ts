function serializeNumber(n: number): string {
  if (n === 0 && 1 / n === -Infinity) return "0";
  if (!Number.isFinite(n)) {
    throw new Error("JCS does not support non-finite numbers: " + n);
  }
  return String(n);
}

function serializeString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code < 0x20) {
      out += "\\u" + code.toString(16).padStart(4, "0");
    } else if (code === 0x22) {
      out += '\\"';
    } else if (code === 0x5c) {
      out += "\\\\";
    } else {
      out += ch;
    }
  }
  return out + '"';
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return serializeNumber(value);
  if (typeof value === "string") return serializeString(value);
  if (Array.isArray(value)) {
    const items = value.map(canonicalJson);
    return "[" + items.join(",") + "]";
  }
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((k) => serializeString(k) + ":" + canonicalJson((value as Record<string, unknown>)[k]));
    return "{" + pairs.join(",") + "}";
  }
  throw new Error("JCS does not support type: " + typeof value);
}

const MAX_JSON_LENGTH = 10_000;

export function safeJsonStringify(data: unknown): string | null {
  if (data === null || data === undefined) return null;
  try {
    const str = JSON.stringify(data);
    if (str.length > MAX_JSON_LENGTH) {
      return null;
    }
    return str;
  } catch {
    return null;
  }
}

export function safeJsonParse(str: string | null | undefined): unknown {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function sanitizeForDisplay(value: string, maxLength: number): string {
  return value
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

export function canonicalize(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const record = obj as Record<string, unknown>;
  return Object.keys(record).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = canonicalize(record[key]);
    return acc;
  }, {});
}

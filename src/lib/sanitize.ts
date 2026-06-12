const MAX_JSON_LENGTH = 10_000;

export function safeJsonStringify(data: unknown): string | null {
  if (data === null || data === undefined) return null;
  const str = JSON.stringify(data);
  if (str.length > MAX_JSON_LENGTH) {
    return null;
  }
  return str;
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

import { randomUUID } from 'crypto';

let cachedToken: string | undefined;

export function getSandboxDevToken(): string | undefined {
  if (process.env.SANDBOX_DEV_TOKEN) return process.env.SANDBOX_DEV_TOKEN;
  if (process.env.NODE_ENV !== 'production') {
    if (!cachedToken) {
      cachedToken = randomUUID();
      console.log("[SANDBOX] No SANDBOX_DEV_TOKEN env var set. Generated temporary local token: " + cachedToken);
    }
    return cachedToken;
  }
  return undefined;
}

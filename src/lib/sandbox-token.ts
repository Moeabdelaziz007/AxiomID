import { randomUUID } from 'crypto';

export function getSandboxDevToken(): string | undefined {
  if (process.env.SANDBOX_DEV_TOKEN) return process.env.SANDBOX_DEV_TOKEN;
  if (process.env.NODE_ENV !== 'production') return randomUUID();
  return undefined;
}

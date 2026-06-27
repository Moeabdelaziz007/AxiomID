/**
 * @jest-environment node
 *
 * Tests for src/lib/sandbox-token.ts
 *
 * SECURITY: The sandbox dev token is now server-only. No hardcoded default,
 * no NEXT_PUBLIC_ env var support. SANDBOX_DEV_TOKEN must be explicitly set
 * for dev mode authentication bypass to work. Client code fetches the token
 * from /api/sandbox/dev-token endpoint in development environments.
 */

import { getSandboxDevToken } from "@/lib/sandbox-token";

describe("getSandboxDevToken", () => {
  let savedNodeEnv: string | undefined;
  let savedSandboxDevToken: string | undefined;

  beforeEach(() => {
    savedNodeEnv = process.env.NODE_ENV;
    savedSandboxDevToken = process.env.SANDBOX_DEV_TOKEN;
    // Reset env var before each test
    delete process.env.SANDBOX_DEV_TOKEN;
  });

  afterEach(() => {
    // Restore original env state
    if (savedSandboxDevToken === undefined) {
      delete process.env.SANDBOX_DEV_TOKEN;
    } else {
      process.env.SANDBOX_DEV_TOKEN = savedSandboxDevToken;
    }
    // NODE_ENV is read-only via process.env assignment in some runtimes,
    // but jest sets it to 'test' — we just ensure we don't leave it polluted
  });

  it("returns undefined in production environment", () => {
    // Simulate production by manipulating the NODE_ENV check.
    // jest defines NODE_ENV as 'test', so we spy via Object.defineProperty.
    const originalDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });

    try {
      const token = getSandboxDevToken();
      expect(token).toBeUndefined();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(process.env, "NODE_ENV", originalDescriptor);
      } else {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: savedNodeEnv,
          writable: true,
          configurable: true,
        });
      }
    }
  });

  it("returns undefined when SANDBOX_DEV_TOKEN is not set (no default fallback)", () => {
    // SECURITY: No hardcoded default. Token must be explicitly configured.
    const token = getSandboxDevToken();
    expect(token).toBeUndefined();
  });

  it("returns SANDBOX_DEV_TOKEN when explicitly set", () => {
    process.env.SANDBOX_DEV_TOKEN = "my-custom-server-token";
    const token = getSandboxDevToken();
    expect(token).toBe("my-custom-server-token");
  });

  it("does not read NEXT_PUBLIC_SANDBOX_DEV_TOKEN (removed for security)", () => {
    // SECURITY: Public env vars are never used for sandbox bypass token
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = "public-token";
    const token = getSandboxDevToken();
    expect(token).toBeUndefined(); // Not "public-token"
    delete process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
  });

  it("returns undefined even when SANDBOX_DEV_TOKEN is set if NODE_ENV is production", () => {
    process.env.SANDBOX_DEV_TOKEN = "should-be-ignored";
    const originalDescriptor = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });

    try {
      const token = getSandboxDevToken();
      expect(token).toBeUndefined();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(process.env, "NODE_ENV", originalDescriptor);
      } else {
        Object.defineProperty(process.env, "NODE_ENV", {
          value: savedNodeEnv,
          writable: true,
          configurable: true,
        });
      }
    }
  });
});
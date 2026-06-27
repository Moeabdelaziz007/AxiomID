/**
 * @jest-environment node
 *
 * Tests for src/lib/sandbox-token.ts
 *
 * PR change: sandbox-token.ts is a new module that centralises the sandbox
 * dev token resolution. Previously, both route.ts and auth-middleware.ts
 * hardcoded "sandbox-dev-token-abc-123". This module replaces those
 * hardcoded strings with a configurable resolver so the token can be
 * overridden via env vars in shared/CI dev environments.
 */

import { getSandboxDevToken, getClientSandboxDevToken } from "@/lib/sandbox-token";

const DEFAULT_TOKEN = "sandbox-dev-token-abc-123";

describe("getSandboxDevToken", () => {
  let savedNodeEnv: string | undefined;
  let savedSandboxDevToken: string | undefined;
  let savedPublicSandboxDevToken: string | undefined;

  beforeEach(() => {
    savedNodeEnv = process.env.NODE_ENV;
    savedSandboxDevToken = process.env.SANDBOX_DEV_TOKEN;
    savedPublicSandboxDevToken = process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
    // Reset both env vars before each test
    delete process.env.SANDBOX_DEV_TOKEN;
    delete process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
  });

  afterEach(() => {
    // Restore original env state
    if (savedSandboxDevToken === undefined) {
      delete process.env.SANDBOX_DEV_TOKEN;
    } else {
      process.env.SANDBOX_DEV_TOKEN = savedSandboxDevToken;
    }
    if (savedPublicSandboxDevToken === undefined) {
      delete process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = savedPublicSandboxDevToken;
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

  it("returns default token when neither env var is set and not production", () => {
    // NODE_ENV is 'test' in jest — not production, so bypass is allowed
    const token = getSandboxDevToken();
    expect(token).toBe(DEFAULT_TOKEN);
  });

  it("returns SANDBOX_DEV_TOKEN when explicitly set", () => {
    process.env.SANDBOX_DEV_TOKEN = "my-custom-server-token";
    const token = getSandboxDevToken();
    expect(token).toBe("my-custom-server-token");
  });

  it("SANDBOX_DEV_TOKEN takes priority over NEXT_PUBLIC_SANDBOX_DEV_TOKEN", () => {
    process.env.SANDBOX_DEV_TOKEN = "server-wins";
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = "public-token";
    const token = getSandboxDevToken();
    expect(token).toBe("server-wins");
  });

  it("falls back to NEXT_PUBLIC_SANDBOX_DEV_TOKEN when SANDBOX_DEV_TOKEN is absent", () => {
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = "public-only-token";
    const token = getSandboxDevToken();
    expect(token).toBe("public-only-token");
  });

  it("returns a string (not undefined) in non-production with no env vars", () => {
    const token = getSandboxDevToken();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);
  });

  it("does not return an empty string as the token in non-production", () => {
    const token = getSandboxDevToken();
    expect(token).not.toBe("");
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

describe("getClientSandboxDevToken", () => {
  let savedPublicSandboxDevToken: string | undefined;

  beforeEach(() => {
    savedPublicSandboxDevToken = process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
    delete process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
  });

  afterEach(() => {
    if (savedPublicSandboxDevToken === undefined) {
      delete process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = savedPublicSandboxDevToken;
    }
  });

  it("returns the default token when NEXT_PUBLIC_SANDBOX_DEV_TOKEN is not set", () => {
    const token = getClientSandboxDevToken();
    expect(token).toBe(DEFAULT_TOKEN);
  });

  it("returns NEXT_PUBLIC_SANDBOX_DEV_TOKEN when it is set", () => {
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = "my-public-token";
    const token = getClientSandboxDevToken();
    expect(token).toBe("my-public-token");
  });

  it("always returns a string (never undefined)", () => {
    const token = getClientSandboxDevToken();
    expect(typeof token).toBe("string");
  });

  it("returns a non-empty string", () => {
    const token = getClientSandboxDevToken();
    expect(token.length).toBeGreaterThan(0);
  });

  it("does not read SANDBOX_DEV_TOKEN (server-only var)", () => {
    // Client function must not expose server-only env vars
    process.env.SANDBOX_DEV_TOKEN = "server-secret";
    const token = getClientSandboxDevToken();
    // Should return default, not the server-only var
    expect(token).toBe(DEFAULT_TOKEN);
    delete process.env.SANDBOX_DEV_TOKEN;
  });

  it("NEXT_PUBLIC_SANDBOX_DEV_TOKEN overrides the default even when SANDBOX_DEV_TOKEN is also set", () => {
    process.env.SANDBOX_DEV_TOKEN = "server-only";
    process.env.NEXT_PUBLIC_SANDBOX_DEV_TOKEN = "public-token";
    const token = getClientSandboxDevToken();
    // Client function only sees NEXT_PUBLIC_ prefix vars
    expect(token).toBe("public-token");
    delete process.env.SANDBOX_DEV_TOKEN;
  });
});
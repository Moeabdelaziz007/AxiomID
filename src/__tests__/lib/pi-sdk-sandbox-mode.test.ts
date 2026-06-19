/**
 * Tests for determineSandboxMode() in src/lib/pi-sdk.ts
 *
 * PR change: new function that determines whether the Pi SDK should be
 * initialized in sandbox mode based on environment variables, hostname,
 * and URL query parameters.
 *
 * Runs in the default jsdom environment so that window.location is available.
 */

// Unmock pi-sdk so we test the real implementation
jest.unmock("@/lib/pi-sdk");

import { determineSandboxMode } from "@/lib/pi-sdk";

/** Helper: set window.location to a specific hostname and optional search string */
function setLocation(hostname: string, search = "") {
  delete (window as unknown as { location?: unknown }).location;
  (window as unknown as { location: Partial<Location> }).location = {
    hostname,
    search,
    href: `https://${hostname}/${search}`,
    host: hostname,
    pathname: "/",
    protocol: "https:",
    origin: `https://${hostname}`,
  };
}

describe("determineSandboxMode — NEXT_PUBLIC_PI_SANDBOX env variable (PR change)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;

  afterEach(() => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalEnv;
  });

  it("returns true when NEXT_PUBLIC_PI_SANDBOX is 'true'", () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "true";
    setLocation("production.axiomid.com");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_PI_SANDBOX is 'false'", () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";
    setLocation("localhost");
    // Env var takes precedence over hostname logic
    expect(determineSandboxMode()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_PI_SANDBOX is an empty string", () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "";
    setLocation("localhost");
    // "" !== "true", so returns false
    expect(determineSandboxMode()).toBe(false);
  });

  it("falls through to hostname checks when env var is undefined", () => {
    delete process.env.NEXT_PUBLIC_PI_SANDBOX;
    setLocation("localhost");
    expect(determineSandboxMode()).toBe(true);
  });
});

describe("determineSandboxMode — localhost / LAN hostname detection (PR change)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;

  beforeEach(() => {
    // Remove env var so hostname-based logic is exercised
    delete process.env.NEXT_PUBLIC_PI_SANDBOX;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalEnv;
  });

  it("returns true for hostname 'localhost'", () => {
    setLocation("localhost");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for hostname '127.0.0.1'", () => {
    setLocation("127.0.0.1");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for a subdomain ending in .localhost (e.g. app.localhost)", () => {
    setLocation("app.localhost");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for a deeply nested .localhost subdomain", () => {
    setLocation("my.dev.app.localhost");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for a 192.168.x.x LAN address", () => {
    setLocation("192.168.1.10");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for a 192.168.0.1 gateway address", () => {
    setLocation("192.168.0.1");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for a 10.0.x.x LAN address", () => {
    setLocation("10.0.1.50");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns false for a production hostname", () => {
    setLocation("axiomid.com");
    expect(determineSandboxMode()).toBe(false);
  });

  it("returns false for a production subdomain", () => {
    setLocation("app.axiomid.com");
    expect(determineSandboxMode()).toBe(false);
  });
});

describe("determineSandboxMode — Vercel / staging deployment detection (PR change)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_PI_SANDBOX;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalEnv;
  });

  it("returns true for a vercel.app preview URL", () => {
    setLocation("axiomid-git-dev-team.vercel.app");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for hostname containing 'staging'", () => {
    setLocation("staging.axiomid.com");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns true for hostname that is exactly 'staging'", () => {
    setLocation("staging");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns false for hostname that does NOT contain vercel.app or staging", () => {
    setLocation("axiomid.io");
    expect(determineSandboxMode()).toBe(false);
  });
});

describe("determineSandboxMode — ?sandbox=true URL query parameter (PR change)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_PI_SANDBOX;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalEnv;
  });

  it("returns true when ?sandbox=true is present in the search string", () => {
    setLocation("axiomid.com", "?sandbox=true");
    expect(determineSandboxMode()).toBe(true);
  });

  it("returns false when ?sandbox=false is present in the search string", () => {
    setLocation("axiomid.com", "?sandbox=false");
    expect(determineSandboxMode()).toBe(false);
  });

  it("returns false when the sandbox query param is absent", () => {
    setLocation("axiomid.com", "?theme=dark");
    expect(determineSandboxMode()).toBe(false);
  });

  it("returns false when the sandbox param value is truthy but not 'true'", () => {
    setLocation("axiomid.com", "?sandbox=1");
    expect(determineSandboxMode()).toBe(false);
  });
});

describe("determineSandboxMode — boundary / regression cases (PR change)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_PI_SANDBOX;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_PI_SANDBOX;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = originalEnv;
  });

  it("env var 'true' takes precedence over a production hostname", () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "true";
    setLocation("axiomid.com");
    expect(determineSandboxMode()).toBe(true);
  });

  it("env var 'false' takes precedence over a localhost hostname", () => {
    process.env.NEXT_PUBLIC_PI_SANDBOX = "false";
    setLocation("localhost");
    expect(determineSandboxMode()).toBe(false);
  });

  it("returns false when window.location is available but no match criteria are met", () => {
    setLocation("production.myapp.com");
    expect(determineSandboxMode()).toBe(false);
  });

  it("returns a boolean (never undefined or null)", () => {
    setLocation("axiomid.com");
    const result = determineSandboxMode();
    expect(typeof result).toBe("boolean");
  });
});

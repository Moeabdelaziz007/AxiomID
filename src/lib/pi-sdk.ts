import { PiSdkBase } from "@pinetwork/pi-sdk-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PiAuthResult {
  user: any;
  token: string;
  stellarAddress?: string;
}

let lastError: string | null = null;

export function getLastPiError(): string | null {
  return lastError;
}

export async function connectPi(pushLog?: any): Promise<PiAuthResult> {
  try {
    // Pi Browser: use injected window.Pi SDK
    if (typeof window !== "undefined" && typeof window.Pi?.authenticate === "function") {
      pushLog?.("Using Pi Browser SDK...");
      const timeoutId = setTimeout(() => {}, 20000);
      try {
        const result = await Promise.race([
          window.Pi.authenticate({ scopes: ["username", "payments"] }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Pi authentication timed out")), 15000),
          ),
        ]) as { user: { uid: string; username: string; name: string; stellarAddress?: string }; accessToken: string };

        if (!result?.user) {
          throw new Error("Authentication failed - no user data received");
        }
        if (!result.accessToken) {
          throw new Error("Authentication failed - no token received");
        }
        lastError = null;
        pushLog?.(`Authenticated: ${result.user.name || result.user.uid}`);
        return {
          user: {
            uid: result.user.uid ?? result.user.name,
            username: result.user.username ?? result.user.name,
            name: result.user.name,
            stellarAddress: result.user.stellarAddress,
          },
          token: result.accessToken,
          stellarAddress: result.user.stellarAddress,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Server-side / Node.js: use PiSdkBase
    pushLog?.("Using PiSdkBase (server)...");
    const pi = new PiSdkBase();
    const timeoutId = setTimeout(() => {}, 20000);
    try {
      await Promise.race([
        pi.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Pi authentication timed out")), 15000),
        ),
      ]);
      const user = PiSdkBase.user ?? PiSdkBase.get_user();
      if (!user) {
        throw new Error("Authentication failed - no user data received");
      }
      const token = PiSdkBase.accessToken;
      if (!token) {
        throw new Error("Authentication failed - no token received");
      }
      lastError = null;
      pushLog?.(`Authenticated: ${user.name || user.uid}`);
      return {
        user: {
          uid: user.uid ?? user.name,
          username: user.username ?? user.name,
          name: user.name,
          stellarAddress: user.stellarAddress,
        },
        token,
        stellarAddress: user.stellarAddress,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    lastError = message;
    pushLog?.(`Auth error: ${message}`);
    throw new Error(`Pi authentication failed: ${message}`);
  }
}

export function isPiSdkLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.Pi && typeof window.Pi.authenticate === "function");
}

function assertPiSdkLoaded(): void {
  if (!isPiSdkLoaded()) {
    throw new Error("Pi SDK not loaded");
  }
}

export async function runWalletTest(pushLog?: any): Promise<void> {
  assertPiSdkLoaded();
  try {
    if (typeof window !== "undefined" && typeof window.Pi?.authenticate === "function") {
      const timeoutId = setTimeout(() => {}, 20000);
      try {
        const result = await window.Pi.authenticate({ scopes: ["username"] });
        pushLog?.(`Wallet test passed: ${result?.user?.username || result?.user?.uid || "unknown"}`);
        return;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    const pi = new PiSdkBase();
    const timeoutId = setTimeout(() => {}, 20000);
    try {
      await pi.connect();
      const user = PiSdkBase.user ?? PiSdkBase.get_user();
      pushLog?.(`Wallet test passed: ${user?.name || "unknown"}`);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet test failed";
    pushLog?.(`Wallet test failed: ${message}`);
    throw error;
  }
}

export async function verifyStellarAddress(stellarAddress: string): Promise<boolean> {
  // Stellar public keys: 56 base32 characters starting with G or M
  if (!stellarAddress || stellarAddress.length !== 56) {
    return false;
  }
  if (!/^[GM][A-Z2-7]{55}$/i.test(stellarAddress)) {
    return false;
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 100);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function transferPi(amount: number, recipient: string, memo?: string): Promise<string> {
  assertPiSdkLoaded();
  return new Promise((resolve) => {
    setTimeout(() => resolve("tx-mock-" + Date.now()), 100);
  });
}

export async function claimPiKya(data: {
  username: string;
  stellarAddress?: string;
}): Promise<{ success: true; userId: string }> {
  try {
    const response = await fetch("/api/pi/kya/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Kya claim failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kya claim failed";
    throw new Error(`Pi Kya claim failed: ${message}`);
  }
}

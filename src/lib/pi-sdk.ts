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
    const pi = new PiSdkBase();
    const connectResult = await Promise.race([
      pi.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Pi authentication timed out")), 15000),
      ),
    ]);
    const user = connectResult?.user ?? PiSdkBase.user ?? PiSdkBase.get_user?.();
    if (!user) {
      throw new Error("Authentication failed - no user data received");
    }
    const token = connectResult?.token ?? PiSdkBase.accessToken;
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
    const pi = new PiSdkBase();
    await pi.connect();
    const user = PiSdkBase.user ?? PiSdkBase.get_user?.();
    pushLog?.(`Wallet test passed: ${user?.name || user?.uid || "unknown"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet test failed";
    pushLog?.(`Wallet test failed: ${message}`);
    throw error;
  }
}

export async function verifyStellarAddress(stellarAddress: string): Promise<boolean> {
  if (!stellarAddress.startsWith("G")) {
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
  name?: string;
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

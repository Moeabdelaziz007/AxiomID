import { PiSdkBase } from "@pinetwork/pi-sdk-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export enum PiSdkErrorCode {
  NOT_IN_PI_BROWSER = "NOT_IN_PI_BROWSER",
  SDK_NOT_AVAILABLE = "SDK_NOT_AVAILABLE",
  SDK_SCRIPT_LOAD_FAILED = "SDK_SCRIPT_LOAD_FAILED",
  SDK_SCRIPT_TIMEOUT = "SDK_SCRIPT_TIMEOUT",
  SDK_NOT_LOADED = "SDK_NOT_LOADED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  AUTHENTICATION_TIMEOUT = "AUTHENTICATION_TIMEOUT",
  GENERIC_ERROR = "GENERIC_ERROR",
}

export class PiSdkError extends Error {
  public readonly code: PiSdkErrorCode;
  public readonly originalError?: unknown;

  constructor(code: PiSdkErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = "PiSdkError";
    this.code = code;
    this.originalError = originalError;
    Object.setPrototypeOf(this, PiSdkError.prototype);
  }
}

export interface PiAuthResult {
  user: any;
  token: string;
  stellarAddress?: string;
}

let lastError: string | null = null;

export function getLastPiError(): string | null {
  return lastError;
}

let isInitialized = false;

export function loadPiSdk(): Promise<unknown> {
  if (typeof window === "undefined" || typeof document === "undefined" || process.env.NODE_ENV === "test") {
    return Promise.resolve(null);
  }
  const win = window as unknown as { Pi?: unknown };
  if (win.Pi) return Promise.resolve(win.Pi);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="minepi.com/pi-sdk.js"]');
    if (existing) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (win.Pi) {
          clearInterval(interval);
          resolve(win.Pi);
        } else if (attempts > 50) {
          clearInterval(interval);
          reject(new PiSdkError(
            PiSdkErrorCode.SDK_SCRIPT_TIMEOUT,
            "Timeout waiting for existing Pi SDK script to load"
          ));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.minepi.com/pi-sdk.js";
    script.async = true;
    script.onload = () => {
      if (win.Pi) {
        resolve(win.Pi);
      } else {
        reject(new PiSdkError(
          PiSdkErrorCode.SDK_NOT_AVAILABLE,
          "Pi SDK loaded but window.Pi is undefined"
        ));
      }
    };
    script.onerror = () => reject(new PiSdkError(
      PiSdkErrorCode.SDK_SCRIPT_LOAD_FAILED,
      "Failed to load Pi SDK script"
    ));
    document.head.appendChild(script);
  });
}

export async function ensurePiInitialized(pushLog?: (msg: string) => void): Promise<unknown> {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { Pi?: { init: (args: { version: string; sandbox: boolean }) => void } };
  
  if (process.env.NODE_ENV === "test" && win.Pi) {
    return win.Pi;
  }
  
  pushLog?.("Loading Pi SDK script...");
  const Pi = await loadPiSdk();
  if (!Pi) {
    if (win.Pi) return win.Pi;
    throw new PiSdkError(
      PiSdkErrorCode.SDK_NOT_AVAILABLE,
      "Pi SDK is not available in this environment."
    );
  }

  const piInstance = Pi as { init: (args: { version: string; sandbox: boolean }) => void };

  if (!isInitialized) {
    try {
      pushLog?.("Initializing Pi SDK v2.0...");
      piInstance.init({
        version: "2.0",
        sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
      });
      isInitialized = true;
      pushLog?.("Pi SDK initialized successfully.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already initialized")) {
        isInitialized = true;
        pushLog?.("Pi SDK was already initialized.");
      } else {
        pushLog?.(`Pi SDK init warning: ${errMsg}`);
      }
    }
  }
  return Pi;
}

export function checkPiBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as { Pi?: unknown };
  if (win.Pi) return true;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Pi Browser|minepi|PiApp/i.test(ua)) return true;
  try {
    if (window.self !== window.top) {
      const referrer = document.referrer || "";
      if (referrer) {
        const referrerHost = new URL(referrer).hostname.toLowerCase();
        if (referrerHost === "minepi.com" || referrerHost.endsWith(".minepi.com")) return true;
      }
    }
  } catch {}
  try {
    if (typeof window.location !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      if (host === "minepi.com" || host.endsWith(".minepi.com")) return true;
    }
  } catch {}
  return false;
}

export async function connectPi(pushLog?: (msg: string) => void): Promise<PiAuthResult> {
  try {
    if (typeof window !== "undefined") {
      pushLog?.("Browser environment detected — loading Pi SDK...");
      const Pi = await ensurePiInitialized(pushLog);

      const piInstance = Pi as { authenticate: (args: { scopes: string[] }) => Promise<unknown> };
      if (piInstance && typeof piInstance.authenticate === "function") {
        pushLog?.("Requesting Pi authentication token...");
        const result = await Promise.race([
          piInstance.authenticate({ scopes: ["username", "payments"] }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new PiSdkError(
              PiSdkErrorCode.AUTHENTICATION_TIMEOUT,
              "Pi authentication timed out"
            )), 15000),
          ),
        ]) as { user: { uid: string; username: string; name: string; stellarAddress?: string }; accessToken: string };

        if (!result?.user) {
          throw new PiSdkError(
            PiSdkErrorCode.AUTHENTICATION_FAILED,
            "Authentication failed - no user data received"
          );
        }
        if (!result.accessToken) {
          throw new PiSdkError(
            PiSdkErrorCode.AUTHENTICATION_FAILED,
            "Authentication failed - no token received"
          );
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
      }
      throw new PiSdkError(
        PiSdkErrorCode.NOT_IN_PI_BROWSER,
        "Pi Browser required. Pi SDK authenticate function not available."
      );
    }

    // Server-side / Node.js: use PiSdkBase
    pushLog?.("Using PiSdkBase (server)...");
    const pi = new PiSdkBase();
    await Promise.race([
      pi.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new PiSdkError(
          PiSdkErrorCode.AUTHENTICATION_TIMEOUT,
          "Pi authentication timed out"
        )), 15000),
      ),
    ]);
    const user = PiSdkBase.user ?? PiSdkBase.get_user();
    if (!user) {
      throw new PiSdkError(
        PiSdkErrorCode.AUTHENTICATION_FAILED,
        "Authentication failed - no user data received"
      );
    }
    const token = PiSdkBase.accessToken;
    if (!token) {
      throw new PiSdkError(
        PiSdkErrorCode.AUTHENTICATION_FAILED,
        "Authentication failed - no token received"
      );
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
    // If it's already a PiSdkError, re-throw it
    if (error instanceof PiSdkError) {
      lastError = error.message;
      pushLog?.(`Auth error: ${error.message}`);
      throw error;
    }
    // Otherwise wrap it in a generic error
    const message = error instanceof Error ? error.message : "Unknown error";
    lastError = message;
    pushLog?.(`Auth error: ${message}`);
    throw new PiSdkError(
      PiSdkErrorCode.GENERIC_ERROR,
      `Pi authentication failed: ${message}`,
      error
    );
  }
}

export function isPiSdkLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.Pi && typeof window.Pi.authenticate === "function");
}

function assertPiSdkLoaded(): void {
  if (!isPiSdkLoaded()) {
    throw new PiSdkError(
      PiSdkErrorCode.SDK_NOT_LOADED,
      "Pi SDK not loaded"
    );
  }
}

export async function runWalletTest(pushLog?: any): Promise<void> {
  assertPiSdkLoaded();
  try {
    if (typeof window !== "undefined" && typeof window.Pi?.authenticate === "function") {
      const result = await window.Pi.authenticate({ scopes: ["username"] });
      pushLog?.(`Wallet test passed: ${result?.user?.username || result?.user?.uid || "unknown"}`);
      return;
    }
    const pi = new PiSdkBase();
    await pi.connect();
    const user = PiSdkBase.user ?? PiSdkBase.get_user();
    pushLog?.(`Wallet test passed: ${user?.name || "unknown"}`);
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

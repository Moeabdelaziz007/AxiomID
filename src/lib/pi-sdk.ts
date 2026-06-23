import { logger } from "@/lib/logger";

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

export interface PiSdkAuthResult {
  user: PiUser;
  token: string;
  stellarAddress?: string;
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

export function determineSandboxMode(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_PI_SANDBOX !== undefined) {
    return process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
  }
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost") ||
    hostname.includes("192.168.") ||
    hostname.includes("10.0.")
  ) {
    return true;
  }
  if (hostname.includes("vercel.app") || hostname.includes("staging")) {
    return true;
  }
  try {
    if (window.self !== window.top) {
      const referrer = document.referrer || "";
      if (referrer) {
        const referrerHost = new URL(referrer).hostname.toLowerCase();
        if (
          referrerHost === "sandbox.minepi.com" ||
          referrerHost.endsWith(".sandbox.minepi.com")
        ) {
          return true;
        }
      }
    }
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sandbox") === "true") {
      return true;
    }
  } catch {}
  return false;
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
        sandbox: determineSandboxMode(),
      });
      isInitialized = true;
      pushLog?.("Pi SDK initialized successfully.");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already initialized")) {
        isInitialized = true;
        pushLog?.("Pi SDK was already initialized.");
      } else {
        // A genuine init failure: surface it instead of returning an
        // uninitialized SDK that callers would treat as usable.
        pushLog?.(`Pi SDK init failed: ${errMsg}`);
        throw new PiSdkError(
          PiSdkErrorCode.SDK_NOT_AVAILABLE,
          `Pi SDK initialization failed: ${errMsg}`,
          err
        );
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

/**
 * Authenticates the user with the Pi Browser wallet.
 *
 * @param pushLog - Optional callback for logging progress messages
 * @returns An object containing the authenticated user information and access token
 * @throws PiSdkError if authentication fails or the Pi Browser environment is not available
 */
export async function connectPi(pushLog?: (msg: string) => void): Promise<PiSdkAuthResult> {
  try {
    if (typeof window === "undefined") {
      throw new PiSdkError(
        PiSdkErrorCode.NOT_IN_PI_BROWSER,
        "Pi Browser required. Pi SDK authenticate function not available."
      );
    }

    pushLog?.("Browser environment detected — loading Pi SDK...");
    const Pi = await ensurePiInitialized(pushLog);

    const piInstance = Pi as { authenticate: (scopes: string[], onIncompletePaymentFound: (payment: PiPaymentDTO) => void) => Promise<unknown> };
    if (piInstance && typeof piInstance.authenticate === "function") {
      pushLog?.("Requesting Pi authentication token...");

      const onIncompletePaymentFound = async (payment: PiPaymentDTO) => {
        logger.info("[Pi Auth] Incomplete payment found:", payment);
        pushLog?.("Incomplete payment detected — completing payment...");
        try {
          const response = await fetch("/api/pi/payment/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction?.txid || "" }),
          });
          if (response.ok) {
            pushLog?.("Incomplete payment resolved successfully.");
          } else {
            logger.error("[Pi Auth] Incomplete payment completion failed:", await response.json());
          }
        } catch (err) {
          logger.error("[Pi Auth] Incomplete payment resolution error:", err);
        }
      };

      // Defensive: authenticate() can reject with "SDK was not initialized" if
      // the module-scoped init guard is stale relative to the actual SDK
      // instance (e.g. after a script reload). If that specific error occurs,
      // force a re-init and retry authentication exactly once.
      const authenticateWithTimeout = () => {
        let timer: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new PiSdkError(
            PiSdkErrorCode.AUTHENTICATION_TIMEOUT,
            "Pi authentication timed out"
          )), 45000);
        });
        // Clear the timer once the race settles so the loser's timer does not
        // keep running (and, on the timeout branch, does not reject an
        // unobserved promise on a subsequent retry).
        return Promise.race([
          piInstance.authenticate(["username", "payments"], onIncompletePaymentFound),
          timeout,
        ]).finally(() => clearTimeout(timer));
      };

      let result: { user: { uid: string; username: string; name: string; stellarAddress?: string }; accessToken: string };
      try {
        result = await authenticateWithTimeout() as typeof result;
      } catch (authErr) {
        const authMsg = authErr instanceof Error ? authErr.message : String(authErr);
        if (/not\s*initialized|init\(\)/i.test(authMsg)) {
          pushLog?.("Pi SDK reported not initialized — re-initializing and retrying...");
          isInitialized = false;
          await ensurePiInitialized(pushLog);
          result = await authenticateWithTimeout() as typeof result;
        } else {
          throw authErr;
        }
      }

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
      pushLog?.(`Authenticated: ${result.user.name || result.user.uid}`);
      if (!result.user.uid) {
        throw new PiSdkError(
          PiSdkErrorCode.AUTHENTICATION_FAILED,
          "Authentication failed - no UID received from Pi SDK"
        );
      }
      return {
        user: {
          uid: result.user.uid,
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
  } catch (error) {
    // If it's already a PiSdkError, re-throw it
    if (error instanceof PiSdkError) {
      pushLog?.(`Auth error: ${error.message}`);
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
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

export async function runWalletTest(pushLog?: (msg: string) => void): Promise<void> {
  assertPiSdkLoaded();
  try {
    if (typeof window !== "undefined" && typeof window.Pi?.authenticate === "function") {
      const result = await window.Pi.authenticate(["username"], (payment: PiPaymentDTO) => {
        logger.info("[Pi Wallet Test] Incomplete payment found:", payment);
      }) as unknown as PiSdkAuthResult;
      pushLog?.(`Wallet test passed: ${result?.user?.username || result?.user?.uid || "unknown"}`);
      return;
    }
    throw new PiSdkError(
      PiSdkErrorCode.NOT_IN_PI_BROWSER,
      "Pi Browser required for wallet test"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet test failed";
    pushLog?.(`Wallet test failed: ${message}`);
    throw error;
  }
}

export async function createPiPayment(amount: number, memo: string, metadata?: Record<string, unknown>): Promise<string> {
  assertPiSdkLoaded();
  
  return new Promise((resolve, reject) => {
    window.Pi!.createPayment({
      amount,
      memo,
      metadata: metadata || {},
    }, {
      onReadyForServerApproval: async (paymentId: string) => {
        try {
          const response = await fetch("/api/pi/payment/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          if (!response.ok) {
            const error = await response.json();
            logger.error("[Pi Payment] Server approval failed:", error);
          }
        } catch (err) {
          logger.error("[Pi Payment] Server approval error:", err);
        }
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        try {
          const response = await fetch("/api/pi/payment/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
          if (!response.ok) {
            const error = await response.json();
            logger.error("[Pi Payment] Server completion failed:", error);
          }
        } catch (err) {
          logger.error("[Pi Payment] Server completion error:", err);
        }
        resolve(txid);
      },
      onError: (error: Error) => {
        logger.error("[Pi Payment] Error:", error);
        reject(new PiSdkError(
          PiSdkErrorCode.GENERIC_ERROR,
          `Payment failed: ${error.message}`,
          error
        ));
      },
      onCancel: () => {
        logger.info("[Pi Payment] Payment cancelled by user");
        reject(new PiSdkError(
          PiSdkErrorCode.GENERIC_ERROR,
          "Payment cancelled by user"
        ));
      },
    });
  });
}

export async function showRewardedAd(pushLog?: (msg: string) => void): Promise<{ success: boolean; adId?: string }> {
  assertPiSdkLoaded();
  try {
    if (typeof window !== "undefined" && typeof window.Pi?.Ads?.showAd === "function") {
      pushLog?.("Initializing rewarded ad request...");
      
      const isReady = await window.Pi.Ads.isAdReady("rewarded");
      if (!isReady) {
        pushLog?.("Ad not cached. Requesting ad load...");
        await window.Pi.Ads.requestAd("rewarded");
      }

      pushLog?.("Displaying rewarded ad...");
      const response = await window.Pi.Ads.showAd("rewarded");
      
      if (response.result === "AD_REWARDED") {
        pushLog?.(`Ad watched successfully! adId: ${response.adId || "none"}`);
        return { success: true, adId: response.adId };
      } else if (response.result === "AD_CLOSED") {
        pushLog?.("Ad was closed before completion.");
        return { success: false };
      } else {
        throw new Error("Ad playback error occurred");
      }
    }
    throw new PiSdkError(
      PiSdkErrorCode.NOT_IN_PI_BROWSER,
      "Pi Browser and SDK required to display ads"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ad display failed";
    pushLog?.(`Ad error: ${message}`);
    throw error;
  }
}


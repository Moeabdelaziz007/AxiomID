const CDN_URL = "https://sdk.minepi.com/pi-sdk.js";

export interface PiAuthResult {
  accessToken: string;
  user: { uid: string; username: string; name: string; wallet_address?: string };
}

type LogFn = (msg: string) => void;

function getWindowPi(): any {
  if (typeof window === "undefined") return null;
  return (window as any).Pi;
}

export function isPiSdkLoaded(): boolean {
  if (typeof window === "undefined") return false;
  const Pi = getWindowPi();
  return !!(Pi?.authenticate);
}

export function isRealPiBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  if (/Pi Browser|minepi/i.test(navigator.userAgent)) return true;

  if (window.Pi?.authenticate) return true;

  try {
    if (window.self !== window.top) {
      const ref = document.referrer || "";
      if (ref.includes("minepi.com") || ref.includes("sandbox.minepi.com")) return true;
    }
  } catch {}

  return false;
}

function loadCdnScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${CDN_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pi SDK CDN script"));
    document.head.appendChild(script);
  });
}

export async function ensurePiSdk(onLog?: LogFn): Promise<any> {
  onLog?.("[PI-SDK] Checking Pi SDK availability...");

  let Pi = getWindowPi();
  if (Pi?.authenticate) {
    onLog?.("[PI-SDK] window.Pi found");
    return Pi;
  }

  if (!isRealPiBrowser()) {
    onLog?.("[PI-SDK] Not inside Pi Browser - skipping CDN load");
    return null;
  }

  onLog?.("[PI-SDK] Inside Pi Browser - loading CDN script...");
  await loadCdnScript();

  Pi = getWindowPi();
  if (Pi?.authenticate) {
    onLog?.("[PI-SDK] window.Pi ready after CDN load");
    return Pi;
  }

  onLog?.("[PI-SDK] window.Pi still not available");
  return null;
}

function waitForAccessToken(onLog?: LogFn, timeoutMs = 30000): Promise<{ accessToken: string; user: any }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Pi auth timed out waiting for access token"));
    }, timeoutMs);

    function handler(event: MessageEvent) {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.accessToken && data?.backendURL) {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          onLog?.(`[PI-SDK] Got accessToken from postMessage`);
          resolve({
            accessToken: data.accessToken,
            user: {
              uid: data.user?.uid || data.uid || "",
              username: data.user?.username || data.username || "",
              name: data.user?.name || data.user?.username || "",
              wallet_address: data.user?.wallet_address || "",
            },
          });
        }
      } catch {}
    }

    window.addEventListener("message", handler);
  });
}

export async function connectPi(onLog?: LogFn): Promise<PiAuthResult> {
  if (typeof window === "undefined") {
    throw new Error("Pi SDK only works in browser");
  }

  const realPiBrowser = isRealPiBrowser();
  onLog?.(`[PI-SDK] Real Pi Browser: ${realPiBrowser}`);

  if (!realPiBrowser) {
    throw new Error("NOT_IN_PI_BROWSER");
  }

  const Pi = await ensurePiSdk(onLog);

  if (Pi) {
    try {
      if (typeof Pi.init === "function") {
        const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
        onLog?.(`[PI-SDK] Calling Pi.init({ version: "2.0", sandbox: ${isSandbox} })...`);
        await Pi.init({ version: "2.0", sandbox: isSandbox });
        onLog?.("[PI-SDK] Pi.init() completed");
      }
    } catch (err: any) {
      onLog?.(`[PI-SDK] Pi.init() failed (non-fatal): ${err?.message}`);
    }

    let lastError: any = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        onLog?.(`[PI-SDK] Pi.authenticate() attempt ${attempt}/5...`);
        const authResult = await Pi.authenticate(
          ["payments", "username", "wallet_address"],
          (payment: any) => {
            onLog?.(`[PI-SDK] Incomplete payment: ${payment?.identifier}`);
          },
        );

        if (authResult?.accessToken && authResult?.user?.uid) {
          onLog?.(`[PI-SDK] Auth succeeded! User: ${authResult.user.username}`);
          return {
            accessToken: authResult.accessToken,
            user: {
              uid: authResult.user.uid,
              username: authResult.user.username || authResult.user.uid,
              name: authResult.user.username || authResult.user.uid,
              wallet_address: authResult.user.wallet_address || "",
            },
          };
        }
        onLog?.(`[PI-SDK] Auth returned incomplete result, retrying...`);
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        onLog?.(`[PI-SDK] Attempt ${attempt} failed: ${msg}`);

        if (msg.includes("unauthorized_app")) {
          onLog?.(`[PI-SDK] unauthorized_app - waiting for sandbox retry...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        if (attempt < 5) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  onLog?.("[PI-SDK] Trying direct postMessage approach...");
  const tokenPromise = waitForAccessToken(onLog, 25000);

  if (Pi) {
    try {
      await Pi.authenticate(["payments", "username", "wallet_address"], () => {});
    } catch {}
  } else {
    onLog?.("[PI-SDK] Sending ready message to Pi sandbox parent...");
    try {
      window.parent.postMessage({ type: "@pi:app:ready" }, "*");
    } catch {}
  }

  try {
    const result = await tokenPromise;
    if (result.accessToken && result.user.uid) {
      onLog?.(`[PI-SDK] Got token via postMessage! User: ${result.user.username}`);
      return result;
    }
  } catch (err: any) {
    onLog?.(`[PI-SDK] postMessage approach failed: ${err?.message}`);
  }

  throw new Error("Pi authentication failed after all attempts");
}

export async function runWalletTest(onLog: LogFn): Promise<void> {
  onLog?.("[WALLET-TEST] ====== Starting wallet test ======");
  onLog?.(`[WALLET-TEST] Date: ${new Date().toLocaleString()}`);
  onLog?.("[WALLET-TEST] URL: " + (typeof window !== "undefined" ? window.location.href : "SSR"));

  if (typeof window === "undefined") {
    onLog?.("[WALLET-TEST] Not in browser");
    return;
  }

  const Pi = getWindowPi();
  const realPi = isRealPiBrowser();
  onLog?.(`[WALLET-TEST] window.Pi: ${Pi ? "YES" : "NO"}`);
  onLog?.(`[WALLET-TEST] Real Pi Browser: ${realPi}`);
  onLog?.(`[WALLET-TEST] NEXT_PUBLIC_PI_SANDBOX: ${process.env.NEXT_PUBLIC_PI_SANDBOX || "undefined"}`);

  if (!realPi) {
    onLog?.("[WALLET-TEST] NOT inside Pi Browser - cannot test Pi SDK");
    onLog?.("[WALLET-TEST] Open this app inside Pi Browser to test auth");
    return;
  }

  try {
    await ensurePiSdk(onLog);
  } catch (err: any) {
    onLog?.(`[WALLET-TEST] SDK load failed: ${err?.message}`);
  }

  try {
    onLog?.("[WALLET-TEST] Attempting auth...");
    const result = await connectPi(onLog);
    onLog?.(`[WALLET-TEST] Auth SUCCESS!`);
    onLog?.(`[WALLET-TEST] UID: ${result.user.uid}`);
    onLog?.(`[WALLET-TEST] Username: ${result.user.username}`);
    onLog?.(`[WALLET-TEST] Wallet: ${result.user.wallet_address || "N/A"}`);
    onLog?.(`[WALLET-TEST] Token: ${result.accessToken.substring(0, 20)}...`);
  } catch (err: any) {
    onLog?.(`[WALLET-TEST] Auth FAILED: ${err?.message}`);
  }

  onLog?.("[WALLET-TEST] ====== Test complete ======");
}

export interface PiPayment {
  identifier: string;
  amount: number;
  memo: string;
  status: 'pending' | 'completed' | 'failed';
  fromAddress: string;
  toAddress: string;
  createdAt: string;
}

export async function createPiPayment(amount: number, memo: string, metadata?: Record<string, unknown>): Promise<PiPayment> {
  const Pi = await ensurePiSdk();

  if (!Pi?.createPayment) {
    throw new Error("Pi SDK createPayment not available");
  }

  return new Promise<PiPayment>((resolve, reject) => {
    Pi.createPayment({
      amount,
      memo,
      metadata: metadata || {},
    }, {
      onReadyForServerApproval: async (paymentId: string) => {
        try {
          const res = await fetch('/api/pi/payment/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
          });
          if (!res.ok) throw new Error('Failed to approve payment with backend');
          console.log('[Pi Payment] Payment approved on backend:', paymentId);
        } catch (err) {
          console.error('[Pi Payment] Error in onReadyForServerApproval:', err);
          reject(err);
        }
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        try {
          const res = await fetch('/api/pi/payment/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid })
          });
          if (!res.ok) throw new Error('Failed to complete payment with backend');
          const data = await res.json();
          console.log('[Pi Payment] Payment completed successfully:', data);
          
          resolve({
            identifier: paymentId,
            amount,
            memo,
            status: 'completed',
            fromAddress: '',
            toAddress: '',
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[Pi Payment] Error in onReadyForServerCompletion:', err);
          reject(err);
        }
      },
      onCancel: (paymentId: string) => {
        console.warn('[Pi Payment] Payment cancelled by user:', paymentId);
        reject(new Error('Payment cancelled by user'));
      },
      onError: (error: Error, payment?: any) => {
        console.error('[Pi Payment] Payment error:', error, payment);
        reject(error || new Error('Payment error occurred'));
      }
    });
  });
}

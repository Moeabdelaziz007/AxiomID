const CDN_URL = "https://sdk.minepi.com/pi-sdk.js";

export interface PiAuthResult {
  accessToken: string;
  user: { uid: string; username: string; name: string };
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
  onLog?.("[PI-SDK] 🔍 Checking Pi SDK availability...");

  let Pi = getWindowPi();
  if (Pi?.authenticate) {
    onLog?.("[PI-SDK] ✅ window.Pi موجود (من الساندبوكس أو Pi Browser)");
    return Pi;
  }

  onLog?.("[PI-SDK] ⏳ window.Pi غير موجود. جاري تحميل CDN script...");
  await loadCdnScript();
  onLog?.("[PI-SDK] ✅ CDN script تم تحميله");

  Pi = getWindowPi();
  if (!Pi?.authenticate) {
    onLog?.("[PI-SDK] ❌ window.Pi لا يزال غير متاح بعد تحميل CDN");
    throw new Error("Pi SDK failed to initialize after loading CDN script");
  }
  onLog?.("[PI-SDK] ✅ window.Pi جاهز");
  return Pi;
}

export async function connectPi(onLog?: LogFn): Promise<PiAuthResult> {
  if (typeof window === "undefined") {
    throw new Error("Pi SDK only works in browser");
  }

  const Pi = await ensurePiSdk(onLog);

  if (typeof Pi.init === "function") {
    const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
    onLog?.(`[PI-SDK] 🔄 Calling Pi.init({ version: "2.0", sandbox: ${isSandbox} })...`);
    await Pi.init({ version: "2.0", sandbox: isSandbox });
    onLog?.("[PI-SDK] ✅ Pi.init() completed");
  } else {
    onLog?.("[PI-SDK] ⏩ Pi.init() غير متاح — الساندبوكس يدير init بنفسه");
  }

  onLog?.("[PI-SDK] 🔄 Calling Pi.authenticate(['payments', 'username', 'wallet_address'])...");
  let authResult: any;
  try {
    authResult = await Pi.authenticate(
      ["payments", "username", "wallet_address"],
      (payment: any) => {
        onLog?.(`[PI-SDK] ⚠️ Incomplete payment found: ${payment?.identifier}`);
      },
    );
  } catch (err: any) {
    onLog?.(`[PI-SDK] ❌ Pi.authenticate() failed: ${err?.message || err}`);
    throw new Error(`Pi authentication failed: ${err?.message || err}`);
  }

  onLog?.("[PI-SDK] ✅ Pi.authenticate() succeeded!");

  if (!authResult?.accessToken || !authResult?.user?.uid) {
    onLog?.("[PI-SDK] ❌ Auth result missing accessToken or user");
    throw new Error("Pi authentication returned incomplete result");
  }

  const uid = authResult.user.uid;
  const username = authResult.user.username || uid;

  onLog?.(`[PI-SDK] 👤 User: ${username} (UID: ${uid})`);
  onLog?.(`[PI-SDK] 🔑 Access token: ${authResult.accessToken.slice(0, 10)}...${authResult.accessToken.slice(-5)}`);
  onLog?.("[PI-SDK] ✅ Wallet authentication complete!");

  return {
    accessToken: authResult.accessToken,
    user: { uid, username, name: username },
  };
}

export async function runWalletTest(onLog: LogFn): Promise<void> {
  onLog?.("[WALLET-TEST] ====== بدء اختبار المحفظة ======");
  onLog?.(`[WALLET-TEST] 📅 ${new Date().toLocaleString()}`);
  onLog?.("[WALLET-TEST] 📋 البيئة: " + (typeof window !== "undefined" ? window.location.href : "SSR"));

  onLog?.("[WALLET-TEST] 🔍 1/7 التحقق من تحميل Pi SDK...");
  if (typeof window === "undefined") {
    onLog?.("[WALLET-TEST] ❌ ليس في المتصفح");
    return;
  }

  const Pi = getWindowPi();
  onLog?.(`[WALLET-TEST]    window.Pi: ${Pi ? "موجود ✅" : "غير موجود ❌"}`);
  onLog?.(`[WALLET-TEST]    window.Pi.init: ${typeof Pi?.init === "function" ? "موجود ✅" : "غير موجود ❌"}`);
  onLog?.(`[WALLET-TEST]    window.Pi.authenticate: ${typeof Pi?.authenticate === "function" ? "موجود ✅" : "غير موجود ❌"}`);
  onLog?.(`[WALLET-TEST]    window.Pi.createPayment: ${typeof Pi?.createPayment === "function" ? "موجود ✅" : "غير موجود ❌"}`);

  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  const isSandboxDetected = Pi?.sandboxMode || isIframe;
  onLog?.("[WALLET-TEST] 2/7 البيئة:");
  onLog?.(`    NEXT_PUBLIC_PI_SANDBOX: ${process.env.NEXT_PUBLIC_PI_SANDBOX || "غير معرف"}`);
  onLog?.(`    داخل iframe: ${isIframe ? "نعم ✅" : "لا"}`);
  onLog?.(`    Sandbox detected: ${isSandboxDetected ? "نعم ✅" : "لا"}`);

  if (isIframe) {
    onLog?.("[WALLET-TEST]    origin: " + window.location.origin);
    try {
      onLog?.("[WALLET-TEST]    parent origin: " + (document.referrer || "لا يوجد"));
    } catch {}
  }

  try {
    await ensurePiSdk(onLog);
  } catch (err: any) {
    onLog?.(`[WALLET-TEST] ❌ فشل تحميل Pi SDK: ${err?.message || err}`);
    return;
  }

  const piReady = getWindowPi();
  if (!piReady?.authenticate) {
    onLog?.("[WALLET-TEST] ❌ Pi SDK غير متاح بعد المحاولة.");
    return;
  }

  onLog?.("[WALLET-TEST] 3/7 الاتصال بـ Pi.init()...");
  try {
    if (typeof piReady.init === "function") {
      await piReady.init({ version: "2.0" });
      onLog?.("[WALLET-TEST] ✅ Pi.init() نجح");
    } else {
      onLog?.("[WALLET-TEST] ⏩ Pi.init() غير متاح، ننتقل للخطوة التالية");
    }
  } catch (err: any) {
    onLog?.(`[WALLET-TEST] ❌ Pi.init() فشل: ${err?.message || err}`);
    return;
  }

  onLog?.("[WALLET-TEST] 4/7 محاولة المصادقة عبر Pi.authenticate()...");
  let authResult: any;
  try {
    authResult = await piReady.authenticate(["payments", "username", "wallet_address"], (payment: any) => {
      onLog?.(`[WALLET-TEST] ⚠️ دفعة غير مكتملة: ${payment?.identifier}`);
    });
    onLog?.("[WALLET-TEST] ✅ Pi.authenticate() نجح!");
  } catch (err: any) {
    onLog?.(`[WALLET-TEST] ❌ Pi.authenticate() فشل: ${err?.message || err}`);
    onLog?.("[WALLET-TEST]    تحقق من أنك في Pi Browser أو Pi Sandbox");
    return;
  }

  const uid = authResult?.user?.uid || "غير معروف";
  const username = authResult?.user?.username || uid;
  const token = authResult?.accessToken || "";

  onLog?.("[WALLET-TEST] 5/7 بيانات المستخدم:");
  onLog?.(`    UID: ${uid}`);
  onLog?.(`    اسم المستخدم: ${username}`);
  onLog?.(`    Stellar Wallet: ${authResult?.user?.wallet_address || "غير معروف"}`);
  onLog?.(`    Pi App Wallet: pi:${uid}`);
  onLog?.(`    Access Token: ${token.slice(0, 30)}...`);

  onLog?.("[WALLET-TEST] ====== ✅ انتهى الاختبار بنجاح ======");
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

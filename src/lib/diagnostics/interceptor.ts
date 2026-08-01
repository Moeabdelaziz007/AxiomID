let enabled = false;
let origFetch: typeof globalThis.fetch | null = null;
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
let origPiAuth: Function | null = null;
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
let origPiPay: Function | null = null;
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
let origPiInit: Function | null = null;
let piInterceptTimer: ReturnType<typeof setInterval> | null = null;

const handleError = (event: ErrorEvent) => {
  sendDiagnostic("error", "client", event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
};

const handleRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  sendDiagnostic("error", "client", `Unhandled Promise: ${reason}`, {
    type: typeof reason,
    message: reason?.message || String(reason),
    stack: reason?.stack,
  });
};

export function enableDiagnostics() {
  if (enabled) return;
  enabled = true;

  if (typeof window === "undefined") return;

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  interceptPiSdk();
  interceptFetch();

  console.log("[DIAG] Diagnostics enabled — errors will be captured");
}

export function disableDiagnostics() {
  if (!enabled) return;
  enabled = false;

  if (typeof window === "undefined") return;

  window.removeEventListener("error", handleError);
  window.removeEventListener("unhandledrejection", handleRejection);

  if (origFetch) {
    window.fetch = origFetch;
    origFetch = null;
  }

  if (window.Pi) {
    if (origPiAuth) window.Pi.authenticate = origPiAuth as PiInstance["authenticate"];
    if (origPiPay) window.Pi.createPayment = origPiPay as PiInstance["createPayment"];
    if (origPiInit) window.Pi.init = origPiInit as PiInstance["init"];
  }
  origPiAuth = null;
  origPiPay = null;
  origPiInit = null;

  if (piInterceptTimer) {
    clearInterval(piInterceptTimer);
    piInterceptTimer = null;
  }

  console.log("[DIAG] Diagnostics disabled — SDK wrappers restored");
}

function sendDiagnostic(
  level: "error" | "warn" | "info",
  source: string,
  message: string,
  details?: Record<string, unknown>,
) {
  if (!enabled) return;
  try {
    navigator.sendBeacon(
      "/api/diagnostics/capture",
      new Blob(
        [JSON.stringify({ level, source, message, details, url: window.location.href })],
        { type: "application/json" },
      ),
    );
  } catch {
    // Silent fail — don't break the app
  }
}

function interceptPiSdk() {
  piInterceptTimer = setInterval(() => {
    if (typeof window === "undefined" || !window.Pi) return;
    if (piInterceptTimer) {
      clearInterval(piInterceptTimer);
      piInterceptTimer = null;
    }

    origPiAuth = window.Pi.authenticate.bind(window.Pi);
    origPiPay = window.Pi.createPayment.bind(window.Pi);
    origPiInit = window.Pi.init.bind(window.Pi);

    window.Pi.authenticate = ((...args: unknown[]) => {
      sendDiagnostic("info", "pi-sdk", "Pi.authenticate called", {
        scopes: args[0],
      });
      return (origPiAuth!(...args) as Promise<PiAuthResult>).catch((err: unknown) => {
        sendDiagnostic("error", "pi-sdk", `Pi.authenticate failed: ${err}`, {
          error: String(err),
          name: (err as Error)?.name,
          message: (err as Error)?.message,
        });
        throw err;
      });
    }) as PiInstance["authenticate"];

    window.Pi.createPayment = ((...args: unknown[]) => {
      const paymentData = args[0] as { amount?: number; memo?: string };
      sendDiagnostic("info", "pi-sdk", "Pi.createPayment called", {
        amount: paymentData?.amount,
        memo: paymentData?.memo,
      });
      return origPiPay!(...args);
    }) as PiInstance["createPayment"];

    window.Pi.init = ((...args: unknown[]) => {
      sendDiagnostic("info", "pi-sdk", "Pi.init called", {
        config: args[0],
      });
      try {
        const result = origPiInit!(...args);
        sendDiagnostic("info", "pi-sdk", "Pi.init succeeded");
        return result;
      } catch (err: unknown) {
        sendDiagnostic("error", "pi-sdk", `Pi.init failed: ${err}`, {
          error: String(err),
        });
        throw err;
      }
    }) as PiInstance["init"];

    sendDiagnostic("info", "pi-sdk", "Pi SDK intercepted", {
      sdkVersion: "2.0",
      hostname: window.location.hostname,
    });
  }, 200);

  setTimeout(() => {
    if (piInterceptTimer) {
      clearInterval(piInterceptTimer);
      piInterceptTimer = null;
    }
  }, 10000);
}

function interceptFetch() {
  origFetch = window.fetch.bind(window);
  const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request)?.url || "unknown";
    const method = init?.method || "GET";

    try {
      const response = await origFetch!(input, init);

      if (url.includes("/api/") && !response.ok) {
        const body = await response.clone().text().catch(() => "unreadable");
        sendDiagnostic("error", "api", `API ${method} ${url} → ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          body: body.slice(0, 500),
          method,
        });
      }

      return response;
    } catch (error) {
      if (url.includes("/api/")) {
        sendDiagnostic("error", "api", `API ${method} ${url} → network error`, {
          error: error instanceof Error ? error.message : String(error),
          method,
        });
      }
      throw error;
    }
  };
  // Cast to preserve fetch properties like preconnect
  window.fetch = customFetch as typeof fetch;
}

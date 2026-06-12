/* eslint-disable @typescript-eslint/no-explicit-any */
const PATCH_FLAG = "__axiomidPiPostMessagePatched";

type PatchedWindow = Window & {
  [PATCH_FLAG]?: boolean;
};

function isPiOrigin(origin: string): boolean {
  return /(^|\.)minepi\.com$/.test(new URL(origin).hostname);
}

function normalizeTargetOrigin(targetOrigin: string): string {


  try {
    if (targetOrigin === window.location.origin) return targetOrigin;
    if (isPiOrigin(targetOrigin)) {
      return window.location.origin;
    }
  } catch {
    // Keep the browser's native validation for malformed non-Pi origins.
  }

  return targetOrigin;
}

export function patchPostMessageForSandbox(): void {
  const patchedWindow = window as PatchedWindow;
  if (patchedWindow[PATCH_FLAG]) return;

  const originalPostMessage = window.postMessage.bind(window);
  patchedWindow[PATCH_FLAG] = true;

  window.postMessage = ((message: any, targetOriginOrOptions?: string | WindowPostMessageOptions, ...args: any[]) => {
    if (typeof targetOriginOrOptions === "string") {
      originalPostMessage(message, normalizeTargetOrigin(targetOriginOrOptions), ...args);
      return;
    }

    if (targetOriginOrOptions?.targetOrigin) {
      originalPostMessage(message, {
        ...targetOriginOrOptions,
        targetOrigin: normalizeTargetOrigin(targetOriginOrOptions.targetOrigin),
      } as any);
      return;
    }

    originalPostMessage(message, targetOriginOrOptions as any, ...args);
  }) as typeof window.postMessage;
}

export function listenForPiSDKMessages(): void {
  function handlePiMessage(event: MessageEvent) {
    if (typeof event.data !== "string") return;

    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "@pi:app:sdk:communication_information_request") {
        const response = {
          type: "@pi:app:sdk:communication_information_response",
          id: msg.id,
          payload: {
            frontend_url: process.env.NEXT_PUBLIC_SITE_URL || "https://axiomid.app",
            development_url:
              process.env.NEXT_PUBLIC_DEV_URL || "https://axiomid8992.pinet.com",
            slug: msg.payload?.slug || "",
            name: msg.payload?.name || "AxiomID",
          },
        };
        event.source?.postMessage(JSON.stringify(response), { targetOrigin: event.origin || "*" });
      }
    } catch {
      // Ignore non-JSON messages
    }
  }

  window.addEventListener("message", handlePiMessage);
}

export function initSandboxCompatibility(): void {
  if (typeof window === "undefined") return;

  patchPostMessageForSandbox();
  listenForPiSDKMessages();
}

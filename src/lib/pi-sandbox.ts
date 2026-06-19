/* eslint-disable @typescript-eslint/no-explicit-any */
const PI_SDK_MSG_PREFIX = "@pi:app:sdk:";

function isPiSdkMessage(message: any): boolean {
  if (typeof message === "string") {
    return message.startsWith(PI_SDK_MSG_PREFIX);
  }
  if (typeof message === "object" && message !== null) {
    return typeof message.type === "string" && message.type.startsWith(PI_SDK_MSG_PREFIX);
  }
  return false;
}

export function patchPostMessageForSandbox(): void {
  const originalPostMessage = window.postMessage.bind(window);

  window.postMessage = ((message: any, targetOrigin: string, ...args: any[]) => {
    // Only intercept Pi SDK messages — pass everything else through unchanged
    if (isPiSdkMessage(message) && window.parent && window.parent !== window) {
      (window.parent as any).postMessage(message, "https://app.minepi.com", ...args);
    } else {
      originalPostMessage(message, targetOrigin, ...args);
    }
  }) as typeof window.postMessage;
}

export function listenForPiSDKMessages(): () => void {
  function handlePiMessage(event: MessageEvent) {
    if (typeof event.data !== "string") return;
    const origin = event.origin as string;
    if (origin !== "https://app.minepi.com" && origin !== "https://sandbox.minepi.com" && origin !== "null") return;

    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "@pi:app:sdk:communication_information_request") {
        if (!event.origin || event.origin === "null") {
          console.warn("[Pi Sandbox] Refusing to respond to communication_information_request from null origin — possible sandbox context leak");
          return;
        }

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
        event.source?.postMessage(JSON.stringify(response), {
          targetOrigin: event.origin,
        });
      }
    } catch {
      // Ignore non-JSON messages
    }
  }

  window.addEventListener("message", handlePiMessage);
  return () => window.removeEventListener("message", handlePiMessage);
}

export function initSandboxCompatibility(): (() => void) | void {
  if (typeof window === "undefined") return;

  patchPostMessageForSandbox();
  return listenForPiSDKMessages();
}

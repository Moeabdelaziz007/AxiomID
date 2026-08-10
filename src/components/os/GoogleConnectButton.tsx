"use client";

// "Continue with Google" button (Google Identity Services). Loads GIS on
// demand, renders the branded button, verifies the returned ID token
// server-side via /api/auth/google, then reports the verified identity.

import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/app/context/language-context";
import { emit, BUS_EVENTS } from "./agent-bus";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: { theme?: string; size?: string; shape?: string; width?: number }) => void;
        };
      };
    };
  }
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
}

export function GoogleConnectButton({ onConnected }: { onConnected: (identity: GoogleIdentity) => void }) {
  const { t } = useLanguage();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const handleCredential = async (resp: { credential: string }) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: resp.credential }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || "Connection failed");
          return;
        }
        const identity = (await res.json()) as GoogleIdentity;
        emit(BUS_EVENTS.googleConnected, { email: identity.email, name: identity.name });
        try {
          localStorage.setItem("aura.connect.google", JSON.stringify(identity));
        } catch {
          // storage unavailable (private mode) — session-only connect is fine
        }
        onConnected(identity);
      } catch (err) {
        logger.error("Google connect failed:", err);
        setError("Connection failed");
      }
    };

    const init = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", width: 200 });
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [onConnected]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return (
      <p className="text-[10px] font-mono text-faint text-center">{t("onboarding_google_unavailable")}</p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={buttonRef} className="flex justify-center" />
      {error && <p className="text-[10px] font-mono text-red-400 text-center">{error}</p>}
    </div>
  );
}
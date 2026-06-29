"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/language-context";
import { parsePiSignInCallback, fetchPiUser } from "@/lib/pi-signin";

/**
 * Completes the Pi sign-in callback flow.
 *
 * @returns The sign-in callback page content.
 */
export default function PiSignInCallbackPage() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const result = parsePiSignInCallback();

      if (result.error) {
        if (!cancelled) {
          setStatus("error");
          setError(result.error);
        }
        return;
      }

      if (!result.accessToken) {
        if (!cancelled) {
          setStatus("error");
          setError(t("No access token received.", "لم يتم استلام رمز الوصول."));
        }
        return;
      }

      try {
        const user = await fetchPiUser(result.accessToken);

        const authRes = await fetch("/api/auth/pi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: result.accessToken,
            uid: user.uid,
            username: user.username,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!authRes.ok) {
          const text = await authRes.text();
          throw new Error(text || `Auth API returned ${authRes.status}`);
        }

        const authData = await authRes.json();

        if (!authData.userId || !user.uid || !user.username) {
          throw new Error(
            t(
              "Incomplete sign-in response from server.",
              "استجابة تسجيل دخول غير مكتملة من الخادم.",
            ),
          );
        }

        localStorage.setItem("pi_access_token", result.accessToken);
        localStorage.setItem("axiomid_wallet", `pi:${user.uid}`);
        localStorage.setItem("axiomid_uid", user.uid);
        localStorage.setItem("axiomid_username", user.username);
        localStorage.setItem("axiomid_access_token", result.accessToken);
        localStorage.removeItem("axiomid_logged_out");
        localStorage.removeItem("axiomid_info_modal");

        if (!cancelled) {
          window.location.href = "/dashboard";
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : t("Sign-in failed", "فشل تسجيل الدخول"));
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,120,255,0.08)_0%,_transparent_60%)]" />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h1 className="mb-4 font-sans text-2xl font-bold">
            {t("Sign-in failed", "فشل تسجيل الدخول")}
          </h1>
          <p className="mb-6 font-mono text-sm text-red-400">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-gradient-to-r from-electric-blue to-blue-600 px-6 py-3 font-sans font-semibold text-white shadow-lg shadow-electric-blue/10 transition-shadow hover:shadow-electric-blue/20"
          >
            {t("Try again", "حاول مرة أخرى")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,120,255,0.08)_0%,_transparent_60%)]" />
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-electric-blue border-t-transparent" />
        <p className="font-sans text-lg text-white/70">
          {t("Completing sign-in...", "جارٍ إكمال تسجيل الدخول...")}
        </p>
      </div>
    </main>
  );
}

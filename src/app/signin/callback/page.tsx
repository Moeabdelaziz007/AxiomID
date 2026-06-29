"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parsePiSignInCallback, fetchPiUser } from "@/lib/pi-signin";
import { useLanguage } from "@/app/context/language-context";

export default function PiSignInCallbackPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
          setError("No access token received.");
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
        });

        if (!authRes.ok) {
          const text = await authRes.text();
          throw new Error(text || `Auth API returned ${authRes.status}`);
        }

        const authData = await authRes.json();

        if (!authData.userId || !user.uid || !user.username) {
          throw new Error("Incomplete sign-in response from server.");
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
          setError(e instanceof Error ? e.message : "Sign-in failed");
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-[#10131a]">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-white">{t("signin_failed")}</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            {t("try_again")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#10131a]">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-lg text-white">{t("completing_sign_in")}</p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parsePiSignInCallback, fetchPiUser } from "@/lib/pi-signin";

/**
 * Completes the Pi sign-in callback flow.
 *
 * @returns The sign-in callback page content.
 */
export default function PiSignInCallbackPage() {
  const router = useRouter();
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
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Sign-in failed</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try again
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-lg">Completing sign-in...</p>
      </div>
    </main>
  );
}

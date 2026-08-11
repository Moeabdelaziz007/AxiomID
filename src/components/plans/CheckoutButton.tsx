"use client";

import { useState } from "react";
import { useLanguage } from "@/app/context/language-context";

type Plan = "creator" | "power";

export function CheckoutButton({ plan }: { plan: Plan }) {
  const { t } = useLanguage();
  const [state, setState] = useState<"idle" | "pending" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const checkout = async () => {
    setState("pending");
    try {
      const res = await fetch(`/api/plans/checkout?plan=${plan}`, { method: "POST" });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(body.message ?? "checkout failed");
      setMessage(body.message ?? t("plan_provision_pending"));
      setState("ok");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("plan_provision_failed"));
      setState("error");
    }
  };

  const text =
    state === "pending"
      ? t("plan_provisioning")
      : state === "ok"
        ? t("plan_provision_started")
        : state === "error"
          ? t("plan_retry")
          : t("cta_select");
  const classes =
    state === "ok"
      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
      : plan === "creator"
        ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]"
        : "border-white/15 bg-white/5 text-white hover:border-white/30";

  return (
    <div>
      <button
        type="button"
        onClick={checkout}
        disabled={state === "pending"}
        className={`mt-7 w-full rounded-lg border px-4 py-2.5 text-center font-mono text-sm transition-all duration-200 ${classes}`}
      >
        {text}
      </button>
      {state !== "idle" && <p className="mt-2 text-center text-xs text-slate-500">{message}</p>}
    </div>
  );
}
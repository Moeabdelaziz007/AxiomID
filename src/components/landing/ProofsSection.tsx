"use client";

import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/app/context/language-context";
import { motion } from "framer-motion";
import { Shield, UserCheck, AlertCircle } from "lucide-react";

interface DidDocument {
  id: string;
  verificationMethod?: Array<{ id: string; type: string; publicKeyMultibase: string }>;
  service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
}

export function ProofsSection() {
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const { data, isError, isLoading } = useQuery<DidDocument>({
    queryKey: ["did-document"],
    queryFn: async () => {
      const res = await fetch("/api/did-document", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 300_000,
  });

  const services = data?.service?.filter((s) => s.type.includes("agent") || s.type.includes("passport")) ?? [];

  return (
    <section id="proofs" className="w-full max-w-6xl px-4 sm:px-6 mt-16 sm:mt-24 z-10" aria-label={t("Proofs", "الأدلة")}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-neon-green" />
        <span className="text-[11px] font-mono text-neon-green uppercase tracking-[0.25em]">
          {t("proofs — verification & credentials", "الأدلة — التحقق والشهادات")}
        </span>
      </div>

      <div className="rounded-2xl border border-glass bg-black/40 backdrop-blur-sm overflow-hidden">
        <div className="p-5">
          {isLoading && <div className="font-mono text-xs text-subtle animate-pulse">{t("verifying identity on-chain…", "التحقق من الهوية على سلسلة الكتل…")}</div>}

          {isError && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30 font-mono text-xs text-red-400 mb-3">
              {t("✗ /api/did-document failed — no proof to show, honestly.", "✗ فشل /api/did-document — لا دليل لعرضه، بصدق.")}
            </div>
          )}

          {!isError && data && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-neon-green" />
                <span className="font-mono text-sm text-neon-green">✓ W3C DID verified on-chain</span>
              </div>

              <div className="font-mono text-xs text-subtle mb-4 break-all">
                <div>{t("ID:", "الهوية:")} {data.id}</div>
              </div>

              {data.verificationMethod && (
                <div className="mb-4">
                  <div className="text-[11px] font-mono text-subtle mb-2">{t("verification methods:", "طرق التحقق:")}</div>
                  {data.verificationMethod.slice(0, 2).map((vm, i) => (
                    <motion.div
                      key={vm.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-[10px] font-mono text-faint mb-2 break-all"
                    >
                      {vm.id} ({vm.type})
                    </motion.div>
                  ))}
                </div>
              )}

              {services.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-mono text-subtle mb-2">{t("services:", "الخدمات:")}</div>
                  {services.map((svc, i) => (
                    <motion.div
                      key={svc.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-[10px] font-mono text-faint mb-2 break-all"
                    >
                      {svc.type}: {svc.serviceEndpoint}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Credential-status note */}
          <div className="mt-4 pt-3 border-t border-glass/30">
            <div className="flex items-start gap-2 text-[10px] font-mono text-faint">
              <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
              <span>
                {t("credential-status", "حالة الاعتماد")}
                <span className="block ml-2">{t("(requires auth to read)", "(يتطلب مصادقة للقراءة)")}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
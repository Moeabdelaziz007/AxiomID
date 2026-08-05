"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AgentPassport } from "@/components/AgentPassport";
import { AgentQR } from "@/components/AgentQR";
import Link from "next/link";
import { useLanguage } from "../../context/language-context";
import { sharePassport } from "@/lib/pi-native-features";
import type { PassportStamp } from "@/components/passport/types";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PassportSkeleton } from "@/components/skeletons/PassportSkeleton";

interface PassportData {
  username: string;
  walletAddress: string | null;
  stellarAddress?: string | null;
  did: string;
  tier: string;
  xp: number;
  trustScore: number;
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  stamps?: PassportStamp[];
  issuedDate: string;
  agentName: string | null;
  agentStatus: string | null;
  jobStatus?: string; // Inject IdentityJob status if still building
}

export function PassportView() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();

  const { data: passport, isLoading, error } = useQuery<PassportData>({
    queryKey: ["passport", slug],
    queryFn: async () => {
      const res = await fetch(`/api/passport/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'translated_passport_not_found');
      }
      return res.json();
    },
    enabled: !!slug,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.jobStatus && data.jobStatus !== "COMPLETED" && data.jobStatus !== "ACTIVE") {
        return 3000;
      }
      return false;
    },
  });

  const handleShare = async () => {
    await sharePassport({
      title: t("share_title"),
      text: t("share_text"),
      url: window.location.href,
    });
  };

  if (isLoading) {
     return <PassportSkeleton />;
  }

  // Identity is still being built
  if (passport && passport.jobStatus && passport.jobStatus !== "COMPLETED" && passport.jobStatus !== "ACTIVE") {
      return (
         <div className="w-full max-w-lg flex flex-col items-center text-center p-8 bg-glass border border-glass-hover rounded-2xl backdrop-blur-md">
             <div className="w-16 h-16 rounded-full border-4 border-electric-blue border-t-transparent animate-spin mx-auto mb-6" />
             <h2 className="text-2xl font-bold font-mono text-white mb-2">Preparing your AI...</h2>
             <p className="text-faint font-mono text-sm mb-8">Status: {passport.jobStatus}</p>
             <div className="space-y-2 text-xs font-mono text-left bg-black/30 p-4 rounded-xl w-full">
                 <div className="flex items-center gap-2 text-faint"><CheckCircle2 className="w-3 h-3" /> Reserving Domain</div>
                 <div className="flex items-center gap-2 text-emerald-400 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Provisioning Identity Engine</div>
                 <div className="flex items-center gap-2 text-zinc-700"> Generating DID Document</div>
                 <div className="flex items-center gap-2 text-zinc-700"> Issuing Sovereign Passport</div>
             </div>
         </div>
      );
  }

  if (!passport && !error && !isLoading) {
    return null;
  }

  return (
    <>
      {error ? (

        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface mb-4">{t('passport_not_found')}</h2>
          <p className="text-subtle mb-8">{error.message}</p>
          <Link href="/claim" className="btn-primary text-xs">
            {t('create_your_passport')}
          </Link>
        </div>
      ) : passport ? (
        <>
          <div className="relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[400px] h-[400px] spotlight-accent rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 right-0 w-[300px] h-[300px] spotlight-primary rounded-full pointer-events-none" />
            <AgentPassport
            username={passport.username}
            walletAddress={passport.walletAddress || undefined}
            stellarAddress={passport.stellarAddress || undefined}
            tier={passport.tier as "Visitor" | "Citizen" | "Validator" | "Sovereign"}
            trustScore={passport.trustScore}
            kyaStatus={passport.kyaStatus}
            kycStatus={passport.kycStatus}
            stamps={passport.stamps}
            issuedDate={passport.issuedDate}
            did={passport.did}
            xp={passport.xp}
            agentName={passport.agentName || undefined}
            agentStatus={passport.agentStatus || undefined}
          />
          </div>
 
          <div className="mt-8 flex flex-col items-center gap-3">
            <AgentQR did={passport.did} />
            <button
              onClick={handleShare}
              className="btn-primary text-xs flex items-center gap-2 px-4 py-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l4.639-2.32m0 0a3 3 0 114.12 4.119l-4.64 2.32m0 0a3 3 0 11-4.119-4.12l4.64-2.32z" />
              </svg>
              {t('share_passport')}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-faint mb-4">
              {t('passport_verified_by')}
            </p>
            <Link href="/claim" className="btn-primary text-xs">
              {t('create_your_passport')}
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}

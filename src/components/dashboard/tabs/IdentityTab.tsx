"use client";

import { useRouter } from "next/navigation";
import nextDynamic from "next/dynamic";
import { StampBoard } from "@/components/StampBoard";
import { KYAVerificationCard } from "@/components/dashboard/KYAVerificationCard";
import type { User } from "@/app/context/wallet-types";

const InteractivePassportCard = nextDynamic(
  () => import("@/components/ui/InteractivePassportCard"),
  { ssr: false }
);

interface IdentityTabProps {
  user: User;
  claimAction: (actionType: string, metadata?: Record<string, unknown>) => Promise<boolean>;
  claimKya: (username: string) => Promise<boolean>;
  connectWallet: () => Promise<boolean>;
}

/**
 * Identity tab — composes existing components.
 * InteractivePassportCard (3D), StampBoard, KYAVerificationCard.
 */
export function IdentityTab({ user, claimAction, claimKya, connectWallet }: IdentityTabProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <div
            className="relative group cursor-pointer"
            onClick={() => router.push(`/passport/${user.piUsername || user.walletAddress}`)}
          >
            <InteractivePassportCard
              user={{
                piUsername: user.piUsername,
                walletAddress: user.walletAddress,
                tier: user.tier,
                xp: user.xp,
                trustScore: user.trustScore,
                kyaStatus: user.kycStatus ? "verified" : "pending",
                kycStatus: user.kycStatus ? "verified" : "pending",
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center pointer-events-none">
              <span className="text-xs font-mono text-white tracking-widest uppercase bg-black/60 px-3 py-1.5 rounded-lg border border-glass-hover">
                View Passport
              </span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <StampBoard user={user} claimAction={claimAction} connectWallet={connectWallet} />
        </div>
      </div>
      <KYAVerificationCard
        kycStatus={user.kycStatus ?? "UNVERIFIED"}
        did={user.did ?? ""}
        piUsername={user.piUsername ?? ""}
        onVerify={async (username: string) => { await claimKya(username); }}
      />
    </div>
  );
}

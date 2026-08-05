"use client";

import { DonateWithPiCard } from "@/components/dashboard/DonateWithPiCard";
import { SpendRequestsPanel } from "@/components/dashboard/SpendRequestsPanel";
import { useWallet } from "@/app/context/wallet-context";

/**
 * Wallet tab — composes DonateWithPiCard and SpendRequestsPanel.
 * Transaction history placeholder (no tx API yet).
 */
export function WalletTab() {
  const { user } = useWallet();

  return (
    <div className="space-y-5">
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
          Wallet
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-faint uppercase tracking-wider">
            Connected:
          </span>
          <span className="text-[9px] font-mono text-emerald-400">
            {user?.walletAddress
              ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
              : "Not connected"}
          </span>
        </div>
      </div>

      <SpendRequestsPanel />

      <DonateWithPiCard />

      {/* Transaction history — placeholder until API is available */}
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
          Transaction History
        </h3>
        <p className="text-xs text-faint">
          Transaction history will appear here once the API is available.
        </p>
      </div>
    </div>
  );
}

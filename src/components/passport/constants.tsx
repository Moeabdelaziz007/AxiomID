import React from "react";

export interface ModuleSlot {
  key: string;
  icon: React.ReactNode;
  label: string;
  matchTypes: string[];
}

export const MODULE_SLOTS: ModuleSlot[] = [
  { key: "wallet", icon: <span className="text-neon-green text-xs">W</span>, label: "WALLET", matchTypes: ["connect_wallet", "wallet_age"] },
  { key: "kyc", icon: <span className="text-neon-green text-xs">✓</span>, label: "KYC", matchTypes: ["complete_kyc"] },
  { key: "payment", icon: <span className="text-neon-green text-xs">π</span>, label: "PI PAY", matchTypes: ["pi_payment"] },
  { key: "security", icon: <span className="text-neon-green text-xs">🛡</span>, label: "SECURITY", matchTypes: ["security_circle"] },
  { key: "lockup", icon: <span className="text-neon-green text-xs">🔒</span>, label: "LOCKUP", matchTypes: ["lockup_commitment"] },
  { key: "node", icon: <span className="text-neon-green text-xs">⚡</span>, label: "NODE", matchTypes: ["node_operation"] },
  { key: "mainnet", icon: <span className="text-neon-green text-xs">🌐</span>, label: "MAINNET", matchTypes: ["mainnet_migration"] },
  { key: "mining", icon: <span className="text-neon-green text-xs">⛏</span>, label: "MINING", matchTypes: ["mining_streak"] },
  { key: "validator", icon: <span className="text-neon-green text-xs">★</span>, label: "VALIDATOR", matchTypes: ["validator_service"] },
];

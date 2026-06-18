import React from "react";

export interface ModuleSlot {
  key: string;
  icon: React.ReactNode;
  label: string;
  matchTypes: string[];
}

export const MODULE_SLOTS: ModuleSlot[] = [
  { key: "pi_net", icon: <span className="text-neon-green text-xs">π</span>, label: "PI NET", matchTypes: ["verify_identity"] },
  { key: "twitter", icon: <span className="text-neon-green text-xs">𝕏</span>, label: "TWITTER", matchTypes: ["connect_twitter"] },
  { key: "discord", icon: <span className="text-neon-green text-xs">♯</span>, label: "DISCORD", matchTypes: ["connect_discord"] },
  { key: "google", icon: <span className="text-neon-green text-xs">G</span>, label: "GOOGLE", matchTypes: ["connect_google"] },
  { key: "wallet", icon: <span className="text-neon-green text-xs">W</span>, label: "WALLET", matchTypes: ["wallet_age"] },
  { key: "mining", icon: <span className="text-neon-green text-xs">⚡</span>, label: "MINING", matchTypes: ["daily_pow"] },
];

import { Tier } from "@/lib/tiers";

export interface PassportStamp {
  type: string;
  provider: string;
}

export interface AgentPassportProps {
  username: string;
  walletAddress?: string | null;
  stellarAddress?: string | null;
  tier: Tier;
  trustScore: number;
  kyaStatus: "verified" | "pending" | "denied";
  kycStatus: "verified" | "pending" | "denied";
  stamps?: PassportStamp[];
  issuedDate: string;
  did: string;
  agentName?: string;
  agentStatus?: string;
  xp: number;
}

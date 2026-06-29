"use client";

import { Tier } from "@/lib/tiers";
import { calculateTrustScore } from "@/lib/trust";
import { logger } from "@/lib/logger";

export interface User {
  id: string;
  walletAddress: string;
  stellarAddress?: string | null;
  piUsername?: string | null;
  kycStatus?: string | null;
  did?: string | null;
  passportUrl?: string | null;
  xp: number;
  tier: Tier;
  trustScore: number;
  createdAt: string;
  actions: { type: string; xp: number; timestamp: string; metadata?: string | null }[];
  stamps: { type: string; provider: string; xpAwarded: number; metadata?: string | null; createdAt: string }[];
  agent?: {
    id: string;
    name: string;
    status: string;
    lastActive: string | null;
  } | null;
}

export interface ApiResponse {
  userId: string;
  walletAddress: string;
  tier: Tier;
  xp: number;
  did?: string | null;
  kycStatus?: string | null;
  piUsername?: string | null;
  stellarAddress?: string | null;
  passportUrl?: string | null;
  trustScore?: number;
  createdAt?: string;
  agent?: User['agent'];
  actions?: User['actions'];
  stamps?: User['stamps'];
}

export function isDemoWalletAddress(walletAddress?: string | null): boolean {
  return walletAddress?.startsWith("demo:") ?? false;
}

export function getStoredWallet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const walletAddress = localStorage.getItem("axiomid_wallet");
    if (isDemoWalletAddress(walletAddress)) {
      localStorage.removeItem("axiomid_wallet");
      return null;
    }
    return walletAddress;
  } catch (e) {
    logger.warn("localStorage is inaccessible:", e);
    return null;
  }
}

export function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    logger.warn(`localStorage read failed for key ${key}:`, e);
    return null;
  }
}

export function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    logger.warn(`localStorage write failed for key ${key}:`, e);
  }
}

export function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    logger.warn(`localStorage remove failed for key ${key}:`, e);
  }
}

export function mapApiUser(
  data: ApiResponse,
  fallback?: { stellarAddress?: string | null; createdAt?: string; actions?: User["actions"]; stamps?: User["stamps"] }
): User {
  const stamps = data.stamps || fallback?.stamps || [];
  return {
    id: data.userId,
    walletAddress: data.walletAddress,
    stellarAddress: data.stellarAddress || fallback?.stellarAddress || null,
    xp: data.xp,
    tier: data.tier,
    trustScore: data.trustScore ?? calculateTrustScore(data.xp || 0, stamps.length),
    createdAt: data.createdAt || fallback?.createdAt || new Date().toISOString(),
    piUsername: data.piUsername || null,
    kycStatus: data.kycStatus || null,
    did: data.did || null,
    passportUrl: data.passportUrl || null,
    actions: data.actions || fallback?.actions || [],
    stamps,
    agent: data.agent || null,
  };
}

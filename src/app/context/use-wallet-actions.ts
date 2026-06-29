"use client";

import { useCallback, useRef, useEffect } from "react";
import { runWalletTest } from "@/lib/pi-sdk";
import { logger } from "@/lib/logger";
import {
  User,
  getLocalStorageItem,
  mapApiUser,
} from "./wallet-types";

interface UseWalletActionsParams {
  piAccessToken: string | null;
  userRef: React.MutableRefObject<User | null>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setWalletLogs: React.Dispatch<React.SetStateAction<string[]>>;
}

interface UseWalletActionsReturn {
  refreshUser: (walletAddress?: string) => Promise<void>;
  claimAction: (actionType: string, metadata?: Record<string, unknown>) => Promise<boolean>;
  claimKya: (username: string) => Promise<boolean>;
  runTest: () => Promise<void>;
  clearWalletLogs: () => void;
  pushLog: (msg: string) => void;
}

export function useWalletActions({
  piAccessToken,
  userRef,
  setUser,
  setError,
  setWalletLogs,
}: UseWalletActionsParams): UseWalletActionsReturn {
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const pushLog = useCallback((msg: string) => {
    setWalletLogs((prev) => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, [setWalletLogs]);

  const clearWalletLogs = useCallback(() => setWalletLogs([]), [setWalletLogs]);

  const refreshUser = useCallback(async (walletAddress?: string) => {
    const current = userRef.current;
    const addr = walletAddress || current?.walletAddress;
    if (!addr) return;
    try {
      if (getLocalStorageItem("axiomid_logged_out") === "true" || !getLocalStorageItem("axiomid_wallet")) {
         return;
      }
      const storedToken = getLocalStorageItem("pi_access_token");
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }
      const res = await fetch(`/api/user/status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(mapApiUser(data, {
          stellarAddress: current?.stellarAddress,
          createdAt: current?.createdAt,
          actions: current?.actions,
        }));
      }
    } catch (e) {
      logger.error(e);
    }
  }, [setUser, userRef]);

  const claimAction = useCallback(async (actionType: string, metadata?: Record<string, unknown>) => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/stamp/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ actionType, metadata }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to claim");
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => setError(null), 8000);
        return false;
      }

      const data = await res.json();
      setUser((prev) => prev ? {
        ...prev,
        xp: data.newBalance,
        tier: data.tier,
        actions: [...(prev.actions || []), { type: actionType, xp: data.xpEarned, timestamp: new Date().toISOString(), metadata: data.metadata ? (typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata)) : null }],
        stamps: [...(prev.stamps || []), { type: actionType, provider: actionType.startsWith("connect_") ? actionType.replace("connect_", "") : "system", xpAwarded: data.xpEarned, metadata: data.metadata ? (typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata)) : null, createdAt: new Date().toISOString() }],
      } : prev);
      return true;
    } catch (err) {
      logger.error("Claim error:", err);
      return false;
    }
  }, [piAccessToken, setUser, setError, userRef]);

  const claimKya = useCallback(async (_username: string) => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/pi/kya/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to verify identity");
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = setTimeout(() => setError(null), 8000);
        return false;
      }

      await refreshUser();
      return true;
    } catch (err) {
      logger.error("KYA claim error:", err);
      return false;
    }
  }, [refreshUser, piAccessToken, setError, userRef]);

  const runTest = useCallback(async () => {
    clearWalletLogs();
    pushLog("🚀 Starting comprehensive wallet test...");
    try {
      await runWalletTest(pushLog);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      pushLog(`❌ Unexpected error: ${msg}`);
    }
  }, [pushLog, clearWalletLogs]);

  return { refreshUser, claimAction, claimKya, runTest, clearWalletLogs, pushLog };
}

"use client";

import { useCallback } from "react";

interface UseWalletAgentParams {
  piAccessToken: string | null;
  userRef: React.MutableRefObject<{ walletAddress: string } | null>;
  refreshUser: () => Promise<void>;
}

interface UseWalletAgentReturn {
  createAgent: (name?: string) => Promise<boolean>;
  activateAgent: () => Promise<boolean>;
  pauseAgent: () => Promise<boolean>;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function useWalletAgent({
  piAccessToken,
  userRef,
  refreshUser,
}: UseWalletAgentParams): UseWalletAgentReturn {
  const createAgent = useCallback(async (name?: string) => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: authHeaders(piAccessToken),
        body: name !== undefined ? JSON.stringify({ name }) : undefined,
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [refreshUser, piAccessToken, userRef]);

  const activateAgent = useCallback(async () => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/agent/activate", {
        method: "POST",
        headers: authHeaders(piAccessToken),
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [refreshUser, piAccessToken, userRef]);

  const pauseAgent = useCallback(async () => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/agent/pause", {
        method: "POST",
        headers: authHeaders(piAccessToken),
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [refreshUser, piAccessToken, userRef]);

  return { createAgent, activateAgent, pauseAgent };
}

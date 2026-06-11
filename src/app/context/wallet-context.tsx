"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Tier, getLevelProgress, getNextLevelXP } from "@/lib/tiers";
import { connectPi, runWalletTest, isPiSdkLoaded } from "@/lib/pi-sdk";

export interface User {
  id: string;
  walletAddress: string;
  stellarAddress?: string | null;
  piUsername?: string | null;
  xp: number;
  tier: Tier;
  trustScore: number;
  createdAt: string;
  actions: { type: string; xp: number; timestamp: string }[];
  agent?: {
    id: string;
    name: string;
    status: string;
    lastActive: string | null;
  } | null;
}

interface WalletContextType {
  user: User | null;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  isPiBrowser: boolean;
  connectWallet: () => Promise<void>;
  claimAction: (actionType: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  createAgent: (name?: string) => Promise<boolean>;
  activateAgent: () => Promise<boolean>;
  pauseAgent: () => Promise<boolean>;
  levelProgress: number;
  nextXP: number | null;
  walletLogs: string[];
  runWalletTest: () => Promise<void>;
  clearWalletLogs: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

function checkPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isPiSdkLoaded()) return true;
  if (process.env.NEXT_PUBLIC_PI_SANDBOX === "true") return true;
  
  try {
    if (window.self !== window.top) return true;
  } catch (e) {
    // Cross-origin iframe check might throw, meaning we are in an iframe
    return true; 
  }
  
  const ua = navigator.userAgent;
  return /Pi Browser|minepi/i.test(ua);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [piAccessToken, setPiAccessToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pi_access_token");
    }
    return null;
  });

  const levelProgress = user ? getLevelProgress(user.xp, user.tier) : 0;
  const nextXP = user ? getNextLevelXP(user.tier) : null;
  const authAttempted = useRef(false);
  const [walletLogs, setWalletLogs] = useState<string[]>([]);

  const pushLog = useCallback((msg: string) => {
    setWalletLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const clearWalletLogs = useCallback(() => setWalletLogs([]), []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    pushLog("بدء الاتصال بالمحفظة...");

    try {
      const inPiBrowser = checkPiBrowser();
      pushLog(`حالة Pi Browser: ${inPiBrowser ? "نعم ✅" : "لا"}`);

      if (!inPiBrowser) {
        pushLog("وضع التجربة (non-Pi browser)...");
        const storedWallet = localStorage.getItem("axiomid_wallet");
        const walletAddress = storedWallet && storedWallet.startsWith("demo:")
          ? storedWallet
          : `demo:${crypto.randomUUID().slice(0, 8)}`;
        localStorage.setItem("axiomid_wallet", walletAddress);
        pushLog(`محفظة مؤقتة: ${walletAddress}`);

        const res = await fetch("/api/auth/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });

        if (!res.ok) throw new Error("Demo auth failed");
        const data = await res.json();
        pushLog(`تم تسجيل الدخول بنجاح ✅`);
        setUser({
          ...data.user,
          trustScore: data.user.trustScore ?? Math.min(100, Math.floor((data.user.xp || 0) / 10)),
          createdAt: data.user.createdAt ?? new Date().toISOString(),
        });
        return;
      }

      pushLog("جاري التوثيق عبر Pi SDK...");
      const { accessToken, user: piUser } = await connectPi(pushLog);
      setPiAccessToken(accessToken);
      localStorage.setItem("pi_access_token", accessToken);
      const walletAddress = `pi:${piUser.uid}`;
      const stellarAddress = (piUser as any).wallet_address || null;
      pushLog(`عنوان المحفظة: ${walletAddress}`);
      if (stellarAddress) pushLog(`Stellar Address: ${stellarAddress}`);

      pushLog("جاري التحقق من صحة التوثيق مع السيرفر...");
      const res = await fetch("/api/auth/pi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          uid: piUser.uid,
          username: piUser.username,
          walletAddress,
          stellarAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Authentication failed");
      }

      const data = await res.json();
      localStorage.setItem("axiomid_wallet", walletAddress);
      setUser({
        id: data.userId,
        walletAddress: data.walletAddress,
        stellarAddress: stellarAddress,
        xp: data.xp,
        tier: data.tier,
        trustScore: Math.min(100, Math.floor((data.xp || 0) / 10)),
        createdAt: new Date().toISOString(),
        piUsername: data.piUsername || piUser.username,
        actions: [],
        agent: null,
      });
      pushLog(`✅ تم توثيق المحفظة بنجاح!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      console.error("Auth error:", message);
      pushLog(`❌ خطأ: ${message}`);
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [pushLog]);

  const runTest = useCallback(async () => {
    clearWalletLogs();
    pushLog("🚀 بدء اختبار المحفظة الشامل...");
    try {
      await runWalletTest(pushLog);
    } catch (err: any) {
      pushLog(`❌ خطأ غير متوقع: ${err?.message || err}`);
    }
  }, [pushLog, clearWalletLogs]);

  useEffect(() => {
    const inPiBrowser = checkPiBrowser();
    setIsPiBrowser(inPiBrowser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (authAttempted.current) return;
    authAttempted.current = true;

    const inPiBrowser = checkPiBrowser();

    if (inPiBrowser) {
      connectWallet();
    }
  }, [connectWallet]);

  const claimAction = useCallback(async (actionType: string) => {
    if (!user) return false;
    try {
      const res = await fetch("/api/action/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, actionType }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to claim");
        return false;
      }

      const data = await res.json();
      setUser((prev) => prev ? {
        ...prev,
        xp: data.newBalance,
        tier: data.tier,
        actions: [...(prev.actions || []), { type: actionType, xp: data.xpEarned, timestamp: new Date().toISOString() }],
      } : prev);
      return true;
    } catch (err) {
      console.error("Claim error:", err);
      return false;
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user/status?walletAddress=${user.walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.userId,
          walletAddress: data.walletAddress,
          stellarAddress: data.stellarAddress || user?.stellarAddress || null,
          xp: data.xp,
          tier: data.tier,
          trustScore: data.trustScore ?? Math.min(100, Math.floor((data.xp || 0) / 10)),
          createdAt: data.createdAt || user?.createdAt || new Date().toISOString(),
          piUsername: data.piUsername,
          actions: user?.actions || [],
          agent: data.agent || null,
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const createAgent = useCallback(async (name?: string) => {
    if (!user) return false;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          name,
          accessToken: piAccessToken || undefined
        }),
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [user, refreshUser, piAccessToken]);

  const activateAgent = useCallback(async () => {
    if (!user) return false;
    try {
      const res = await fetch("/api/agent/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          accessToken: piAccessToken || undefined
        }),
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [user, refreshUser, piAccessToken]);

  const pauseAgent = useCallback(async () => {
    if (!user) return false;
    try {
      const res = await fetch("/api/agent/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          accessToken: piAccessToken || undefined
        }),
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [user, refreshUser, piAccessToken]);

  return (
      <WalletContext.Provider
        value={{
          user,
          isLoading,
          isConnecting,
          error,
          isPiBrowser,
          connectWallet,
          claimAction,
          refreshUser,
          createAgent,
          activateAgent,
          pauseAgent,
          levelProgress,
          nextXP,
          walletLogs,
          runWalletTest: runTest,
          clearWalletLogs,
        }}
      >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletLogs(): string[] {
  const ctx = useContext(WalletContext);
  return ctx?.walletLogs ?? [];
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

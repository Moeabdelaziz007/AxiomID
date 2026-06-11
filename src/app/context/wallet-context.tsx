"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Tier, getLevelProgress, getNextLevelXP } from "@/lib/tiers";
import { connectPi, runWalletTest } from "@/lib/pi-sdk";

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

  const ua = navigator.userAgent;
  if (/Pi Browser|minepi/i.test(ua)) return true;

  if (typeof window !== "undefined" && window.Pi?.authenticate) return true;

  try {
    if (window.self !== window.top) {
      const referrer = document.referrer || "";
      if (referrer.includes("minepi.com") || referrer.includes("sandbox.minepi.com")) return true;
    }
  } catch {}

  return false;
}

function mapApiUser(data: Record<string, unknown>, existing?: User | null): User {
  return {
    id: data.userId as string,
    walletAddress: data.walletAddress as string,
    stellarAddress: (data.stellarAddress as string | null) || existing?.stellarAddress || null,
    xp: data.xp as number,
    tier: data.tier as Tier,
    trustScore: (data.trustScore as number) ?? Math.min(100, Math.floor(((data.xp as number) || 0) / 10)),
    createdAt: (data.createdAt as string) || existing?.createdAt || new Date().toISOString(),
    piUsername: data.piUsername as string | null,
    actions: existing?.actions || [],
    agent: (data.agent as User["agent"]) || null,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    if (checkPiBrowser()) return true;
    return !!(localStorage.getItem("axiomid_wallet") || localStorage.getItem("pi_access_token"));
  });
  const [error, setError] = useState<string | null>(null);
  const [isPiBrowser] = useState(checkPiBrowser);
  const [piAccessToken, setPiAccessToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pi_access_token");
    }
    return null;
  });

  const levelProgress = user ? getLevelProgress(user.xp, user.tier) : 0;
  const nextXP = user ? getNextLevelXP(user.tier) : null;
  const [walletLogs, setWalletLogs] = useState<string[]>([]);

  const pushLog = useCallback((msg: string) => {
    setWalletLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const clearWalletLogs = useCallback(() => setWalletLogs([]), []);

  const refreshUser = useCallback(async (walletAddress?: string) => {
    const addr = walletAddress || user?.walletAddress;
    if (!addr) return;
    try {
      const res = await fetch(`/api/user/status?walletAddress=${addr}`);
      if (res.ok) {
        const data = await res.json();
        setUser(mapApiUser(data, user));
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
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ name }),
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
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
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
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [user, refreshUser, piAccessToken]);

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
      let accessToken: string;
      let piUser: { uid: string; username: string; name: string; wallet_address?: string };

      try {
        const result = await connectPi(pushLog);
        accessToken = result.token;
        piUser = result.user;
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "NOT_IN_PI_BROWSER") {
          pushLog("Not inside Pi Browser — using demo wallet");
          const walletAddress = `demo:${crypto.randomUUID().slice(0, 8)}`;
          localStorage.setItem("axiomid_wallet", walletAddress);
          pushLog(`Demo wallet: ${walletAddress}`);

          const res = await fetch("/api/auth/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress }),
          });

          if (!res.ok) throw new Error("Demo auth failed");
          const data = await res.json();
          pushLog(`Logged in successfully`);
          setUser({
            ...data.user,
            trustScore: data.user.trustScore ?? Math.min(100, Math.floor((data.user.xp || 0) / 10)),
            createdAt: data.user.createdAt ?? new Date().toISOString(),
          });
          return;
        }
        throw err;
      }

      setPiAccessToken(accessToken);
      localStorage.setItem("pi_access_token", accessToken);
      const walletAddress = `pi:${piUser.uid}`;
      const stellarAddress = piUser.wallet_address || null;
      pushLog(`Wallet: ${walletAddress}`);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      pushLog(`❌ خطأ غير متوقع: ${msg}`);
    }
  }, [pushLog, clearWalletLogs]);

  const claimAction = useCallback(async (actionType: string) => {
    if (!user) return false;
    try {
      const res = await fetch("/api/action/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ actionType }),
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
  }, [user, piAccessToken]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Pi) {
      try {
        window.Pi.init({
          version: "2.0",
          sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
        });
      } catch (err) {
        console.error("Failed to initialize Pi SDK:", err);
      }
    }
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const inPiBrowser = checkPiBrowser();

    if (inPiBrowser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      connectWallet().finally(() => {
        setIsLoading(false);
      });
    } else {
      const storedWallet = localStorage.getItem("axiomid_wallet");
      if (!storedWallet) {
        setIsLoading(false);
        return;
      }

      fetch(`/api/user/status?walletAddress=${storedWallet}`).then(res => {
        if (!res.ok) {
          setIsLoading(false);
          return;
        }
        res.json().then(data => {
          setUser(mapApiUser(data));
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      }).catch(() => setIsLoading(false));

  }, [connectWallet]);

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
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
  logout: () => void;
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

function buildUserFromApiData(data: any, fallback?: { stellarAddress?: string | null; createdAt?: string; actions?: User["actions"] }): User {
  return {
    id: data.userId,
    walletAddress: data.walletAddress,
    stellarAddress: data.stellarAddress || fallback?.stellarAddress || null,
    xp: data.xp,
    tier: data.tier,
    trustScore: data.trustScore ?? Math.min(100, Math.floor((data.xp || 0) / 10)),
    createdAt: data.createdAt || fallback?.createdAt || new Date().toISOString(),
    piUsername: data.piUsername,
    actions: fallback?.actions || [],
    agent: data.agent || null,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
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

  const logout = useCallback(() => {
    localStorage.removeItem("pi_access_token");
    localStorage.removeItem("axiomid_wallet");
    setUser(null);
    setPiAccessToken(null);
    setError(null);
    setIsLoading(false);
    setIsConnecting(false);
    pushLog("Logged out: cleared saved wallet credentials.");
  }, [pushLog]);

  const refreshUser = useCallback(async (walletAddress?: string) => {
    const addr = walletAddress || user?.walletAddress;
    if (!addr) return;
    try {
      const res = await fetch(`/api/user/status?walletAddress=${addr}`);
      if (res.ok) {
        const data = await res.json();
        setUser(buildUserFromApiData(data, {
          stellarAddress: user?.stellarAddress,
          createdAt: user?.createdAt,
          actions: user?.actions,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const callAgentApi = useCallback(async (endpoint: string, body?: object): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [user, refreshUser, piAccessToken]);

  const createAgent = useCallback((name?: string) => callAgentApi("/api/agent", { name }), [callAgentApi]);
  const activateAgent = useCallback(() => callAgentApi("/api/agent/activate"), [callAgentApi]);
  const pauseAgent = useCallback(() => callAgentApi("/api/agent/pause"), [callAgentApi]);

  const connectDemoWallet = useCallback(async (walletAddress: string) => {
    localStorage.setItem("axiomid_wallet", walletAddress);
    const res = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });
    if (!res.ok) throw new Error("Demo auth failed");
    const data = await res.json();
    setUser(buildUserFromApiData(data.user));
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    pushLog("بدء الاتصال بالمحفظة...");


      const inPiBrowser = checkPiBrowser();
      pushLog(`حالة Pi Browser: ${inPiBrowser ? "نعم ✅" : "لا"}`);

      if (!inPiBrowser) {
        pushLog("وضع التجربة (non-Pi browser)...");
        const storedWallet = localStorage.getItem("axiomid_wallet");
        const walletAddress = storedWallet && storedWallet.startsWith("demo:")
          ? storedWallet
          : `demo:${crypto.randomUUID().slice(0, 8)}`;
        pushLog(`محفظة مؤقتة: ${walletAddress}`);
        await connectDemoWallet(walletAddress);
        pushLog(`تم تسجيل الدخول بنجاح ✅`);
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
          pushLog(`Demo wallet: ${walletAddress}`);
          await connectDemoWallet(walletAddress);
          pushLog(`Logged in successfully`);
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
      setUser(buildUserFromApiData(
        { ...data, piUsername: data.piUsername || piUser.username },
        { stellarAddress },
      ));
      pushLog(`✅ تم توثيق المحفظة بنجاح!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";

      pushLog(`❌ خطأ: ${message}`);
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [pushLog, connectDemoWallet]);

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
      setIsLoading(true);
      connectWallet().finally(() => setIsLoading(false));
      return;
    }

    const storedWallet = localStorage.getItem("axiomid_wallet");
    const storedToken = localStorage.getItem("pi_access_token");
    if (!storedWallet && !storedToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/user/status?walletAddress=${storedWallet}`);
        if (res.ok) {
          const data = await res.json();
          setUser(buildUserFromApiData(data));
        }
      } catch {
        // leave user as null
      } finally {
        setIsLoading(false);
      }
    })();
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
        logout,
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
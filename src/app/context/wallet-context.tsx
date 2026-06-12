"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Tier, getLevelProgress, getNextLevelXP } from "@/lib/tiers";
import { connectPi, runWalletTest } from "@/lib/pi-sdk";

export interface User {
  id: string;
  walletAddress: string;
  stellarAddress?: string | null;
  piUsername?: string | null;
  kycStatus?: string | null;
  did?: string | null;
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

interface WalletContextType {
  user: User | null;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  isPiBrowser: boolean;
  isDemoWallet: boolean;
  isDemoWalletEnabled: boolean;
  connectWallet: () => Promise<void>;
  logout: () => void;
  claimAction: (actionType: string, metadata?: Record<string, unknown>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  createAgent: (name?: string) => Promise<boolean>;
  activateAgent: () => Promise<boolean>;
  pauseAgent: () => Promise<boolean>;
  claimKya: (username: string) => Promise<boolean>;
  levelProgress: number;
  nextXP: number | null;
  walletLogs: string[];
  runWalletTest: () => Promise<void>;
  clearWalletLogs: () => void;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

function isDemoWalletAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_WALLET === "true") {
    return true;
  }
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return false;
}

function isDemoWalletAddress(walletAddress?: string | null): boolean {
  return walletAddress?.startsWith("demo:") ?? false;
}

function createDemoWalletAddress(): string {
  const isUUIDAvailable = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
  const randomSuffix = isUUIDAvailable
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).substring(2, 10);
  return `demo:${randomSuffix}`;
}

function getStoredWallet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const walletAddress = localStorage.getItem("axiomid_wallet");
    if (isDemoWalletAddress(walletAddress) && !isDemoWalletAllowed()) {
      localStorage.removeItem("axiomid_wallet");
      return null;
    }
    return walletAddress;
  } catch (e) {
    console.warn("localStorage is inaccessible:", e);
    return null;
  }
}

function getStoredDemoWalletOrNew(): string {
  const stored = getStoredWallet();
  return stored && isDemoWalletAddress(stored) ? stored : createDemoWalletAddress();
}

function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage read failed for key ${key}:`, e);
    return null;
  }
}

function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage write failed for key ${key}:`, e);
  }
}

function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage remove failed for key ${key}:`, e);
  }
}

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

interface ApiResponse {
  userId: string;
  walletAddress: string;
  tier: Tier;
  xp: number;
  did?: string | null;
  kycStatus?: string | null;
  piUsername?: string | null;
  stellarAddress?: string | null;
  trustScore?: number;
  createdAt?: string;
  agent?: User['agent'];
  actions?: User['actions'];
  stamps?: User['stamps'];
}

function mapApiUser(data: ApiResponse, fallback?: { stellarAddress?: string | null; createdAt?: string; actions?: User["actions"]; stamps?: User["stamps"] }): User {
  return {
    id: data.userId,
    walletAddress: data.walletAddress,
    stellarAddress: data.stellarAddress || fallback?.stellarAddress || null,
    xp: data.xp,
    tier: data.tier,
    trustScore: data.trustScore ?? Math.min(100, Math.floor((data.xp || 0) / 10)),
    createdAt: data.createdAt || fallback?.createdAt || new Date().toISOString(),
    piUsername: data.piUsername,
    kycStatus: data.kycStatus || null,
    did: data.did || null,
    actions: data.actions || fallback?.actions || [],
    stamps: data.stamps || fallback?.stamps || [],
    agent: data.agent || null,
  };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!(getStoredWallet() || getLocalStorageItem("pi_access_token"));
  });
  const [error, setError] = useState<string | null>(null);
  const [isPiBrowser] = useState(() => checkPiBrowser());
  const [piAccessToken, setPiAccessToken] = useState<string | null>(() => {
    return getLocalStorageItem("pi_access_token");
  });

  const levelProgress = user ? getLevelProgress(user.xp, user.tier) : 0;
  const nextXP = user ? getNextLevelXP(user.tier) : null;
  const isDemoWallet = isDemoWalletAddress(user?.walletAddress);
  const isDemoWalletEnabled = isDemoWalletAllowed();
  const [walletLogs, setWalletLogs] = useState<string[]>([]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) {
            await navigator.serviceWorker.register("/sw.js");
          }
        } catch (err) {
          console.error("Service worker registration failed:", err);
        }
      };
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  const pushLog = useCallback((msg: string) => {
    setWalletLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const clearWalletLogs = useCallback(() => setWalletLogs([]), []);

  const logout = useCallback(() => {
    removeLocalStorageItem("pi_access_token");
    removeLocalStorageItem("axiomid_wallet");
    setLocalStorageItem("axiomid_logged_out", "true");

    setUser(null);
    setPiAccessToken(null);
    setError(null);
    setIsLoading(false);
    setIsConnecting(false);
    pushLog("Logged out: cleared saved wallet credentials.");
  }, [pushLog]);

  const refreshUser = useCallback(async (walletAddress?: string) => {
    const current = userRef.current;
    const addr = walletAddress || current?.walletAddress;
    if (!addr) return;
    try {
      if (getLocalStorageItem("axiomid_logged_out") === "true" || !getLocalStorageItem("axiomid_wallet")) {
         return; // User has logged out
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
      console.error(e);
    }
  }, []);

  const createAgent = useCallback(async (name?: string) => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: name !== undefined ? JSON.stringify({ name }) : undefined,
      });
      if (!res.ok) return false;
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [refreshUser, piAccessToken]);

  const activateAgent = useCallback(async () => {
    if (!userRef.current) return false;
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
  }, [refreshUser, piAccessToken]);

  const pauseAgent = useCallback(async () => {
    if (!userRef.current) return false;
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
  }, [refreshUser, piAccessToken]);

  const connectDemoWallet = useCallback(async (walletAddress: string) => {
    if (!isDemoWalletAllowed()) {
      throw new Error("Demo wallets are disabled in production.");
    }
    removeLocalStorageItem("axiomid_logged_out");
    setLocalStorageItem("axiomid_wallet", walletAddress);
    const stateRes = await fetch("/api/auth/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });
    if (!stateRes.ok) throw new Error("Failed to generate state token");
    const { state } = await stateRes.json();

    const res = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, state }),
    });
    if (!res.ok) throw new Error("Demo auth failed");
    const data = await res.json();
    const rawUser = data.user || data;
    setUser(mapApiUser(rawUser));
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    pushLog("Initializing wallet connection...");

    removeLocalStorageItem("axiomid_logged_out");

    try {
      const inPiBrowser = checkPiBrowser();
      const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
      pushLog(`Pi Browser: ${inPiBrowser ? "detected ✅" : "not found"}`);

      if (!inPiBrowser && !isSandbox) {
        if (!isDemoWalletAllowed()) {
          throw new Error("Pi Browser required. Open this app inside Pi Browser to authenticate.");
        }
        pushLog("Not in Pi Browser, but demo wallets are allowed. Connecting demo wallet...");
        const walletAddress = getStoredDemoWalletOrNew();
        pushLog(`Demo wallet: ${walletAddress}`);
        await connectDemoWallet(walletAddress);
        pushLog("Logged in successfully ✅");
        return;
      }

      if (!inPiBrowser && isSandbox) {
        if (!isDemoWalletAllowed()) {
          throw new Error("Pi Browser required (Sandbox mode active, but demo wallets are disabled).");
        }
        pushLog("Sandbox mode active...");
        const walletAddress = getStoredDemoWalletOrNew();
        pushLog(`Demo wallet: ${walletAddress}`);
        await connectDemoWallet(walletAddress);
        pushLog("Logged in successfully ✅");
        return;
      }

      pushLog("Authenticating via Pi SDK...");
      let accessToken: string;
      let piUser: { uid: string; username: string; name: string; wallet_address?: string; stellarAddress?: string };

      try {
        const result = await connectPi(pushLog);
        accessToken = result.token;
        piUser = result.user;
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "NOT_IN_PI_BROWSER") {
          if (!isDemoWalletAllowed()) {
            throw new Error("Pi Browser required. Open this app inside Pi Browser to authenticate.");
          }
          pushLog("Not inside Pi Browser — using demo wallet");
          const walletAddress = getStoredDemoWalletOrNew();
          pushLog(`Demo wallet: ${walletAddress}`);
          await connectDemoWallet(walletAddress);
          pushLog("Logged in successfully");
          return;
        }
        throw err;
      }

      setPiAccessToken(accessToken);
      setLocalStorageItem("pi_access_token", accessToken);
      const walletAddress = `pi:${piUser.uid}`;
      const stellarAddress = piUser.stellarAddress || piUser.wallet_address || null;
      pushLog(`Wallet: ${walletAddress}`);
      if (stellarAddress) pushLog(`Stellar Address: ${stellarAddress}`);

      pushLog("Verifying authentication with server...");
      const res = await fetch("/api/auth/pi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          uid: piUser.uid,
          username: piUser.username,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Authentication failed");
      }

      const data = await res.json();
      setLocalStorageItem("axiomid_wallet", walletAddress);
      setUser(mapApiUser(data, {
        stellarAddress: stellarAddress,
      }));
      pushLog("✅ Wallet authenticated successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      console.error("Auth error:", message);
      pushLog(`❌ Error: ${message}`);
      setError(message);
      setTimeout(() => setError(null), 8000);
    } finally {
      setIsConnecting(false);
    }
  }, [pushLog, connectDemoWallet]);

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
        setTimeout(() => setError(null), 8000);
        return false;
      }

      const data = await res.json();
      setUser((prev) => prev ? {
        ...prev,
        xp: data.newBalance,
        tier: data.tier,
        actions: [...(prev.actions || []), { type: actionType, xp: data.xpEarned, timestamp: new Date().toISOString(), metadata: data.metadata }],
        stamps: [...(prev.stamps || []), { type: actionType, provider: actionType.startsWith("connect_") ? actionType.replace("connect_", "") : "system", xpAwarded: data.xpEarned, metadata: data.metadata, createdAt: new Date().toISOString() }],
      } : prev);
      return true;
    } catch (err) {
      console.error("Claim error:", err);
      return false;
    }
  }, [piAccessToken]);

  const disconnectWallet = useCallback(async () => {
    const storedToken = getLocalStorageItem("pi_access_token");
    if (storedToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${storedToken}` },
        });
      } catch {
        // Ignore errors
      }
    }
    logout();
  }, [logout]);

  const claimKya = useCallback(async (username: string) => {
    if (!userRef.current) return false;
    try {
      const res = await fetch("/api/pi/kya/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(piAccessToken ? { "Authorization": `Bearer ${piAccessToken}` } : {}),
        },
        body: JSON.stringify({ username }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to verify identity");
        setTimeout(() => setError(null), 8000);
        return false;
      }

      await refreshUser();
      return true;
    } catch (err) {
      console.error("KYA claim error:", err);
      return false;
    }
  }, [refreshUser, piAccessToken]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        if (event.reason && (
          event.reason.message === "Connection closed" ||
          event.reason.message?.includes("Connection closed")
        )) {
          event.preventDefault();
          console.warn("[Pi SDK] Suppressed expected connection closure rejection:", event.reason);
        }
      };
      window.addEventListener("unhandledrejection", handleUnhandledRejection);

      if (window.Pi) {
        try {
          window.Pi.init({
            version: "2.0",
            sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
          });
        } catch (err) {
          console.error("Failed to initialize Pi SDK:", err);
        }
      }

      return () => {
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      };
    }
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (getLocalStorageItem("axiomid_logged_out") === "true") {
      setTimeout(() => setIsLoading(false), 0);
      return;
    }

    const inPiBrowser = checkPiBrowser();

    if (inPiBrowser) {
      (async () => {
        setIsLoading(true);
        try {
          await connectWallet();
        } finally {
          setIsLoading(false);
        }
      })();
      return;
    }

    const storedWallet = getStoredWallet();
    const storedToken = getLocalStorageItem("pi_access_token");
    if (!storedWallet && !storedToken) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    const headers: Record<string, string> = {};
    if (storedToken) {
      headers["Authorization"] = `Bearer ${storedToken}`;
    }

    queueMicrotask(() => setIsLoading(true));
    fetch(`/api/user/status`, { headers }).then(res => {
      if (!res.ok) {
        removeLocalStorageItem("axiomid_wallet");
        removeLocalStorageItem("pi_access_token");
        setIsLoading(false);
        return;
      }
      return res.json().then(data => {
        setUser(mapApiUser(data));
        setIsLoading(false);
      }).catch(() => {
        removeLocalStorageItem("axiomid_wallet");
        removeLocalStorageItem("pi_access_token");
        setIsLoading(false);
      });
    }).catch(() => {
      removeLocalStorageItem("axiomid_wallet");
      removeLocalStorageItem("pi_access_token");
      setIsLoading(false);
    });
  }, [connectWallet]);

  return (
    <WalletContext.Provider
      value={{
        user,
        isLoading,
        isConnecting,
        error,
        isPiBrowser,
        isDemoWallet,
        isDemoWalletEnabled,
        connectWallet,
        logout,
        claimAction,
        refreshUser,
        createAgent,
        activateAgent,
        pauseAgent,
        claimKya,
        levelProgress,
        nextXP,
        walletLogs,
        runWalletTest: runTest,
        clearWalletLogs,
        disconnectWallet,
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

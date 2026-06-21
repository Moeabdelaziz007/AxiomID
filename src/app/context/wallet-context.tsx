"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { Tier, getLevelProgress, getNextLevelXP } from "@/lib/tiers";
import { calculateTrustScore } from "@/lib/trust";
import { connectPi, runWalletTest, checkPiBrowser, PiSdkError, PiSdkErrorCode, determineSandboxMode } from "@/lib/pi-sdk";
import { logger } from "@/lib/logger";

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

export const WalletContext = createContext<WalletContextType | null>(null);

/**
 * Determines if a wallet address is a demo wallet.
 *
 * NOTE: Demo wallet addresses starting with "demo:" are kept strictly as an internal fallback
 * for development simulation environments. They are blocked from persisting or logging into
 * production wallets to prevent key safety leaks and database pollution.
 *
 * @returns `true` if the address starts with `"demo:"`, `false` otherwise.
 */
function isDemoWalletAddress(walletAddress?: string | null): boolean {
  return walletAddress?.startsWith("demo:") ?? false;
}

/**
 * Retrieves the persisted wallet address from storage.
 *
 * @returns The stored wallet address if present and not a demo wallet, `null` otherwise.
 */
function getStoredWallet(): string | null {
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

/**
 * Safely retrieves a localStorage value.
 *
 * @param key - The localStorage key to read
 * @returns The stored value, or null if unavailable due to server environment or access error
 */
function getLocalStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    logger.warn(`localStorage read failed for key ${key}:`, e);
    return null;
  }
}

/**
 * Safely stores a value in localStorage.
 */
function setLocalStorageItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    logger.warn(`localStorage write failed for key ${key}:`, e);
  }
}

/**
 * Removes an item from localStorage.
 *
 * This function is a no-op on the server.
 */
function removeLocalStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    logger.warn(`localStorage remove failed for key ${key}:`, e);
  }
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

/**
 * Normalize an API user response into the local `User` shape.
 *
 * @param data - Raw API response containing user fields (e.g., `userId`, `walletAddress`, `xp`, `tier`, optional `stamps`, `actions`, `trustScore`, etc.).
 * @param fallback - Optional fallback values used when the API omits certain fields: `stellarAddress`, `createdAt`, `actions`, and `stamps`.
 * @returns The mapped `User` object with defaults applied; `trustScore` is taken from the response when present or computed from `xp` and the number of `stamps`.
 */
function mapApiUser(data: ApiResponse, fallback?: { stellarAddress?: string | null; createdAt?: string; actions?: User["actions"]; stamps?: User["stamps"] }): User {
  const stamps = data.stamps || fallback?.stamps || [];
  return {
    id: data.userId,
    walletAddress: data.walletAddress,
    stellarAddress: data.stellarAddress || fallback?.stellarAddress || null,
    xp: data.xp,
    tier: data.tier,
    trustScore: data.trustScore ?? calculateTrustScore(data.xp || 0, stamps.length),
    createdAt: data.createdAt || fallback?.createdAt || new Date().toISOString(),
    piUsername: data.piUsername,
    kycStatus: data.kycStatus || null,
    did: data.did || null,
    actions: data.actions || fallback?.actions || [],
    stamps,
    agent: data.agent || null,
  };
}

/**
 * Manages wallet authentication and user state for the application.
 *
 * Initializes Pi SDK, restores user sessions, and provides wallet operations
 * (authentication, action claiming, KYA verification, agent management), user state, and progression metrics to child
 * components via context.
 *
 * @returns A context provider that exposes wallet state, authentication operations, user progression, and agent controls to descendants
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    if (localStorage.getItem("axiomid_logged_out") === "true") return false;
    return !!(getStoredWallet() || getLocalStorageItem("pi_access_token"));
  });
  const [error, setError] = useState<string | null>(null);
  const [isPiBrowser] = useState(() => checkPiBrowser());
  const [piAccessToken, setPiAccessToken] = useState<string | null>(() => {
    return getLocalStorageItem("pi_access_token");
  });

  const levelProgress = useMemo(() => user ? getLevelProgress(user.xp, user.tier) : 0, [user]);
  const nextXP = useMemo(() => user ? getNextLevelXP(user.tier) : null, [user]);
  const [walletLogs, setWalletLogs] = useState<string[]>([]);
  const connectingRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      let reasonStr = "";
      if (typeof event.reason === "string") {
        reasonStr = event.reason;
      } else if (event.reason instanceof Error) {
        reasonStr = event.reason.message || event.reason.toString();
      } else if (typeof event.reason === "object" && event.reason !== null) {
        reasonStr = (event.reason as Record<string, unknown>).message as string || (event.reason as Record<string, unknown>).error as string || String(event.reason);
      } else {
        reasonStr = String(event.reason);
      }

      const isConnectionClosed =
        reasonStr.toLowerCase().includes("connection closed") ||
        reasonStr.toLowerCase().includes("connection_closed");

      if (isConnectionClosed) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (!reg) {
            await navigator.serviceWorker.register("/sw.js");
          }
        } catch (err) {
          logger.error("Service worker registration failed:", err);
        }
      };
      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }
    }

    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  const pushLog = useCallback((msg: string) => {
    setWalletLogs((prev) => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return next.length > 200 ? next.slice(-200) : next;
    });
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
      logger.error(e);
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

  const connectWallet = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    pushLog("Initializing wallet connection...");

    removeLocalStorageItem("axiomid_logged_out");

    try {
      if (typeof window !== "undefined") {
        let result;
        if (!checkPiBrowser() && determineSandboxMode() && process.env.NODE_ENV !== "test") {
          pushLog("⚠️ Standard browser detected in Sandbox/Dev mode.");
          pushLog("Connecting with simulated credentials...");
          result = {
            token: "sandbox-dev-token-abc-123",
            user: {
              uid: "sandbox-developer",
              username: "developer",
              name: "Sandbox Developer",
              stellarAddress: "GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2",
            }
          };
        } else {
          pushLog("Attempting Pi SDK authentication...");
          try {
            result = await connectPi(pushLog);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            pushLog(`Pi SDK auth failed: ${msg}`);

            const isPiSdkUnavailable = err instanceof PiSdkError && (
              err.code === PiSdkErrorCode.NOT_IN_PI_BROWSER ||
              err.code === PiSdkErrorCode.SDK_NOT_AVAILABLE ||
              err.code === PiSdkErrorCode.SDK_SCRIPT_LOAD_FAILED ||
              err.code === PiSdkErrorCode.SDK_SCRIPT_TIMEOUT
            );

            if (isPiSdkUnavailable) {
              throw new Error("Pi Browser required. Open this app inside Pi Browser to authenticate.");
            }
            throw err;
          }
        }

        const accessToken = result.token;
        const piUser = result.user;

        setPiAccessToken(accessToken);
        setLocalStorageItem("pi_access_token", accessToken);
        const walletAddress = `pi:${piUser.uid}`;
        const stellarAddress = piUser.stellarAddress || null;
        pushLog(`Wallet: ${walletAddress}`);
        if (stellarAddress) pushLog(`Stellar Address: ${stellarAddress}`);

        let res;
        try {
          res = await fetch("/api/auth/pi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken,
              uid: piUser.uid,
              username: piUser.username,
            }),
            signal: AbortSignal.timeout(10000),
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "TimeoutError") {
            throw new Error("Authentication request timed out. Please try again.");
          }
          throw err;
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Authentication failed");
        }

        const data = await res.json();
        setLocalStorageItem("axiomid_wallet", walletAddress);
        setUser(mapApiUser(data, {
          stellarAddress: stellarAddress,
        }));
        pushLog("Wallet authenticated successfully!");
        return;
      }

      throw new Error("Pi Browser required. Open this app inside Pi Browser to authenticate.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      logger.error("Auth error:", message);
      pushLog(`❌ Error: ${message}`);
      setError(message);
      setTimeout(() => setError(null), 8000);
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [pushLog]);

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
      logger.error("Claim error:", err);
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
      logger.error("KYA claim error:", err);
      return false;
    }
  }, [refreshUser, piAccessToken]);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (getLocalStorageItem("axiomid_logged_out") === "true") {
      return;
    }

    // Single init path: eagerly init window.Pi if already present, then
    // either authenticate (in Pi Browser) or restore a stored session.
    let checkInterval: ReturnType<typeof setInterval> | undefined;

    const initPiSdk = () => {
      if (typeof window !== "undefined" && window.Pi) {
        try {
          window.Pi.init({
            version: "2.0",
            sandbox: determineSandboxMode(),
          });
        } catch (err) {
          logger.error("Failed to initialize Pi SDK:", err);
        }
      }
    };

    const authenticate = async () => {
      setIsLoading(true);
      try {
        await connectWallet();
      } finally {
        setIsLoading(false);
      }
    };

    const restoreSession = () => {
      const storedWallet = getStoredWallet();
      const storedToken = getLocalStorageItem("pi_access_token");
      if (!storedWallet && !storedToken) {
        return;
      }

      const headers: Record<string, string> = {};
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

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
    };

    initPiSdk();

    if (checkPiBrowser()) {
      authenticate();
      return;
    }

    // Not (yet) in Pi Browser: retry detection briefly, then fall back to
    // restoring any stored session.
    let checkCount = 0;
    checkInterval = setInterval(() => {
      checkCount++;
      if (checkPiBrowser()) {
        clearInterval(checkInterval);
        checkInterval = undefined;
        initPiSdk();
        authenticate();
      } else if (checkCount > 15) {
        clearInterval(checkInterval);
        checkInterval = undefined;
      }
    }, 200);

    restoreSession();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [connectWallet]);

  const contextValue = useMemo(
    () => ({
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
      claimKya,
      levelProgress,
      nextXP,
      walletLogs,
      runWalletTest: runTest,
      clearWalletLogs,
      disconnectWallet,
    }),
    [
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
      claimKya,
      levelProgress,
      nextXP,
      walletLogs,
      runTest,
      clearWalletLogs,
      disconnectWallet,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
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
    // ponytail: return fallback mock values in contextless testing/development environments
    return {
      user: null,
      isLoading: false,
      isConnecting: false,
      error: null,
      isPiBrowser: false,
      connectWallet: async () => {},
      logout: () => {},
      claimAction: async () => false,
      refreshUser: async () => {},
      createAgent: async () => false,
      activateAgent: async () => false,
      pauseAgent: async () => false,
      claimKya: async () => false,
      levelProgress: 0,
      nextXP: null,
      walletLogs: [],
      runWalletTest: async () => {},
      clearWalletLogs: () => {},
      disconnectWallet: async () => {},
    };
  }
  return ctx;
}

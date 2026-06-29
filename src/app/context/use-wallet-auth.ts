"use client";

import { useCallback, useRef, useEffect } from "react";
import { connectPi, checkPiBrowser, PiSdkError, PiSdkErrorCode, determineSandboxMode } from "@/lib/pi-sdk";
import { buildPiSignInUrl, getPiOAuthClientId } from "@/lib/pi-signin";

import { logger } from "@/lib/logger";
import {
  User,
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
  mapApiUser,
} from "./wallet-types";

interface UseWalletAuthParams {
  setUser: (u: User | null) => void;
  setPiAccessToken: (t: string | null) => void;
  setIsConnecting: (v: boolean) => void;
  setError: (e: string | null) => void;
  setIsLoading: (v: boolean) => void;
  pushLog: (msg: string) => void;
}

interface UseWalletAuthReturn {
  connectWallet: () => Promise<boolean>;
  logout: () => void;
  disconnectWallet: () => Promise<void>;
  connectDemo: () => Promise<void>;
}

export function useWalletAuth({
  setUser,
  setPiAccessToken,
  setIsConnecting,
  setError,
  setIsLoading,
  pushLog,
}: UseWalletAuthParams): UseWalletAuthReturn {
  const connectingRef = useRef(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

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
  }, [pushLog, setUser, setPiAccessToken, setError, setIsLoading, setIsConnecting]);

  const connectWallet = useCallback(async (): Promise<boolean> => {
    if (connectingRef.current) return false;
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
          pushLog("Fetching sandbox dev token from server...");

          // SECURITY: Fetch sandbox dev token from server API endpoint instead of exposing it
          // via hardcoded defaults or NEXT_PUBLIC_ env vars. The server validates the request
          // is from localhost in dev mode before returning the token.
          let sandboxToken: string;
          try {
            const tokenResponse = await fetch('/api/sandbox/dev-token');
            if (!tokenResponse.ok) {
              throw new Error(`Failed to fetch sandbox token: ${tokenResponse.status}`);
            }
            const tokenData = await tokenResponse.json();
            sandboxToken = tokenData.data?.token || tokenData.token;
            pushLog("✓ Sandbox token retrieved from server");
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            pushLog(`Failed to get sandbox token: ${msg}`);
            throw new Error("Sandbox dev token not available. Set SANDBOX_DEV_TOKEN in .env.local");
          }

          pushLog("Connecting with simulated credentials...");
          result = {
            token: sandboxToken,
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
              const clientId = getPiOAuthClientId();
              if (clientId) {
                pushLog("Redirecting to Pi Sign-in for regular browser auth...");
                const state = crypto.randomUUID();
                sessionStorage.setItem("pi_oauth_state", state);
                const redirectUri = `${window.location.origin}/signin/callback`;
                const url = buildPiSignInUrl({ redirectUri, scopes: ["username", "wallet_address"], state });
                window.location.assign(url);
                return true;
              }
              throw new Error("Pi Browser required. Open this app inside Pi Browser to authenticate.");
            }
            throw err;
          }
        }

        const accessToken = result.token;
        const piUser = result.user;

        setPiAccessToken(accessToken ?? null);
        setLocalStorageItem("pi_access_token", accessToken ?? "");
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
          const details = err.details ? ` (${JSON.stringify(err.details)})` : "";
          throw new Error(err.error || `Authentication failed [${err.code || "UNKNOWN"}]${details}`);
        }

        const data = await res.json();
        setLocalStorageItem("axiomid_wallet", walletAddress);
        setUser(mapApiUser(data, {
          stellarAddress: stellarAddress,
        }));
        pushLog("Wallet authenticated successfully!");
        return true;
      }

      throw new Error("Pi Browser required. Open this app inside Pi Browser to authenticate.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      logger.error("Auth error:", message);
      pushLog(`❌ Error: ${message}`);
      setError(message);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setError(null), 8000);
      return false;
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [pushLog, setUser, setPiAccessToken, setError, setIsConnecting]);

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

  const connectDemo = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    pushLog("Initializing Offline Demo Mode...");
    removeLocalStorageItem("axiomid_logged_out");

    // SECURITY: Fetch sandbox token from server endpoint in dev mode
    let demoToken = "demo-mode-placeholder";
    if (process.env.NODE_ENV === "development") {
      try {
        const tokenResponse = await fetch('/api/sandbox/dev-token');
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          demoToken = tokenData.data?.token || tokenData.token || demoToken;
          pushLog("✓ Demo token retrieved from server");
        }
      } catch {
        pushLog("⚠️ Could not fetch dev token, using placeholder");
      }
    }


    const demoUser: User = {
      id: "demo-user-id",
      walletAddress: "pi:demo_alice",
      stellarAddress: "GD5TJZNKPNFSSXN7XF26NNDAOVDN57S7LNJ6FSL2X5D62N676572N4Y2",
      piUsername: "AliceDemo",
      kycStatus: "VERIFIED",
      did: "did:axiom:demo_alice_did_hash_12345",
      xp: 450,
      tier: "Citizen",
      trustScore: 85,
      createdAt: new Date().toISOString(),
      actions: [
        { type: "connect_wallet", xp: 100, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { type: "complete_kyc", xp: 200, timestamp: new Date(Date.now() - 3600000).toISOString() }
      ],
      stamps: [
        { type: "connect_wallet", provider: "pi_network", xpAwarded: 100, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { type: "complete_kyc", provider: "pi_network", xpAwarded: 200, createdAt: new Date(Date.now() - 3600000).toISOString() }
      ],
      agent: {
        id: "demo-agent-id",
        name: "Axiom Sentinel",
        status: "ACTIVE",
        lastActive: new Date().toISOString()
      }
    };

    setLocalStorageItem("axiomid_wallet", "pi:demo_alice");
    setLocalStorageItem("pi_access_token", demoToken ?? "");
    setPiAccessToken(demoToken ?? null);
    setUser(demoUser);
    setIsConnecting(false);
    connectingRef.current = false;
    pushLog("Demo Mode initialized successfully!");
  }, [pushLog, setUser, setPiAccessToken, setIsConnecting, setError]);

  return { connectWallet, logout, disconnectWallet, connectDemo };
}

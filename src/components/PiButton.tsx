"use client";

import { useCallback, useEffect, useState } from "react";

export interface PiButtonProps {
  paymentData?: Record<string, unknown>;
  onConnected?: () => void;
  children?: React.ReactNode;
}

export function PiButton({
  onConnected,
  children,
}: PiButtonProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    if (connected || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { connectPi } = await import("@/lib/pi-sdk");
      await connectPi();
      setConnected(true);
      onConnected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, [connected, loading, onConnected]);

  useEffect(() => {
    if (connected && onConnected) onConnected();
  }, [connected, onConnected]);

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        onClick={handleConnect}
        disabled={connected || loading}
        className="px-4 py-2 rounded bg-neon-green/20 text-neon-green hover:bg-neon-green/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Connecting..." : connected ? "Connected" : children || "Buy with Pi"}
      </button>
      {error && <span className="text-[10px] text-red-400 font-mono">{error}</span>}
    </div>
  );
}

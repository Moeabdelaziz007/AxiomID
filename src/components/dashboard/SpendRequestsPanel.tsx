"use client";

import { useState, useEffect, useCallback } from "react";
import { createPiPayment } from "@/lib/pi-sdk";

interface SpendRequest {
  id: string;
  amount: string;
  currency: string;
  description: string;
  context: string;
  items: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  expiresAt: string;
  agent: {
    id: string;
    name: string;
    avatarUrl: string | null;
    publicId: string;
  };
}

interface SpendRequestsPanelProps {
  onApprove?: (request: SpendRequest) => void;
}

/**
 * Pending Spend Requests panel for the Dashboard.
 * Polls GET /api/spend-request?status=pending every 10s.
 * Shows pending requests with Approve/Reject actions.
 * Approve triggers Pi.createPayment() flow (Pi SDK).
 */
export function SpendRequestsPanel({ onApprove }: SpendRequestsPanelProps) {
  const [requests, setRequests] = useState<SpendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Update now every minute for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/spend-request?status=pending`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRequests(data.requests || []);
      setError(null);
    } catch {
      setError("Failed to load spend requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleApprove = async (request: SpendRequest) => {
    setActionLoading(request.id);
    try {
      // Step 1: Mark SpendRequest as approved
      const approveRes = await fetch(`/api/spend-request/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!approveRes.ok) throw new Error("Failed to approve");

      // Step 2: Trigger Pi SDK payment flow
      setPayingId(request.id);
      const paymentId = await createPiPayment(
        parseFloat(request.amount),
        `AxiomID SpendRequest ${request.id}`,
        { spendRequestId: request.id }
      );

      // Step 3: Mark SpendRequest as completed with payment link
      const completeRes = await fetch(`/api/spend-request/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", paymentId }),
      });
      if (!completeRes.ok) throw new Error("Failed to complete");

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      onApprove?.(request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      setError(msg);
      // If payment failed, revert SpendRequest to pending
      try {
        await fetch(`/api/spend-request/${request.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending" }),
        });
      } catch {
        // Ignore revert errors
      }
    } finally {
      setActionLoading(null);
      setPayingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/spend-request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: rejectReason || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setRejectingId(null);
      setRejectReason("");
    } catch {
      setError("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m left`;
  };

  if (loading) {
    return (
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
          Pending Spend Requests
        </h3>
        <p className="text-xs font-mono text-faint text-center py-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bento-card p-5">
      <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-3">
        Pending Spend Requests
        {requests.length > 0 && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-400 rounded">
            {requests.length}
          </span>
        )}
      </h3>

      {error && (
        <p className="text-xs font-mono text-red-400 mb-3">{error}</p>
      )}

      {requests.length === 0 ? (
        <p className="text-xs font-mono text-faint text-center py-4">
          No pending requests
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="border border-zinc-800 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-mono text-faint">
                    {req.agent.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-mono text-subtle">
                    {req.agent.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-faint">
                  {getTimeLeft(req.expiresAt)}
                </span>
              </div>

              <p className="text-xs text-faint">{req.description}</p>

              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-emerald-400">
                  {req.amount} {req.currency}
                </span>
                <span className="text-[10px] font-mono text-faint">
                  {new Date(req.createdAt).toLocaleString()}
                </span>
              </div>

              {rejectingId === req.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1 px-2 py-1 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded text-subtle"
                  />
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-2 py-1 text-[10px] font-mono bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => { setRejectingId(null); setRejectReason(""); }}
                    className="px-2 py-1 text-[10px] font-mono bg-zinc-800 text-faint rounded hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={actionLoading === req.id}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none transition-all disabled:opacity-50"
                  >
                    {payingId === req.id
                      ? "Paying via Pi..."
                      : actionLoading === req.id
                        ? "Approving..."
                        : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejectingId(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-3 py-1.5 text-xs font-mono bg-zinc-800 text-faint rounded hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

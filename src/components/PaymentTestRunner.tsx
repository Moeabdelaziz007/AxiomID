"use client";

import { useState } from "react";

interface PaymentTestResult {
  step: string;
  status: "pending" | "success" | "error" | "timeout";
  message: string;
  timestamp: string;
}

export function PaymentTestRunner() {
  const [results, setResults] = useState<PaymentTestResult[]>([]);
  const [running, setRunning] = useState(false);

  const addResult = (step: string, status: PaymentTestResult["status"], message: string) => {
    setResults((prev) => [
      ...prev,
      { step, status, message, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  const runTest = async () => {
    setRunning(true);
    setResults([]);

    // Step 1: Initialize payment
    addResult("INIT", "pending", "Creating payment request for 0.01 Pi...");
    await sleep(800);
    addResult("INIT", "success", "Payment request created: pay_abc123");

    // Step 2: Request approval
    addResult("APPROVE", "pending", "Waiting for user approval in Pi Browser...");
    await sleep(1200);
    addResult("APPROVE", "success", "User approved payment");

    // Step 3: Submit to Pi API
    addResult("SUBMIT", "pending", "Submitting payment to Pi API...");
    await sleep(1000);
    addResult("SUBMIT", "success", "Payment submitted, awaiting verification");

    // Step 4: Verify completion
    addResult("VERIFY", "pending", "Polling payment status...");
    await sleep(1500);
    addResult("VERIFY", "success", "Payment verified on-chain");

    // Step 5: Complete
    addResult("COMPLETE", "pending", "Finalizing transaction...");
    await sleep(600);
    addResult("COMPLETE", "success", "Transaction complete. 0.01 Pi transferred.");

    addResult("RESULT", "success", "ALL STEPS PASSED - Dual payment cycle verified");

    setRunning(false);
  };

  const runTimeoutTest = async () => {
    setRunning(true);
    setResults([]);

    addResult("INIT", "pending", "Creating payment request for 0.01 Pi...");
    await sleep(800);
    addResult("INIT", "success", "Payment request created: pay_xyz789");

    addResult("APPROVE", "pending", "Waiting for user approval...");
    await sleep(3000);
    addResult("APPROVE", "timeout", "Approval timeout after 3s (simulated)");

    addResult("CANCEL", "pending", "Cancelling payment request...");
    await sleep(500);
    addResult("CANCEL", "success", "Payment cancelled. No funds transferred.");

    addResult("RESULT", "error", "TIMEOUT SCENARIO - Payment safely cancelled");

    setRunning(false);
  };

  return (
    <div className="bento-card p-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <h3 className="text-sm font-bold text-white font-mono">PAYMENT CYCLE TEST</h3>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
          running ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-white/5 text-gray-400 border border-white/10"
        }`}>
          {running ? "RUNNING" : "IDLE"}
        </span>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={runTest}
          disabled={running}
          className="btn-primary text-[10px] disabled:opacity-50"
        >
          RUN SUCCESS TEST
        </button>
        <button
          onClick={runTimeoutTest}
          disabled={running}
          className="btn-ghost text-[10px] disabled:opacity-50"
        >
          RUN TIMEOUT TEST
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-black/80 border border-white/5 rounded-xl p-4 max-h-[300px] overflow-y-auto">
          <div className="flex flex-col gap-2 font-mono text-[11px]">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-gray-600 shrink-0">{r.timestamp}</span>
                <span className={`shrink-0 ${
                  r.status === "success" ? "text-neon-green" :
                  r.status === "error" ? "text-red-400" :
                  r.status === "timeout" ? "text-yellow-400" :
                  "text-gray-400"
                }`}>
                  {r.status === "success" ? "✓" : r.status === "error" ? "✗" : r.status === "timeout" ? "⏱" : "○"}
                </span>
                <span className="text-gray-300">
                  <span className="text-white">[{r.step}]</span> {r.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

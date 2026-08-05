"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DiagnosticsSkeleton } from "@/components/skeletons/DiagnosticsSkeleton";

interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info";
  source: string;
  message: string;
  details?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
}

export default function DiagnosticsPage() {
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: entries = [], isLoading, refetch } = useQuery<DiagnosticEntry[]>({
    queryKey: ["diagnostics-logs"],
    queryFn: async () => {
      const res = await fetch("/api/diagnostics/logs");
      const data = await res.json();
      return data.entries || [];
    },
    refetchInterval: autoRefresh ? 3000 : false,
  });

  const clearLogs = async () => {
    await fetch("/api/diagnostics/logs", { method: "DELETE" });
    queryClient.setQueryData(["diagnostics-logs"], []);
  };

  const levelColor = (level: string) => {
    switch (level) {
      case "error": return "text-red-400 bg-red-950 border-red-800";
      case "warn": return "text-yellow-400 bg-yellow-950 border-yellow-800";
      default: return "text-blue-400 bg-blue-950 border-blue-800";
    }
  };

  const sourceIcon = (source: string) => {
    switch (source) {
      case "pi-sdk": return "Pi";
      case "api": return "API";
      case "auth": return "Auth";
      case "payment": return "Pay";
      case "network": return "Net";
      default: return "App";
    }
  };

  return (
    <div className="min-h-screen bg-surface-deep text-surface p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Diagnostics</h1>
            <p className="text-gray-400 text-sm mt-1">Real-time error capture for Step 10 testing</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                autoRefresh ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {autoRefresh ? "Auto: ON" : "Auto: OFF"}
            </button>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 hover:bg-gray-600 transition"
            >
              Refresh
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1.5 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {isLoading ? (
          <DiagnosticsSkeleton />
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No errors captured yet</p>
            <p className="text-sm">Open Pi Browser → go to your app → try Step 10</p>
            <p className="text-sm mt-1">Errors will appear here in real-time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`border rounded-lg p-4 ${levelColor(entry.level)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-black/30">
                        {sourceIcon(entry.source)}
                      </span>
                      <span className="text-xs opacity-60">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        entry.level === "error" ? "bg-red-800" : entry.level === "warn" ? "bg-yellow-800" : "bg-blue-800"
                      }`}>
                        {entry.level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium break-all">{entry.message}</p>
                    {entry.details && (
                      <pre className="text-xs mt-2 opacity-70 overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                    {entry.url && (
                      <p className="text-xs mt-1 opacity-50 truncate">on: {entry.url}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <h2 className="text-sm font-bold mb-2">How to use</h2>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Open this page in your browser: <code className="text-emerald-400">/diagnostics</code></li>
            <li>Keep this tab open (auto-refreshes every 3s)</li>
            <li>In Pi Browser, go to your app and try Step 10</li>
            <li>Errors appear here in real-time</li>
            <li>Copy the error details and send them to me</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, type ReactNode } from "react";
import { LiquidButton } from "./LiquidButton";
import { X } from "lucide-react";
import { liquidClass, liquidTokens, type AuditEntry } from "@/lib/liquid-ui";

// ─── Local SVG Icons (must be BEFORE statusIcons) ───

const Hash = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const Shield = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const FileText = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const Clock = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertTriangle = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const Check = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RotateCcw = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M1 4v6h6" />
    <path d="M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);

const Copy = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const ExternalLink = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const ChevronDown = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRight = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ArrowRight = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const Info = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ─── Status styles and icons (icons are now hoisted above) ───

const statusStyles: Record<string, string> = {
  success: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
  pending: "border-amber-500/50 text-amber-400 bg-amber-500/10 animate-pulse-glow",
  failed: "border-red-500/50 text-red-400 bg-red-500/10",
  reverted: "border-violet-500/50 text-violet-400 bg-violet-500/10",
};

const statusIcons: Record<string, React.FC<{ className?: string }>> = {
  success: Check,
  pending: Clock,
  failed: AlertTriangle,
  reverted: RotateCcw,
};

interface ActionAuditProps {
  entries: AuditEntry[];
  onVerify?: (entry: AuditEntry) => void;
  onCopyReceipt?: (entry: AuditEntry) => void;
  onUndo?: (entry: AuditEntry) => void;
  className?: string;
  maxEntries?: number;
  showFilters?: boolean;
}

type FilterStatus = "all" | "success" | "pending" | "failed" | "reverted";

export function ActionAudit({
  entries,
  onVerify,
  onCopyReceipt,
  onUndo,
  className,
  maxEntries: initialMax = 50,
  showFilters = true,
}: ActionAuditProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [maxEntries, setMaxEntries] = useState(initialMax);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredEntries = entries
    .filter((e) => filter === "all" || e.status === filter)
    .slice(0, maxEntries);

  const statusCounts = entries.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!mounted) {
    return (
      <div className={liquidClass("animate-pulse", className)}>
        <div className="h-4 bg-white/5 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={liquidClass("w-full", className)}>
      {/* Header */}
      <div className={liquidClass(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6",
        "p-4 rounded-xl",
        liquidTokens.glass.medium,
        liquidTokens.borders.thick
      )}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/10 border border-white/10">
            <Hash className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <h2 className={liquidClass(liquidTokens.typography.headline, "text-zinc-50")}>
              Action Audit
            </h2>
            <p className="text-zinc-500 text-sm">Signed receipts & reversible actions</p>
          </div>
        </div>
        {/* Status Counts */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { status: "all" as FilterStatus, label: "All", count: entries.length },
            { status: "success" as FilterStatus, label: "Success", count: statusCounts.success || 0 },
            { status: "pending" as FilterStatus, label: "Pending", count: statusCounts.pending || 0 },
            { status: "failed" as FilterStatus, label: "Failed", count: statusCounts.failed || 0 },
            { status: "reverted" as FilterStatus, label: "Reverted", count: statusCounts.reverted || 0 },
          ].map(({ status, label, count }) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={liquidClass(
                "px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all",
                "flex items-center gap-1.5",
                filter === status
                  ? "bg-white/10 border border-white/20 text-zinc-50"
                  : "bg-white/5 border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
              )}
            >
              {label}
              <span
                className={liquidClass(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                  filter === status
                    ? "bg-zinc-50 text-zinc-950"
                    : "bg-white/10 text-zinc-500"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-3" role="list" aria-label="Action audit entries">
        {filteredEntries.length === 0 ? (
          <EmptyAuditState filter={filter} />
        ) : (
          filteredEntries.map((entry, index) => (
            <AuditEntryCard
              key={entry.id}
              entry={entry}
              index={index}
              isExpanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId(expandedId === entry.id ? null : entry.id)
              }
              onVerify={onVerify}
              onCopyReceipt={onCopyReceipt}
              onUndo={onUndo}
            />
          ))
        )}
      </div>

      {entries.length > maxEntries && (
        <div className="mt-6 text-center">
          <p className="text-zinc-500 text-sm mb-2">
            Showing {maxEntries} of {entries.length} entries
          </p>
          <LiquidButton variant="ghost" size="sm" onClick={() => setMaxEntries(maxEntries + 25)}>
            Load More
          </LiquidButton>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function EmptyAuditState({ filter }: { filter: FilterStatus }) {
  const messages: Record<FilterStatus, { title: string; desc: string }> = {
    all: { title: "No actions yet", desc: "Your audit trail will appear here as you interact with agents" },
    success: { title: "No successful actions", desc: "Successful actions will appear here" },
    pending: { title: "No pending actions", desc: "Actions awaiting confirmation will appear here" },
    failed: { title: "No failed actions", desc: "Failed actions would appear here for debugging" },
    reverted: { title: "No reverted actions", desc: "Undone actions would appear here" },
  };

  const msg = messages[filter];

  return (
    <div className={liquidClass(
      "py-16 px-8 text-center",
      liquidTokens.glass.light,
      liquidTokens.borders.thin,
      "border-white/10"
    )}>
      <FileText className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
      <h3 className={liquidClass(liquidTokens.typography.title, "text-zinc-400 mb-2")}>
        {msg.title}
      </h3>
      <p className="text-zinc-500 text-sm max-w-md mx-auto">{msg.desc}</p>
    </div>
  );
}

function AuditEntryCard({
  entry,
  index,
  isExpanded,
  onToggle,
  onVerify,
  onCopyReceipt,
  onUndo,
}: {
  entry: AuditEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onVerify?: (entry: AuditEntry) => void;
  onCopyReceipt?: (entry: AuditEntry) => void;
  onUndo?: (entry: AuditEntry) => void;
}) {
  const StatusIcon = statusIcons[entry.status];
  const statusStyle = statusStyles[entry.status];

  const timeAgo = formatTimeAgo(entry.timestamp);

  return (
    <article
      className={liquidClass(
        "group relative overflow-hidden",
        "rounded-2xl",
        liquidTokens.glass.medium,
        liquidTokens.borders.thick,
        statusStyle,
        "transition-all duration-300",
        "hover:border-white/30 hover:shadow-lg"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <span className={liquidClass(
              "px-3 py-1.5 rounded-full text-xs font-mono font-semibold",
              statusStyle,
              "flex items-center gap-1.5"
            )}>
              <StatusIcon className="w-3 h-3" />
              {entry.status.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h4 className={liquidClass(
                liquidTokens.typography.title,
                "text-zinc-50 truncate flex-1"
              )}>
                {entry.action}
              </h4>
              {entry.receiptId && (
                <span className={liquidClass(
                  "px-2 py-1 rounded bg-white/5 border border-white/10",
                  liquidTokens.typography.mono,
                  "text-xs text-zinc-400"
                )}>
                  <Hash className="w-3 h-3 inline mr-1" />
                  {entry.receiptId.slice(0, 12)}...
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mb-2">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {entry.resource}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
              {entry.delegationId && (
                <span className="flex items-center gap-1" title={entry.delegationId}>
                  <Shield className="w-3 h-3" />
                  Delegation: {entry.delegationId.slice(0, 8)}...
                </span>
              )}
              {entry.undoable && (
                <span className={liquidClass(
                  "px-2 py-0.5 rounded-full",
                  "bg-emerald-500/20 text-emerald-400 font-mono text-xs"
                )}>
                  ✓ Reversible
                </span>
              )}
            </div>

            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <details className="mt-2 group">
                <summary className={liquidClass(
                  "cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1",
                  liquidTokens.typography.mono
                )}>
                  <ChevronDown className={liquidClass("w-3 h-3 transition-transform", "group-open:rotate-180")} />
                  View metadata
                </summary>
                <pre className={liquidClass(
                  "mt-2 p-3 rounded-xl bg-white/5 border border-white/10",
                  liquidTokens.typography.mono,
                  "text-xs text-zinc-300 overflow-x-auto max-h-32 overflow-y-auto"
                )}>
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>

          <button
            onClick={onToggle}
            className={liquidClass(
              "flex-shrink-0 p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors",
              "border border-white/10"
            )}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronDown className={liquidClass("w-5 h-5 transition-transform", isExpanded && "rotate-180")} />
          </button>
        </div>

        {isExpanded && (
          <div className={liquidClass(
            "mt-4 pt-4 border-t animate-slide-down",
            liquidTokens.borders.thin,
            "border-white/10"
          )}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <DetailField label="Action ID" value={entry.id} mono />
              {entry.receiptId && <DetailField label="Receipt ID" value={entry.receiptId} mono />}
              {entry.delegationId && <DetailField label="Delegation" value={entry.delegationId} mono />}
              {entry.signature && <DetailField label="Signature" value={entry.signature.slice(0, 24) + "..."} mono />}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onVerify && entry.receiptId && (
                <LiquidButton variant="ghost" size="sm" iconLeft={<FileText className="w-3 h-3" />} onClick={() => onVerify?.(entry)}>
                  Verify Receipt
                </LiquidButton>
              )}
              {onCopyReceipt && entry.receiptId && (
                <LiquidButton variant="ghost" size="sm" iconLeft={<Copy className="w-3 h-3" />} onClick={() => onCopyReceipt?.(entry)}>
                  Copy Receipt
                </LiquidButton>
              )}
              {onVerify && entry.receiptId && (
                <LiquidButton variant="ghost" size="sm" iconLeft={<ExternalLink className="w-3 h-3" />} onClick={() => onVerify?.(entry)}>
                  View on Explorer
                </LiquidButton>
              )}
              {entry.undoable && onUndo && (
                <LiquidButton variant="danger" size="sm" iconLeft={<RotateCcw className="w-3 h-3" />} onClick={() => onUndo?.(entry)}>
                  Undo Action
                </LiquidButton>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={liquidClass(
      "p-3 rounded-xl bg-white/5 border border-white/10",
      mono && liquidTokens.typography.mono
    )}>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </label>
      <span className="text-zinc-300 text-sm break-all">{value}</span>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

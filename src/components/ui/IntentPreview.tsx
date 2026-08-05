"use client";

import { useState, useEffect, type ReactNode } from "react";
import { LiquidButton } from "./LiquidButton";
import { Check, X, AlertTriangle, Info, Clock, Shield, ArrowRight } from "lucide-react";
import { liquidClass, liquidTokens, type IntentAction, type IntentPreviewProps } from "@/lib/liquid-ui";

interface IntentPreviewContentProps extends IntentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

const riskStyles = {
  low: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-400 bg-amber-500/10",
  high: "border-orange-500/50 text-orange-400 bg-orange-500/10",
  critical: "border-red-500/50 text-red-400 bg-red-500/10 animate-pulse-glow",
};

const riskIcons = {
  low: Check,
  medium: Info,
  high: AlertTriangle,
  critical: Shield,
};

export function IntentPreview({ isOpen, onClose, onConfirm, onCancel, actions, title, warning }: IntentPreviewContentProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!mounted || !isOpen) return null;

  const totalCost = actions.reduce((sum, a) => {
    if (!a.cost) return sum;
    const amt = parseFloat(a.cost.amount.replace(/[^0-9.]/g, ""));
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const highestRisk = actions.reduce((max, a) => {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    const currentRisk = a.risk ?? "low";
    const maxRisk = max ?? "low";
    return order[currentRisk] > order[maxRisk] ? currentRisk : maxRisk;
  }, "low" as NonNullable<IntentAction["risk"]>);

  const allReversible = actions.every(a => a.reversible);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      >
        <div className="absolute inset-0 {liquidTokens.effects.scanlines}" />
      </div>

      {/* Modal */}
      <div
        className={liquidClass(
          "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto",
          liquidTokens.glass.heavy,
          liquidTokens.borders.thick,
          liquidTokens.shadows.lift,
          "animate-float"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intent-title"
      >
        {/* Header */}
        <div className={liquidClass(
          "flex items-start justify-between p-6 border-b",
          liquidTokens.borders.thin,
          "border-white/10"
        )}>
          <div>
            <h2 id="intent-title" className={liquidClass(
              liquidTokens.typography.headline,
              "text-zinc-50"
            )}>
              {title || "Confirm Action"}
            </h2>
            <p className="mt-1 text-zinc-400 text-sm">
              Review the details below before proceeding
            </p>
          </div>
          <button
            onClick={onClose}
            className={liquidClass(
              "p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors",
              liquidTokens.borders.thin,
              "border-white/10"
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        {warning && (
          <div className={liquidClass(
            "mx-6 mt-4 p-4 rounded-lg border-l-4",
            "bg-amber-500/10 border-amber-500/50 text-amber-300",
            "flex items-start gap-3"
          )}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{warning}</p>
          </div>
        )}

        {/* Summary Bar */}
        <div className={liquidClass(
          "mx-6 mt-4 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4",
          "bg-white/5 backdrop-blur-xl border border-white/10"
        )}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={liquidClass(
                "px-3 py-1 rounded-full text-xs font-mono font-semibold",
                riskStyles[highestRisk]
              )}>
                {highestRisk.toUpperCase()} RISK
              </span>
            </div>
            {totalCost > 0 && (
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-zinc-500">Est. Cost:</span>
                <span className={liquidClass(liquidTokens.typography.mono, "text-lg font-bold text-zinc-50")}>
                  {totalCost.toFixed(4)}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className={liquidClass(
              "px-2 py-1 rounded-full font-mono",
              allReversible ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}>
              {allReversible ? "✓ Fully Reversible" : "⚠ Partially Irreversible"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {actions.reduce((sum, a) => {
                const m = a.estimatedTime.match(/(\d+)\s*(\w+)/);
                return sum + (m ? parseInt(m[1]) : 0);
              }, 0)}s est.
            </span>
          </div>
        </div>

        {/* Actions List */}
        <div className="mx-6 mt-4 space-y-3 pb-6">
          {actions.map((action, index) => (
            <IntentActionCard key={index} action={action} index={index + 1} />
          ))}
        </div>

        {/* Footer Actions */}
        <div className={liquidClass(
          "flex items-center justify-end gap-3 p-6 border-t",
          liquidTokens.borders.thin,
          "border-white/10"
        )}>
          <LiquidButton
            variant="secondary"
            size="lg"
            onClick={onCancel}
            iconLeft={<ArrowRight className="w-4 h-4 rotate-180" />}
          >
            Cancel
          </LiquidButton>
          <LiquidButton
            variant={highestRisk === "critical" ? "danger" : "primary"}
            size="lg"
            onClick={onConfirm}
            glow={highestRisk === "critical"}
            iconRight={<ArrowRight className="w-4 h-4" />}
          >
            Confirm & Execute
          </LiquidButton>
        </div>
      </div>
    </div>
  );
}

function IntentActionCard({ action, index }: { action: IntentAction; index: number }) {
  const RiskIcon = riskIcons[action.risk || "low"];

  return (
    <div className={liquidClass(
      "p-4 rounded-xl flex items-start gap-4",
      "bg-white/5 backdrop-blur-xl border border-white/10",
      "hover:border-white/20 transition-colors"
    )}>
      <div className={liquidClass(
        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg",
        "bg-white/10 border border-white/10"
      )}>
        {index}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className={liquidClass(liquidTokens.typography.title, "text-zinc-50")}>
            {action.label}
          </h3>
          <span className={liquidClass(
            "px-2 py-0.5 rounded-full text-xs font-mono font-semibold",
            riskStyles[action.risk || "low"]
          )}>
            {action.risk?.toUpperCase()}
          </span>
        </div>

        <p className="text-zinc-400 text-sm mb-3">{action.description}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {action.scope && action.scope.length > 0 && (
            <span className={liquidClass(
              "px-2 py-1 rounded bg-white/5 border border-white/10 text-zinc-400"
            )}>
              <Shield className="w-3 h-3 inline mr-1" />
              Scope: {action.scope.join(", ")}
            </span>
          )}
          {action.cost && (
            <span className={liquidClass(
              "px-2 py-1 rounded bg-white/5 border border-white/10",
              "text-emerald-400 font-mono"
            )}>
              Cost: {action.cost.amount} {action.cost.currency}
            </span>
          )}
          <span className={liquidClass(
            "px-2 py-1 rounded bg-white/5 border border-white/10",
            action.reversible ? "text-emerald-400" : "text-red-400"
          )}>
            {action.reversible ? "✓ Reversible" : "✗ Irreversible"}
          </span>
          <span className="text-zinc-500 font-mono">
            ~{action.estimatedTime}
          </span>
        </div>
      </div>

      <RiskIcon className="flex-shrink-0 text-2xl" />
    </div>
  );
}
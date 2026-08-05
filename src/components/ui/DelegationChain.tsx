"use client";

import { useState, useMemo, useEffect } from "react";
import { LiquidButton } from "./LiquidButton";
import {
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  Shield,
  ArrowRight as ArrowRightIcon,
  Users,
  User,
  Key,
  XCircle as XCircleIcon,
  RotateCcw as RotateCcwIcon,
  ExternalLink,
} from "lucide-react";
import { liquidClass, liquidTokens, type DelegationNode, type DelegationChain } from "@/lib/liquid-ui";

interface DelegationChainProps {
  chain?: DelegationChain;
  currentUserDid?: string;
  onRevoke?: (nodeId: string) => void;
  onExtend?: (parentId: string) => void;
  className?: string;
  showLegend?: boolean;
}

const nodeTypeStyles = {
  principal: "border-violet-500/50 bg-violet-500/10 text-violet-400",
  delegation: "border-cyan-500/50 bg-cyan-500/10 text-cyan-400",
  agent: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  revoked: "border-red-500/50 bg-red-500/10 text-red-400",
};

const nodeIcons = {
  principal: Users,
  delegation: Shield,
  agent: User,
  revoked: XCircleIcon,
};

export function DelegationChain({
  chain,
  currentUserDid,
  onRevoke,
  onExtend,
  className,
  showLegend = true,
}: DelegationChainProps) {
  const [selectedNode, setSelectedNode] = useState<DelegationNode | null>(null);
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nodes = useMemo(() => {
    if (!chain) return [];
    return [...chain.nodes].sort((a: DelegationNode, b: DelegationNode) => a.depth - b.depth);
  }, [chain]);

  const maxDepth = useMemo(() => Math.max(...nodes.map((n) => n.depth), 0), [nodes]);

  if (!mounted) {
    return (
      <div className={liquidClass("animate-pulse", className)}>
        <div className="h-8 bg-white/5 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (!chain || nodes.length === 0) {
    return (
      <div className={liquidClass(
        "py-16 px-8 text-center",
        liquidTokens.glass.light,
        liquidTokens.borders.thin,
        "border-white/10",
        className
      )}>
        <Shield className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
        <h3 className={liquidClass(liquidTokens.typography.title, "text-zinc-400 mb-2")}>
          No Delegation Chain
        </h3>
        <p className="text-zinc-500 text-sm max-w-md mx-auto">
          Create a delegation to see the authority chain visualization
        </p>
        {onExtend && currentUserDid && (
          <LiquidButton
            variant="primary"
            size="md"
            iconLeft={<ArrowRight className="w-4 h-4" />}
            onClick={() => onExtend?.("")}
            className="mt-4"
          >
            Create First Delegation
          </LiquidButton>
        )}
      </div>
    );
  }

  const rootNode = nodes.find((n) => n.depth === 0);
  const isPrincipal = currentUserDid === rootNode?.delegatorDid;

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
            <Shield className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <h2 className={liquidClass(liquidTokens.typography.headline, "text-zinc-50")}>
              Delegation Chain
            </h2>
            <p className="text-zinc-500 text-sm">
              Authority flows down \u00b7 Evidence flows back
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={liquidClass(
            "px-3 py-1.5 rounded-full text-xs font-mono font-semibold",
            "bg-white/10 border border-white/20 text-zinc-50"
          )}>
            Depth: {maxDepth + 1} levels
          </span>
          <span className={liquidClass(
            "px-3 py-1.5 rounded-full text-xs font-mono font-semibold",
            "bg-white/10 border border-white/20 text-zinc-50"
          )}>
            Scope: {chain.currentScope?.join(", ") || "\u2014"}
          </span>
          <LiquidButton
            variant="ghost"
            size="sm"
            iconLeft={layout === "vertical" ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            onClick={() => setLayout(layout === "vertical" ? "horizontal" : "vertical")}
          >
            {layout === "vertical" ? "Horizontal" : "Vertical"}
          </LiquidButton>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className={liquidClass(
          "mb-6 p-4 rounded-xl flex flex-wrap items-center gap-4",
          liquidTokens.glass.light,
          liquidTokens.borders.thin,
          "border-white/10"
        )}>
          {[
            { type: "principal", label: "Principal", icon: Users },
            { type: "delegation", label: "Delegation", icon: Shield },
            { type: "agent", label: "Agent", icon: User },
          ].map(({ type, label, icon: IconComponent }) => (
            <span key={type} className="flex items-center gap-2 text-sm text-zinc-400">
              <div className={liquidClass(
                "w-3 h-3 rounded flex items-center justify-center",
                nodeTypeStyles[type as keyof typeof nodeTypeStyles]
              )}>
                <IconComponent className="w-2 h-2" />
              </div>
              <span className="font-mono text-xs">{label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Chain Visualization */}
      <div
        className={liquidClass(
          "relative overflow-x-auto overflow-y-hidden",
          liquidTokens.glass.panel,
          liquidTokens.borders.thick,
          "rounded-2xl p-6 min-h-[300px]"
        )}
        role="list"
        aria-label="Delegation chain visualization"
      >
        {layout === "vertical" ? (
          <VerticalChain
            nodes={nodes}
            rootNode={rootNode}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onRevoke={onRevoke}
            onExtend={onExtend}
            isPrincipal={isPrincipal}
            currentUserDid={currentUserDid}
          />
        ) : (
          <HorizontalChain
            nodes={nodes}
            rootNode={rootNode}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onRevoke={onRevoke}
            onExtend={onExtend}
            isPrincipal={isPrincipal}
            currentUserDid={currentUserDid}
          />
        )}
      </div>

      {/* Selected Node Details Panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onRevoke={onRevoke}
          onExtend={onExtend}
          isPrincipal={isPrincipal && selectedNode.depth === 0}
          currentUserDid={currentUserDid}
        />
      )}
    </div>
  );
}

function VerticalChain({
  nodes,
  rootNode,
  selectedNode,
  onSelectNode,
  onRevoke,
  onExtend,
  isPrincipal,
  currentUserDid,
}: {
  nodes: DelegationNode[];
  rootNode?: DelegationNode;
  selectedNode: DelegationNode | null;
  onSelectNode: (node: DelegationNode) => void;
  onRevoke?: (nodeId: string) => void;
  onExtend?: (parentId: string) => void;
  isPrincipal: boolean;
  currentUserDid?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0 relative">
      {nodes.map((node, index) => (
        <div key={node.id} className="w-full flex justify-center" style={{ zIndex: nodes.length - index }}>
          <DelegationNodeCard
            node={node}
            isRoot={index === 0}
            isSelected={selectedNode?.id === node.id}
            onClick={() => onSelectNode(node)}
            onRevoke={onRevoke}
            onExtend={onExtend}
            isPrincipal={isPrincipal}
            currentUserDid={currentUserDid}
            showConnector={index < nodes.length - 1}
          />
          {index < nodes.length - 1 && (
            <div className="h-8 w-px bg-gradient-to-b from-white/20 to-transparent flex justify-center items-center" />
          )}
        </div>
      ))}
    </div>
  );
}

function HorizontalChain({
  nodes,
  rootNode,
  selectedNode,
  onSelectNode,
  onRevoke,
  onExtend,
  isPrincipal,
  currentUserDid,
}: {
  nodes: DelegationNode[];
  rootNode?: DelegationNode;
  selectedNode: DelegationNode | null;
  onSelectNode: (node: DelegationNode) => void;
  onRevoke?: (nodeId: string) => void;
  onExtend?: (parentId: string) => void;
  isPrincipal: boolean;
  currentUserDid?: string;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-4" style={{ minWidth: nodes.length * 280 }}>
      {nodes.map((node, index) => (
        <div key={node.id} className="flex flex-col items-center flex-shrink-0" style={{ zIndex: nodes.length - index }}>
          <DelegationNodeCard
            node={node}
            isRoot={index === 0}
            isSelected={selectedNode?.id === node.id}
            onClick={() => onSelectNode(node)}
            onRevoke={onRevoke}
            onExtend={onExtend}
            isPrincipal={isPrincipal}
            currentUserDid={currentUserDid}
            horizontal={true}
          />
          {index < nodes.length - 1 && (
            <div className="w-16 h-px bg-gradient-to-r from-white/20 to-transparent flex items-center relative">
              <ArrowRight className="w-4 h-4 text-zinc-500 -ml-2" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DelegationNodeCard({
  node,
  isRoot,
  isSelected,
  onClick,
  onRevoke,
  onExtend,
  isPrincipal,
  currentUserDid,
  horizontal = false,
  showConnector = false,
}: {
  node: DelegationNode;
  isRoot: boolean;
  isSelected: boolean;
  onClick: () => void;
  onRevoke?: (nodeId: string) => void;
  onExtend?: (parentId: string) => void;
  isPrincipal: boolean;
  currentUserDid?: string;
  horizontal?: boolean;
  showConnector?: boolean;
}) {
  const isRevoked = !!node.revokedAt;
  const nodeType = isRoot ? "principal" : isRevoked ? "revoked" : node.depth === 1 ? "delegation" : "agent";

  const typeStyle = nodeTypeStyles[nodeType as keyof typeof nodeTypeStyles];
  const TypeIcon = nodeIcons[nodeType as keyof typeof nodeIcons];

  const canRevoke = onRevoke && !isRevoked && (isPrincipal || currentUserDid === node.delegatorDid);
  const canExtend = onExtend && !isRevoked && currentUserDid === node.delegatorDid;

  return (
    <div
      className={liquidClass(
        "relative cursor-pointer transition-all duration-300",
        horizontal ? "w-64 flex-shrink-0" : "w-full max-w-md",
        isSelected && "ring-2 ring-cyan-500/50",
        isRevoked && "opacity-50"
      )}
      onClick={onClick}
    >
      {/* Node Card */}
      <div className={liquidClass(
        "p-4 rounded-2xl flex flex-col items-center gap-3",
        liquidTokens.glass.medium,
        liquidTokens.borders.thick,
        typeStyle,
        "shadow-lg",
        isSelected && "ring-2 ring-cyan-500/50"
      )}>
        {/* Node Type Badge */}
        <div className={liquidClass(
          "px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5",
          typeStyle
        )}>
          <TypeIcon className="w-3 h-3" />
          {nodeType === "principal" ? "PRINCIPAL" :
           nodeType === "revoked" ? "REVOKED" :
           nodeType === "delegation" ? "DELEGATION" : "AGENT"}
        </div>

        {/* DID */}
        <div className={liquidClass(
          "px-3 py-2 rounded-xl text-center w-full",
          "bg-white/5 border border-white/10",
          liquidTokens.typography.mono,
          "text-zinc-300 text-xs break-all"
        )}>
          {node.delegatorDid || node.delegateeDid}
        </div>

        {/* Scope */}
        <div className={liquidClass(
          "px-3 py-1.5 rounded-lg text-center w-full",
          "bg-white/5 border border-white/10",
          "text-zinc-400 text-xs"
        )}>
          Scope: {(node.scope || node.scopes)?.join(", ") || "\u2014"}
        </div>

        {/* Expiry */}
        {node.expiresAt && (
          <div className={liquidClass(
            "px-2 py-1 rounded text-center w-full",
            "bg-amber-500/10 border border-amber-500/20",
            "text-amber-400 text-xs font-mono"
          )}>
            Expires: {new Date(node.expiresAt).toLocaleDateString()}
          </div>
        )}

        {/* Revoked */}
        {isRevoked && (
          <div className={liquidClass(
            "px-2 py-1 rounded text-center w-full",
            "bg-red-500/10 border border-red-500/20",
            "text-red-400 text-xs font-mono"
          )}>
            Revoked: {new Date(node.revokedAt!).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 w-full">
          {canRevoke && (
            <LiquidButton
              variant="danger"
              size="sm"
              iconLeft={<RotateCcw className="w-3 h-3" />}
              onClick={(e) => { e.stopPropagation(); onRevoke?.(node.id); }}
            >
              Revoke
            </LiquidButton>
          )}
          {canExtend && (
            <LiquidButton
              variant="primary"
              size="sm"
              iconLeft={<ArrowRight className="w-3 h-3" />}
              onClick={(e) => { e.stopPropagation(); onExtend?.(node.id); }}
            >
              Extend
            </LiquidButton>
          )}
        </div>
      </div>

      {/* Connector line (vertical) */}
      {showConnector && !horizontal && (
        <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
      )}
    </div>
  );
}

function NodeDetailPanel({
  node,
  onClose,
  onRevoke,
  onExtend,
  isPrincipal,
  currentUserDid,
}: {
  node: DelegationNode;
  onClose: () => void;
  onRevoke?: (nodeId: string) => void;
  onExtend?: (parentId: string) => void;
  isPrincipal: boolean;
  currentUserDid?: string;
}) {
  const isRevoked = !!node.revokedAt;
  const canRevoke = onRevoke && !isRevoked && (isPrincipal || currentUserDid === node.delegatorDid);
  const canExtend = onExtend && !isRevoked && currentUserDid === node.delegatorDid;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={liquidClass(
        "relative w-full max-w-xl max-h-[90vh] overflow-y-auto",
        liquidTokens.glass.heavy,
        liquidTokens.borders.thick,
        liquidTokens.shadows.lift,
        "animate-slide-up"
      )}>
        {/* Header */}
        <div className={liquidClass(
          "flex items-start justify-between p-4 border-b sticky top-0 z-10",
          liquidTokens.borders.thin,
          "border-white/10",
          liquidTokens.glass.heavy
        )}>
          <div>
            <h3 className={liquidClass(liquidTokens.typography.headline, "text-zinc-50")}>
              Node Details
            </h3>
            <p className="mt-1 text-zinc-400 text-sm">
              {node.delegatorDid || node.delegateeDid}
            </p>
          </div>
          <button
            onClick={onClose}
            className={liquidClass(
              "p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors",
              liquidTokens.borders.thin,
              "border-white/10"
            )}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <DetailSection title="Identity">
            <DetailRow label="Type" value={node.revokedAt ? "Revoked" : node.depth === 0 ? "Principal" : node.depth === 1 ? "Delegation" : "Agent"} />
            <DetailRow label="Delegator DID" value={node.delegatorDid ?? "\u2014"} mono />
            <DetailRow label="Delegatee DID" value={node.delegateeDid ?? "\u2014"} mono />
            <DetailRow label="Depth" value={node.depth.toString()} mono />
          </DetailSection>

          <DetailSection title="Scope & Authority">
            <DetailRow label="Scope" value={(node.scope || node.scopes)?.join(", ") || "\u2014"} full />
            <DetailRow label="Parent Delegation" value={node.parentId || "None (root)"} mono />
            <DetailRow label="Signature" value={node.signature ? `${node.signature.slice(0, 24)}...${node.signature.slice(-24)}` : "\u2014"} mono />
          </DetailSection>

          <DetailSection title="Lifecycle">
            <DetailRow label="Created" value={new Date().toLocaleString()} mono />
            {node.expiresAt && <DetailRow label="Expires" value={new Date(node.expiresAt).toLocaleString()} mono />}
            {node.revokedAt && <DetailRow label="Revoked" value={new Date(node.revokedAt).toLocaleString()} mono />}
          </DetailSection>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
            {canRevoke && (
              <LiquidButton
                variant="danger"
                size="md"
                iconLeft={<RotateCcw className="w-4 h-4" />}
                onClick={() => { onRevoke?.(node.id); onClose(); }}
              >
                Revoke Delegation
              </LiquidButton>
            )}
            {canExtend && (
              <LiquidButton
                variant="primary"
                size="md"
                iconLeft={<ArrowRight className="w-4 h-4" />}
                onClick={() => { onExtend?.(node.id); onClose(); }}
              >
                Extend Delegation
              </LiquidButton>
            )}
            <LiquidButton
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              Close
            </LiquidButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className={liquidClass(liquidTokens.typography.label, "text-zinc-500")}>{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, mono = false, full = false }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={liquidClass(full ? "grid-cols-1" : "grid-cols-12", "grid gap-2")}>
      <label className={liquidClass(
        full ? "col-span-1" : "col-span-4",
        liquidTokens.typography.label,
        "text-zinc-500"
      )}>
        {label}
      </label>
      <span className={liquidClass(
        full ? "col-span-1" : "col-span-8",
        mono && liquidTokens.typography.mono,
        "text-zinc-300 break-all"
      )}>
        {value}
      </span>
    </div>
  );
}

const XCircle = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const ArrowRight = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ChevronRight = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronDown = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const RotateCcw = ({ className, ...props }: any) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M1 4v6h6" />
    <path d="M23 20v-6h-6" />
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
  </svg>
);
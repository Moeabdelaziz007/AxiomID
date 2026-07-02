"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { Tier, getTierColor } from "@/lib/tiers";
import { useLanguage } from "@/app/context/language-context";

interface GraphNode {
  id: string;
  piUsername?: string | null;
  walletAddress: string;
  did?: string | null;
  tier: Tier;
  xp: number;
  createdAt?: string;
  agent?: {
    name: string;
    status: string;
  } | null;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
}

export default function NetworkGraph({ nodes }: NetworkGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [scale, setScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastDist = useRef(0);
  const { language } = useLanguage();
  const t = (en: string, ar: string) => (language === "en" ? en : ar);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current > 0) {
        setScale((s) => Math.min(3, Math.max(0.5, s * (dist / lastDist.current))));
      }
      lastDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => { lastDist.current = 0; }, []);

  const width = 500;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;
  const hubRadius = 24;

  const radialNodes = useMemo(() => {
    return nodes.map((node, i) => {
      const angle = (i * 2 * Math.PI) / Math.max(nodes.length, 1);
      const distance = 120 + (i % 2) * 35;
      const x = cx + distance * Math.cos(angle);
      const y = cy + distance * Math.sin(angle);
      return {
        ...node,
        x,
        y,
        radius: 12 + Math.min(node.xp / 100, 10),
      };
    });
  }, [nodes, cx, cy]);

  // Transaction lines: dashed lines between nearby nodes
  const transactionLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; opacity: number }> = [];
    const threshold = 180;
    for (let i = 0; i < radialNodes.length; i++) {
      for (let j = i + 1; j < radialNodes.length; j++) {
        const dx = radialNodes[i].x - radialNodes[j].x;
        const dy = radialNodes[i].y - radialNodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          lines.push({
            x1: radialNodes[i].x, y1: radialNodes[i].y,
            x2: radialNodes[j].x, y2: radialNodes[j].y,
            opacity: Math.max(0.05, 0.3 - (dist / threshold) * 0.25),
          });
        }
      }
    }
    return lines;
  }, [radialNodes]);

  // Mini stats
  const activeNodes = nodes.filter((n) => n.agent?.status === "ACTIVE");
  const latestJoin = nodes.length > 0 ? nodes.reduce((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aTime > bTime ? a : b;
  }, nodes[0]) : null;

  return (
    <div className="bento-card p-5 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-4 left-4">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest">{t("Active Node Graph", "رسم بياني للعقد النشطة")}</h3>
        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{t("Click nodes to inspect identities", "انقر على العقد لفحص الهويات")}</p>
      </div>

      {/* Mini Stats */}
      <div className="flex items-center gap-4 mt-2 mb-3 text-[9px] font-mono text-zinc-500">
        <span>{t(`${nodes.length} nodes`, `${nodes.length} عقد`)}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{t(`${activeNodes.length} active`, `${activeNodes.length} نشطة`)}</span>
        {nodes.length > 0 && <span>{t(`Top trust: ${Math.max(...nodes.map((n) => n.xp))} XP`, `أعلى ثقة: ${Math.max(...nodes.map((n) => n.xp))} XP`)}</span>}
        {latestJoin && <span>{t(`Latest: ${latestJoin.piUsername || latestJoin.walletAddress.slice(0, 6)}`, `الأحدث: ${latestJoin.piUsername || latestJoin.walletAddress.slice(0, 6)}`)}</span>}
      </div>

      {/* SVG Canvas with pinch-to-zoom */}
      <div
        className="w-full max-w-[500px] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[340px] select-none"
          style={{ transform: `scale(${scale})`, transformOrigin: "center center", transition: "transform 0.1s ease" }}
        >
          <defs>
            <filter id="hub-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="node-glow-active" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {radialNodes.map((n) => (
              <filter key={`glow-${n.id}`} id={`glow-${n.id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            ))}
            <style>{`
              @keyframes node-pulse {
                0%, 100% { opacity: 0.15; r: var(--r); }
                50% { opacity: 0.35; r: calc(var(--r) + 3px); }
              }
              .node-active-pulse {
                animation: node-pulse 2s ease-in-out infinite;
              }
            `}</style>
          </defs>

          {/* Transaction Lines (dashed) */}
          {transactionLines.map((line, i) => (
            <line
              key={`tx-${i}`}
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="0.5"
              strokeDasharray="4 6"
              opacity={line.opacity}
            />
          ))}

          {/* Lines from Hub to Nodes */}
          {radialNodes.map((node) => {
            const color = getTierColor(node.tier);
            const isSelected = selectedNode?.id === node.id;
            return (
              <line
                key={`line-${node.id}`}
                x1={cx} y1={cy}
                x2={node.x} y2={node.y}
                stroke={isSelected ? color : "rgba(255, 255, 255, 0.08)"}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeDasharray={isSelected ? "4 4" : "none"}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r={hubRadius} fill="url(#hub-grad)" filter="url(#hub-glow)" className="cursor-default" />
          <defs>
            <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#39FF14" />
              <stop offset="50%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#090a0f" />
            </radialGradient>
          </defs>
          <text x={cx} y={cy + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
            AXIOM
          </text>

          {/* Outer Radial Nodes */}
          {radialNodes.map((node) => {
            const color = getTierColor(node.tier);
            const isSelected = selectedNode?.id === node.id;
            const isActive = node.agent?.status === "ACTIVE";
            return (
              <g key={node.id} onClick={() => setSelectedNode(node)} className="cursor-pointer group">
                {/* Pulse ring for active nodes */}
                {isActive && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={node.radius + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    className="node-active-pulse"
                    style={{ "--r": `${node.radius}px` } as React.CSSProperties}
                  />
                )}
                {/* Outer hover ring */}
                <circle
                  cx={node.x} cy={node.y}
                  r={node.radius + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={isSelected ? 0.4 : 0}
                  className="group-hover:stroke-opacity-25 transition-all duration-300"
                />
                {/* Core Node circle */}
                <circle
                  cx={node.x} cy={node.y}
                  r={node.radius}
                  fill={color}
                  fillOpacity={0.15}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  filter={isSelected ? `url(#glow-${node.id})` : undefined}
                  className="transition-all duration-300"
                />
                {/* Short label */}
                <text
                  x={node.x} y={node.y + node.radius + 12}
                  textAnchor="middle"
                  fill={isSelected ? "#ffffff" : "#a1a1aa"}
                  fontSize="8"
                  fontFamily="monospace"
                  className="transition-colors duration-300"
                >
                  {node.piUsername ? `@${node.piUsername.slice(0, 8)}` : node.walletAddress.slice(0, 6)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Box */}
      <div className="w-full mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] min-h-[90px] flex flex-col justify-center">
        {selectedNode ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white">
                @{selectedNode.piUsername || t("anonymous", "مجهول")}
              </span>
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded border"
                style={{
                  color: getTierColor(selectedNode.tier),
                  borderColor: `${getTierColor(selectedNode.tier)}30`,
                  background: `${getTierColor(selectedNode.tier)}10`
                }}
              >
                {selectedNode.tier.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mt-1 truncate">
              {t("DID:", "المعرف:")} {selectedNode.did || t("did:axiom:unconnected", "did:axiom:غير متصل")}
            </p>
            {selectedNode.agent && (
              <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded text-[9px] font-mono text-emerald-400 max-w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t("Agent:", "العميل:")} {selectedNode.agent.name} ({selectedNode.agent.status})</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-zinc-600 text-xs font-mono">
            {t("Click an identity node to audit credential state", "انقر على عقد الهوية لفحص بيانات الاعتماد")}
          </div>
        )}
      </div>
    </div>
  );
}

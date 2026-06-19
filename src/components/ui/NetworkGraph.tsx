"use client";

import React, { useState, useMemo } from "react";
import { Tier, getTierColor } from "@/lib/tiers";

interface GraphNode {
  id: string;
  piUsername?: string | null;
  walletAddress: string;
  did?: string | null;
  tier: Tier;
  xp: number;
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

  // Position nodes radially around the center hub
  const width = 500;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;
  const hubRadius = 24;

  const radialNodes = useMemo(() => {
    return nodes.map((node, i) => {
      const angle = (i * 2 * Math.PI) / Math.max(nodes.length, 1);
      const distance = 120 + (i % 2) * 35; // Staggered radii to prevent overlap
      const x = cx + distance * Math.cos(angle);
      const y = cy + distance * Math.sin(angle);
      return {
        ...node,
        x,
        y,
        radius: 12 + Math.min(node.xp / 100, 10), // Radius scales with XP
      };
    });
  }, [nodes, cx, cy]);

  return (
    <div className="bento-card p-5 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-4 left-4">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest">Active Node Graph</h3>
        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Click nodes to inspect identities</p>
      </div>

      {/* SVG Canvas */}
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full max-w-[500px] h-[340px] select-none"
      >
        {/* Hub Glow filter */}
        <defs>
          <filter id="hub-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {radialNodes.map((n) => (
            <filter key={`glow-${n.id}`} id={`glow-${n.id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          ))}
        </defs>

        {/* Lines from Hub to Nodes */}
        {radialNodes.map((node) => {
          const color = getTierColor(node.tier);
          const isSelected = selectedNode?.id === node.id;
          return (
            <line
              key={`line-${node.id}`}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={isSelected ? color : "rgba(255, 255, 255, 0.08)"}
              strokeWidth={isSelected ? 1.5 : 1}
              strokeDasharray={isSelected ? "4 4" : "none"}
              className="transition-all duration-300"
            />
          );
        })}

        {/* Center Hub (AxiomID Authority Node) */}
        <circle
          cx={cx}
          cy={cy}
          r={hubRadius}
          fill="url(#hub-grad)"
          filter="url(#hub-glow)"
          className="cursor-default"
        />
        <defs>
          <radialGradient id="hub-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#39FF14" />
            <stop offset="50%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#090a0f" />
          </radialGradient>
        </defs>
        <text 
          x={cx} 
          y={cy + 4} 
          textAnchor="middle" 
          fill="#ffffff" 
          fontSize="9" 
          fontWeight="bold" 
          fontFamily="monospace"
        >
          AXIOM
        </text>

        {/* Outer Radial Nodes */}
        {radialNodes.map((node) => {
          const color = getTierColor(node.tier);
          const isSelected = selectedNode?.id === node.id;
          return (
            <g 
              key={node.id} 
              onClick={() => setSelectedNode(node)}
              className="cursor-pointer group"
            >
              {/* Outer hover ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius + 5}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeOpacity={isSelected ? 0.4 : 0}
                className="group-hover:stroke-opacity-25 transition-all duration-300"
              />
              {/* Core Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
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
                x={node.x}
                y={node.y + node.radius + 12}
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

      {/* Selected Node Details Box */}
      <div className="w-full mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] min-h-[90px] flex flex-col justify-center">
        {selectedNode ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white">
                @{selectedNode.piUsername || "anonymous"}
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
              DID: {selectedNode.did || "did:axiom:unconnected"}
            </p>
            {selectedNode.agent && (
              <div className="flex items-center gap-1.5 mt-2 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded text-[9px] font-mono text-emerald-400 max-w-max">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Agent: {selectedNode.agent.name} ({selectedNode.agent.status})</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-zinc-600 text-xs font-mono">
            Click an identity node to audit credential state
          </div>
        )}
      </div>
    </div>
  );
}

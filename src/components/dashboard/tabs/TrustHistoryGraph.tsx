"use client";

import { useState, useEffect } from "react";

interface TrustEntry {
  date: string;
  score: number;
}

interface TrustHistoryGraphProps {
  username?: string;
}

/**
 * Trust History SVG line chart — fetches from /api/user/status.
 * Simple SVG, no external dependencies. Ponytail: native SVG over chart library.
 */
export function TrustHistoryGraph({ username }: TrustHistoryGraphProps) {
  const [data, setData] = useState<TrustEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user/status", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((json) => {
        const history = json.history || json.trustHistory || [];
        setData(history.slice(-30)); // Last 30 entries
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoading(false);
      });
    return () => controller.abort();
  }, [username]);

  if (loading) {
    return (
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-4">Trust History</h3>
        <div className="h-32 flex items-center justify-center">
          <div className="h-4 bg-glass rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bento-card p-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-4">Trust History</h3>
        <p className="text-xs font-mono text-faint text-center py-8">No trust history yet</p>
      </div>
    );
  }

  // SVG chart dimensions
  const svgWidth = 500;
  const svgHeight = 150;
  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const scores = data.map((d) => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.score - minScore) / range) * chartHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className="bento-card p-5">
      <h3 className="text-xs uppercase tracking-wider font-semibold text-faint mb-4">Trust History</h3>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + chartHeight - pct * chartHeight;
          const val = minScore + pct * range;
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={padding.left - 5} y={y + 3} textAnchor="end" fontSize="8" fontFamily="monospace" fill="rgba(255,255,255,0.3)">
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#trustGradient)" opacity="0.3" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22c55e" opacity={i === points.length - 1 ? 1 : 0.5} />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* X-axis labels */}
        {data.length > 1 && [0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text
            key={i}
            x={points[i].x}
            y={svgHeight - 5}
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fill="rgba(255,255,255,0.3)"
          >
            {new Date(data[i].date).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>
    </div>
  );
}

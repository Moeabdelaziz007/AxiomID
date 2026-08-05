"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { IQRA_NODES, IQRA_EDGES, type IqraNode } from "@/lib/iqra-mesh-data";

interface IqraMeshProps {
  width?: number;
  height?: number;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: IqraNode["group"];
  color: string;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  label: string;
}

/**
 * IQRA Neural Mesh — D3.js force-directed graph.
 *
 * Features:
 * - Force simulation with collision detection
 * - Node pulse effect on hover
 * - Edge highlighting on node click
 * - Static layout (no re-layout on interaction)
 * - Responsive sizing
 */
export function IqraMesh({ width = 600, height = 400 }: IqraMeshProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getNodeById = useCallback((id: string) => IQRA_NODES.find((n) => n.id === id), []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Nodes
    const nodes: SimNode[] = IQRA_NODES.map((n) => ({ ...n }));
    const links: SimLink[] = IQRA_EDGES.map((e) => ({ ...e }));

    // Force simulation
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40))
      .stop();

    // Run simulation synchronously for static layout
    for (let i = 0; i < 300; i++) simulation.tick();

    // Draw edges
    const edgeGroup = g.append("g").attr("class", "edges");
    const _edge = edgeGroup.selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 1)
      .attr("x1", (d) => (d.source as SimNode).x!)
      .attr("y1", (d) => (d.source as SimNode).y!)
      .attr("x2", (d) => (d.target as SimNode).x!)
      .attr("y2", (d) => (d.target as SimNode).y!);

    // Draw edge labels
    const _edgeLabel = edgeGroup.selectAll("text")
      .data(links)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "7px")
      .attr("font-family", "monospace")
      .attr("fill", "rgba(255,255,255,0.15)")
      .attr("x", (d) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
      .attr("y", (d) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2)
      .text((d) => d.label);

    // Draw nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Node glow
    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.1);

    // Node circle
    node.append("circle")
      .attr("r", 12)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .attr("opacity", 0.9);

    // Node label
    node.append("text")
      .attr("dy", 24)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("fill", "rgba(255,255,255,0.6)")
      .text((d) => d.label);

    // Pulse animation on hover
    node.on("mouseenter", function (_, d) {
      setHoveredNode(d.id);
      d3.select(this).select("circle:nth-child(2)")
        .transition()
        .duration(200)
        .attr("r", 16)
        .attr("opacity", 1);
      d3.select(this).select("circle:first-child")
        .transition()
        .duration(200)
        .attr("r", 28)
        .attr("opacity", 0.2);
    });

    node.on("mouseleave", function () {
      setHoveredNode(null);
      d3.select(this).select("circle:nth-child(2)")
        .transition()
        .duration(200)
        .attr("r", 12)
        .attr("opacity", 0.9);
      d3.select(this).select("circle:first-child")
        .transition()
        .duration(200)
        .attr("r", 20)
        .attr("opacity", 0.1);
    });

    // Click to highlight connected edges
    node.on("click", function (_, d) {
      setSelectedNode((prev) => (prev === d.id ? null : d.id));
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [width, height]);

  // Highlight connected edges when node is selected
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    (svg.selectAll(".edges line") as d3.Selection<SVGLineElement, SimLink, SVGSVGElement, unknown>)
      .attr("stroke", (d: SimLink) => {
        if (!selectedNode) return "rgba(255,255,255,0.08)";
        const src = typeof d.source === "string" ? d.source : d.source.id;
        const tgt = typeof d.target === "string" ? d.target : d.target.id;
        if (src === selectedNode || tgt === selectedNode) {
          const node = getNodeById(selectedNode);
          return node?.color || "#22c55e";
        }
        return "rgba(255,255,255,0.03)";
      })
      .attr("stroke-width", (d: SimLink) => {
        if (!selectedNode) return 1;
        const src = typeof d.source === "string" ? d.source : d.source.id;
        const tgt = typeof d.target === "string" ? d.target : d.target.id;
        return src === selectedNode || tgt === selectedNode ? 2 : 0.5;
      });

    (svg.selectAll(".nodes g") as d3.Selection<SVGGElement, SimNode, SVGSVGElement, unknown>)
      .attr("opacity", (d: SimNode) => {
        if (!selectedNode) return 1;
        if (d.id === selectedNode) return 1;
        const isConnected = IQRA_EDGES.some(
          (e) =>
            (e.source === selectedNode && e.target === d.id) ||
            (e.target === selectedNode && e.source === d.id)
        );
        return isConnected ? 1 : 0.2;
      });
  }, [selectedNode, getNodeById]);

  const selectedNodeData = selectedNode ? getNodeById(selectedNode) : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="rounded-xl border border-glass bg-white/[0.02]"
        viewBox={`0 0 ${width} ${height}`}
      />

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg border border-glass-hover bg-black/80 backdrop-blur-sm pointer-events-none">
          <p className="text-xs font-mono text-white font-semibold">{getNodeById(hoveredNode)?.label}</p>
          <p className="text-[10px] font-mono text-faint mt-1">{getNodeById(hoveredNode)?.description}</p>
        </div>
      )}

      {/* Selected node detail */}
      {selectedNodeData && (
        <div className="absolute top-3 right-3 p-3 rounded-lg border border-glass-hover bg-black/80 backdrop-blur-sm max-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedNodeData.color }} />
            <span className="text-xs font-mono text-white font-semibold">{selectedNodeData.label}</span>
          </div>
          <p className="text-[10px] font-mono text-faint">{selectedNodeData.description}</p>
          <p className="text-[9px] font-mono text-faint mt-1 capitalize">{selectedNodeData.group}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 left-3 flex gap-3">
        {(["core", "process", "output"] as const).map((group) => (
          <div key={group} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group === "core" ? "#22c55e" : group === "process" ? "#3b82f6" : "#f59e0b" }} />
            <span className="text-[8px] font-mono text-faint capitalize">{group}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

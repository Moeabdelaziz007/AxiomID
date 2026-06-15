import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MemoryGraph, MemoryNode, MemoryEdge, validateGraph } from './graph';
import { scanProjectAST } from './extractors/ast-extractor';
import { extractGitInfo } from './extractors/git-extractor';
import { scanProjectDocs } from './extractors/doc-extractor';

/**
 * Deterministically computes a SHA-256 hash of nodes and edges to enforce the TrustChain (RULE 3).
 */
export function calculateGraphHash(
  nodes: MemoryNode[],
  edges: MemoryEdge[],
  timestamp: number
): string {
  // Sort nodes and edges deterministically to guarantee identical hash for identical data
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = [...edges].sort((a, b) => {
    const compareSource = a.source.localeCompare(b.source);
    if (compareSource !== 0) return compareSource;
    const compareTarget = a.target.localeCompare(b.target);
    if (compareTarget !== 0) return compareTarget;
    return a.type.localeCompare(b.type);
  });

  const payload = JSON.stringify({
    nodes: sortedNodes,
    edges: sortedEdges,
    timestamp
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Builds the entire Topological Memory Graph for the project.
 */
export function buildMemoryGraph(rootDir: string): MemoryGraph {
  console.log(`[Memory Builder] Starting build for root: ${rootDir}`);

  // 1. Scan and extract from all sources
  const astData = scanProjectAST(rootDir);
  const gitData = extractGitInfo(rootDir);
  const docData = scanProjectDocs(rootDir);

  // 2. Merge nodes (deduplicated by ID)
  const nodeMap = new Map<string, MemoryNode>();

  const mergeNode = (node: MemoryNode) => {
    const existing = nodeMap.get(node.id);
    if (!existing) {
      nodeMap.set(node.id, { ...node });
    } else {
      // Merge metadata
      existing.metadata = {
        ...existing.metadata,
        ...node.metadata
      };
      if (node.hash) {
        existing.hash = node.hash;
      }
    }
  };

  astData.nodes.forEach(mergeNode);
  gitData.nodes.forEach(mergeNode);
  docData.nodes.forEach(mergeNode);

  // 3. Merge edges (deduplicated by source + target + type)
  const edgeMap = new Map<string, MemoryEdge>();

  const mergeEdge = (edge: MemoryEdge) => {
    const key = `${edge.source} -> ${edge.target} (${edge.type})`;
    const existing = edgeMap.get(key);
    if (!existing) {
      edgeMap.set(key, { ...edge });
    } else {
      // Keep maximum weight
      existing.weight = Math.max(existing.weight, edge.weight);
    }
  };

  astData.edges.forEach(mergeEdge);
  gitData.edges.forEach(mergeEdge);
  docData.edges.forEach(mergeEdge);

  const mergedNodes = Array.from(nodeMap.values());
  const mergedEdges = Array.from(edgeMap.values());

  const timestamp = Date.now();
  const graphHash = calculateGraphHash(mergedNodes, mergedEdges, timestamp);

  const graphPayload: MemoryGraph = {
    version: '1.0',
    hash: graphHash,
    timestamp,
    nodes: mergedNodes,
    edges: mergedEdges
  };

  // 4. Validate output using Zod Schema (RULE 0)
  const validatedGraph = validateGraph(graphPayload);

  console.log(
    `[Memory Builder] Build completed successfully. Verified Hash: ${validatedGraph.hash} (${validatedGraph.nodes.length} nodes, ${validatedGraph.edges.length} edges)`
  );

  return validatedGraph;
}

/**
 * Builds the graph and saves it to a local JSON file.
 */
export function buildAndSaveMemoryGraph(rootDir: string, outputPath: string): MemoryGraph {
  const graph = buildMemoryGraph(rootDir);
  
  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2), 'utf-8');
  console.log(`[Memory Builder] Memory graph written to: ${outputPath}`);

  return graph;
}

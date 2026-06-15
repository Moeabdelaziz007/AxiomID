import { z } from 'zod';

// Node types in our topological graph
export const MemoryNodeTypeSchema = z.enum([
  'file',
  'directory',
  'symbol', // Class, Interface, Function, etc.
  'doc',    // Markdown documentation
  'commit'  // Git commit
]);

export type MemoryNodeType = z.infer<typeof MemoryNodeTypeSchema>;

// Edge types in our topological graph
export const MemoryEdgeTypeSchema = z.enum([
  'contains',      // Directory -> File/Directory
  'imports',       // File -> File
  'exports',       // File -> Symbol
  'calls',         // Symbol -> Symbol
  'references',    // Symbol/Doc -> Symbol/Doc
  'co-occurrence', // File -> File (Git temporal cluster)
  'wikilink'       // Doc -> Doc/File
]);

export type MemoryEdgeType = z.infer<typeof MemoryEdgeTypeSchema>;

// Schema for a single node
export const MemoryNodeSchema = z.object({
  id: z.string().min(1, 'Node ID cannot be empty'),
  type: MemoryNodeTypeSchema,
  metadata: z.record(z.string(), z.any()).default({}),
  hash: z.string().optional() // Optional hash for individual file contents
});

export type MemoryNode = z.infer<typeof MemoryNodeSchema>;

// Schema for a single edge
export const MemoryEdgeSchema = z.object({
  source: z.string().min(1, 'Source ID cannot be empty'),
  target: z.string().min(1, 'Target ID cannot be empty'),
  type: MemoryEdgeTypeSchema,
  weight: z.number().default(1.0)
});

export type MemoryEdge = z.infer<typeof MemoryEdgeSchema>;

// Schema for the entire graph
export const MemoryGraphSchema = z.object({
  version: z.string().default('1.0'),
  hash: z.string().min(1, 'Graph verification hash cannot be empty'), // RULE 3 TrustChain Signature
  timestamp: z.number(),
  nodes: z.array(MemoryNodeSchema),
  edges: z.array(MemoryEdgeSchema)
});

export type MemoryGraph = z.infer<typeof MemoryGraphSchema>;

/**
 * Validates an unknown value as a memory node.
 *
 * @returns The validated memory node.
 * @throws If the input does not conform to the memory node schema.
 */
export function validateNode(node: unknown): MemoryNode {
  return MemoryNodeSchema.parse(node);
}

/**
 * Validates an unknown value as a memory edge.
 *
 * @param edge - The value to validate
 * @returns The validated edge
 * @throws If the input does not conform to the memory edge structure
 */
export function validateEdge(edge: unknown): MemoryEdge {
  return MemoryEdgeSchema.parse(edge);
}

/**
 * Validates that an object conforms to the MemoryGraph schema.
 *
 * @throws If the input does not match the expected MemoryGraph structure.
 * @returns The validated graph object.
 */
export function validateGraph(graph: unknown): MemoryGraph {
  return MemoryGraphSchema.parse(graph);
}

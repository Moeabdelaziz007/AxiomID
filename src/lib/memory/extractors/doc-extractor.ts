import fs from 'fs';
import path from 'path';
import { MemoryNode, MemoryEdge } from '../graph';

/**
 * Recursively find all Markdown files in a directory.
 */
export function globMarkdownFiles(dir: string, rootDir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        file === 'node_modules' ||
        file === '.git' ||
        file === '.next' ||
        file === '.jolli' ||
        file === 'dist'
      ) {
        continue;
      }
      results = results.concat(globMarkdownFiles(fullPath, rootDir));
    } else {
      if (path.extname(file) === '.md') {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Parses simple YAML frontmatter.
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const frontmatter: Record<string, any> = {};
  let body = content;

  // Match --- \n metadata \n ---
  const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/);
  if (match) {
    body = content.substring(match[0].length);
    const yamlLines = match[1].split('\n');
    for (const line of yamlLines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        
        // Parse array notation [val1, val2] or string/number
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key] = value
            .substring(1, value.length - 1)
            .split(',')
            .map((item) => item.trim().replace(/^['"]|['"]$/g, ''));
        } else {
          frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
        }
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Extracts all [[Wikilinks]] from a body of markdown text.
 */
export function extractWikilinks(body: string): string[] {
  const links: string[] = [];
  // Match [[some-link]] or [[some-link|display-text]]
  const regex = /\[\[([\w\s./#\-_|]+)\]\]/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    const rawLink = match[1];
    const cleanLink = rawLink.split('|')[0].trim();
    links.push(cleanLink);
  }
  return links;
}

/**
 * Resolves a wikilink target name to a file/document ID in the project.
 */
export function resolveWikilinkTarget(
  target: string,
  currentDocPath: string,
  rootDir: string
): string | null {
  // If target already contains extension or path, resolve relative to current doc directory
  const currentDir = path.dirname(currentDocPath);
  const potentialPath = path.resolve(currentDir, target);

  if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
    return path.relative(rootDir, potentialPath);
  }

  const searchName = target.endsWith('.md') ? target : `${target}.md`;
  const potentialSearchPath = path.resolve(currentDir, searchName);
  if (fs.existsSync(potentialSearchPath) && fs.statSync(potentialSearchPath).isFile()) {
    return path.relative(rootDir, potentialSearchPath).replace(/\\/g, '/');
  }

  const codePath = path.join(rootDir, searchName);
  if (fs.existsSync(codePath) && fs.statSync(codePath).isFile()) {
    return searchName.replace(/\\/g, '/');
  }

  return null;
}

/**
 * Extracts metadata, wikilinks, and creates nodes & edges for a markdown file.
 */
export function extractDocInfo(
  filePath: string,
  rootDir: string
): {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
} {
  const relativeFilePath = path.relative(rootDir, filePath);
  const nodes: MemoryNode[] = [];
  const edges: MemoryEdge[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const wikilinks = extractWikilinks(body);

    const docNode: MemoryNode = {
      id: relativeFilePath,
      type: 'doc',
      metadata: {
        title: frontmatter.title || path.basename(filePath, '.md'),
        tags: frontmatter.tags || [],
        description: frontmatter.description || ''
      }
    };
    nodes.push(docNode);

    // 1. Resolve wikilinks and add edges
    for (const link of wikilinks) {
      const resolved = resolveWikilinkTarget(link, filePath, rootDir);
      if (resolved) {
        edges.push({
          source: relativeFilePath,
          target: resolved,
          type: 'wikilink',
          weight: 1.0
        });
      }
    }

    // 2. Resolve YAML frontmatter "related" files/docs list
    if (Array.isArray(frontmatter.related)) {
      for (const rel of frontmatter.related) {
        const resolved = resolveWikilinkTarget(rel, filePath, rootDir);
        if (resolved) {
          edges.push({
            source: relativeFilePath,
            target: resolved,
            type: 'references',
            weight: 0.8
          });
        }
      }
    }

  } catch (err) {
    console.error(`[Doc Extractor] Error processing document ${relativeFilePath}:`, err);
  }

  return { nodes, edges };
}

/**
 * Scans the workspace for markdown documentation and returns nodes and edges.
 */
export function scanProjectDocs(rootDir: string): {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
} {
  const allNodes: MemoryNode[] = [];
  const allEdges: MemoryEdge[] = [];
  const nodeMap = new Map<string, MemoryNode>();

  // Scan root directory and Amrikyy.Memory/ if it exists
  const mdFiles = globMarkdownFiles(rootDir, rootDir);

  for (const file of mdFiles) {
    const { nodes, edges } = extractDocInfo(file, rootDir);

    for (const node of nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        allNodes.push(node);
      }
    }

    allEdges.push(...edges);
  }

  return { nodes: allNodes, edges: allEdges };
}

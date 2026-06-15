import fs from 'fs';
import path from 'path';
import { MemoryNode, MemoryEdge } from '../graph';

/**
 * Recursively scans a directory for Markdown files, skipping `node_modules`, `.git`, `.next`, `.jolli`, and `dist`.
 *
 * @returns An array of full file paths to all discovered `.md` files, or an empty array if the directory does not exist.
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
 * Extracts and parses YAML frontmatter from the beginning of content.
 *
 * @param content - The text to parse, potentially containing a frontmatter block.
 * @returns An object with `frontmatter` containing parsed metadata as key-value pairs (with `[...]` notation converted to arrays) and `body` containing the remaining content after the frontmatter block. If no frontmatter block is found, `frontmatter` is empty and `body` is the original content.
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
 * Extracts wikilink targets from Markdown text.
 *
 * @returns An array of wikilink targets, excluding any display text after `|`.
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
 * Resolves a wikilink target to a project-relative file path.
 *
 * Searches for the target file by checking relative to the current document's directory and then at the project root. If the target does not have a `.md` extension, the function appends it during the search.
 *
 * @param target - The wikilink target name, with or without a `.md` extension
 * @param currentDocPath - The file path of the document containing the wikilink
 * @param rootDir - The project root directory
 * @returns The project-relative file path if found, or `null` if the target cannot be resolved
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
 * Reads a markdown file and extracts document metadata and relationships as graph nodes and edges.
 *
 * @param filePath - Absolute path to the markdown file
 * @param rootDir - The root directory used to compute relative paths in the result
 * @returns An object containing document nodes and relationship edges extracted from the file
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
 * Extracts document metadata and relationships from Markdown files in a directory.
 *
 * @param rootDir - The directory to scan
 * @returns An object with `nodes` containing document metadata and `edges` containing discovered relationships
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

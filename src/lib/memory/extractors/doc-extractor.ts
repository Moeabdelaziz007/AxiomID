import fs from 'fs';
import path from 'path';
import { MemoryNode, MemoryEdge } from '../graph';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', '.jolli', 'dist', 'out', 'build']);

/**
 * Finds all Markdown files in a directory tree, excluding ignored directories such as node_modules, .git, and build output directories.
 *
 * @returns Array of absolute paths to all .md files found.
 */
export function globMarkdownFiles(dir: string, rootDir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (IGNORED_DIRS.has(file)) {
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
 * @param content - Markdown content that may include a YAML frontmatter block delimited by `---` at the start.
 * @returns An object with `frontmatter` containing the parsed metadata as key-value pairs and `body` containing the remaining content after the frontmatter block.
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
 * Extracts all wikilink targets from markdown text.
 *
 * @returns An array of wikilink targets, excluding display labels if present.
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
 * Resolves a wikilink target to a file path within the project.
 *
 * Attempts multiple resolution strategies: relative to the current document's directory (with or without `.md` extension), or as a path relative to the project root. Returns the first successful match.
 *
 * @returns The file path relative to `rootDir` if the target exists, `null` otherwise
 */
export function resolveWikilinkTarget(
  target: string,
  currentDocPath: string,
  rootDir: string
): string | null {
  const currentDir = path.dirname(currentDocPath);
  const potentialPath = path.resolve(currentDir, target);

  if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
    return path.relative(rootDir, potentialPath);
  }

  if (!target.endsWith('.md')) {
    const mdPath = path.resolve(currentDir, `${target}.md`);
    if (fs.existsSync(mdPath) && fs.statSync(mdPath).isFile()) {
      return path.relative(rootDir, mdPath).replace(/\\/g, '/');
    }
  }

  const codePath = path.join(rootDir, target);
  if (fs.existsSync(codePath) && fs.statSync(codePath).isFile()) {
    return target.replace(/\\/g, '/');
  }

  return null;
}

/**
 * Parses a markdown file to extract document metadata and create graph nodes and edges.
 *
 * @returns An object containing the document node with metadata from frontmatter and edges representing wikilinks and related references.
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
 * Builds a graph of workspace documents from markdown files and their wikilink relationships.
 *
 * @returns An object with `nodes` representing documents and `edges` representing wikilink and reference connections between them.
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

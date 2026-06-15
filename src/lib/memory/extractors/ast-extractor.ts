import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { MemoryNode, MemoryEdge } from '../graph';

/**
 * Collects all TypeScript and JavaScript source files from a directory tree.
 *
 * Recursively walks `dir`, including files with extensions `.ts`, `.tsx`, `.js`, or `.jsx`,
 * except `.d.ts` files. Skips directories: `node_modules`, `.git`, `.next`, `.jolli`, `dist`, `out`, and `build`.
 *
 * @param dir - The root directory to start scanning from.
 * @returns An array of absolute file paths.
 */
export function globFiles(dir: string, rootDir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Skip ignored directories
    if (stat.isDirectory()) {
      if (
        file === 'node_modules' ||
        file === '.git' ||
        file === '.next' ||
        file === '.jolli' ||
        file === 'dist' ||
        file === 'out' ||
        file === 'build'
      ) {
        continue;
      }
      results = results.concat(globFiles(fullPath, rootDir));
    } else {
      // Only include TS/JS files
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !file.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Resolves a local import specifier to a workspace-root-relative path.
 *
 * Handles relative imports and `@/` alias imports mapped to `src/`.
 *
 * @returns The relative path from `rootDir` to the resolved file, or `null` if the import cannot be resolved
 */
export function resolveImportPath(
  importee: string,
  importerPath: string,
  rootDir: string
): string | null {
  // If it's a absolute/external dependency (e.g. 'react', 'zod'), we can ignore or return null
  if (!importee.startsWith('.') && !importee.startsWith('@/')) {
    return null;
  }

  let absoluteImportPath = '';

  if (importee.startsWith('@/')) {
    // Resolve @/ alias to src/
    const srcRelative = importee.slice(2);
    absoluteImportPath = path.join(rootDir, 'src', srcRelative);
  } else {
    // Resolve relative path relative to the importing file directory
    const importerDir = path.dirname(importerPath);
    absoluteImportPath = path.resolve(importerDir, importee);
  }

  // Extensions to check
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  
  // 1. Direct path check
  if (fs.existsSync(absoluteImportPath) && fs.statSync(absoluteImportPath).isFile()) {
    return path.relative(rootDir, absoluteImportPath);
  }

  // 2. Try file extensions
  for (const ext of extensions) {
    const fileWithExt = absoluteImportPath + ext;
    if (fs.existsSync(fileWithExt) && fs.statSync(fileWithExt).isFile()) {
      return path.relative(rootDir, fileWithExt);
    }
  }

  // 3. Try index files inside a directory
  for (const ext of extensions) {
    const indexFile = path.join(absoluteImportPath, 'index' + ext);
    if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
      return path.relative(rootDir, indexFile);
    }
  }

  return null;
}

/**
 * Extracts imports and exported symbols from a TypeScript or JavaScript file.
 *
 * Creates nodes for the file itself and for each top-level exported declaration (class, interface, function, enum, or type alias), and creates edges representing import relationships and export associations.
 *
 * @param filePath - Absolute path to the file to analyze.
 * @param rootDir - Project root directory; relative paths in graph nodes are computed from this.
 * @returns An object with `nodes` (file and symbol nodes) and `edges` (import and export relationships).
 */
export function extractASTInfo(
  filePath: string,
  rootDir: string
): {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
} {
  const relativeFilePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const nodes: MemoryNode[] = [];
  const edges: MemoryEdge[] = [];

  // Add the file node itself
  nodes.push({
    id: relativeFilePath,
    type: 'file',
    metadata: {
      size: fs.statSync(filePath).size,
      mtime: fs.statSync(filePath).mtime.toISOString(),
      extension: path.extname(filePath)
    }
  });

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // Walk the AST nodes
    const visit = (node: ts.Node) => {
      // 1. Check Import Declarations
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importee = moduleSpecifier.text;
          const resolvedPath = resolveImportPath(importee, filePath, rootDir);
          if (resolvedPath) {
            edges.push({
              source: relativeFilePath,
              target: resolvedPath,
              type: 'imports',
              weight: 1.0
            });
          }
        }
      }

      // 2. Check Top-Level Exports (Classes, Interfaces, Functions, Enums, TypeAliases)
      if (
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isTypeAliasDeclaration(node)
      ) {
        // Check if it has export modifier
        const hasExport = node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        );

        if (hasExport && node.name) {
          const symbolName = node.name.text;
          const symbolId = `${relativeFilePath}#${symbolName}`;
          let symbolKind = 'unknown';
          if (ts.isClassDeclaration(node)) symbolKind = 'class';
          else if (ts.isInterfaceDeclaration(node)) symbolKind = 'interface';
          else if (ts.isFunctionDeclaration(node)) symbolKind = 'function';
          else if (ts.isEnumDeclaration(node)) symbolKind = 'enum';
          else if (ts.isTypeAliasDeclaration(node)) symbolKind = 'type';

          nodes.push({
            id: symbolId,
            type: 'symbol',
            metadata: {
              name: symbolName,
              kind: symbolKind,
              file: relativeFilePath
            }
          });

          // Connect file to its exported symbol
          edges.push({
            source: relativeFilePath,
            target: symbolId,
            type: 'exports',
            weight: 1.0
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  } catch (err) {
    // Graceful error logging - do not crash the builder if one file fails to parse
    console.error(`[AST Extractor] Error parsing ${relativeFilePath}:`, err);
  }

  return { nodes, edges };
}

/**
 * Scans the entire project and builds a graph of its code structure and file hierarchy.
 *
 * @returns An object containing deduplicated nodes (files, exports, directories) and
 *          edges (imports, exports, containment) representing the project's structure.
 */
export function scanProjectAST(rootDir: string): {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
} {
  const allNodes: MemoryNode[] = [];
  const allEdges: MemoryEdge[] = [];
  const nodeMap = new Map<string, MemoryNode>();

  const files = globFiles(rootDir, rootDir);

  for (const file of files) {
    const { nodes, edges } = extractASTInfo(file, rootDir);

    for (const node of nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        allNodes.push(node);
      }
    }

    allEdges.push(...edges);
  }

  // Also add directory nodes for hierarchical completeness
  const dirs = new Set<string>();
  for (const node of allNodes) {
    if (node.type === 'file') {
      let dir = path.dirname(node.id);
      while (dir && dir !== '.' && dir !== '/' && dir !== '') {
        dirs.add(dir);
        dir = path.dirname(dir);
      }
    }
  }

  for (const dir of dirs) {
    allNodes.push({
      id: dir,
      type: 'directory',
      metadata: {
        name: path.basename(dir)
      }
    });

    // Connect directory to parent directory
    const parent = path.dirname(dir);
    if (parent && parent !== '.' && parent !== '/' && parent !== '') {
      allEdges.push({
        source: parent,
        target: dir,
        type: 'contains',
        weight: 0.5 // Structural edge
      });
    }

    // Connect parent directory to direct files
    // Find all files that are directly in this directory
    for (const node of allNodes) {
      if (node.type === 'file' && path.dirname(node.id) === dir) {
        allEdges.push({
          source: dir,
          target: node.id,
          type: 'contains',
          weight: 0.5
        });
      }
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

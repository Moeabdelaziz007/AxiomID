import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { MemoryNode, MemoryEdge } from '../graph';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', '.jolli', 'dist', 'out', 'build']);

/**
 * Recursively gets all TS/JS files in a directory, ignoring node_modules, .git, .next, etc.
 */
export function globFiles(dir: string, rootDir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (IGNORED_DIRS.has(file)) {
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
 * Resolves an imported module path to a relative path from workspace root.
 * Supports relative imports and '@/' alias.
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
 * Parses a TS/JS file AST to extract imports and top-level exported symbols.
 */
export function extractASTInfo(
  filePath: string,
  rootDir: string
): {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
} {
  const relativeFilePath = path.relative(rootDir, filePath);
  const nodes: MemoryNode[] = [];
  const edges: MemoryEdge[] = [];

  // Add the file node itself
  const stat = fs.statSync(filePath);
  nodes.push({
    id: relativeFilePath,
    type: 'file',
    metadata: {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
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
          const symbolKind =
            ts.isClassDeclaration(node) ? 'class' :
            ts.isInterfaceDeclaration(node) ? 'interface' :
            ts.isFunctionDeclaration(node) ? 'function' :
            ts.isEnumDeclaration(node) ? 'enum' :
            ts.isTypeAliasDeclaration(node) ? 'type' : 'unknown';

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
 * Scans the entire project and extracts AST nodes and edges.
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
  const dirToFiles = new Map<string, string[]>();

  for (const node of allNodes) {
    if (node.type === 'file') {
      const immediateDir = path.dirname(node.id);
      if (!dirToFiles.has(immediateDir)) dirToFiles.set(immediateDir, []);
      dirToFiles.get(immediateDir)!.push(node.id);

      let dir = immediateDir;
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
      metadata: { name: path.basename(dir) }
    });

    // Connect directory to parent directory
    const parent = path.dirname(dir);
    if (parent && parent !== '.' && parent !== '/' && parent !== '') {
      allEdges.push({ source: parent, target: dir, type: 'contains', weight: 0.5 });
    }

    // Connect directory to its direct files
    for (const fileId of dirToFiles.get(dir) ?? []) {
      allEdges.push({ source: dir, target: fileId, type: 'contains', weight: 0.5 });
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

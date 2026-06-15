/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import { resolveImportPath, extractASTInfo } from '../../../lib/memory/extractors/ast-extractor';
import { extractGitInfo } from '../../../lib/memory/extractors/git-extractor';
import { parseFrontmatter, extractWikilinks, extractDocInfo } from '../../../lib/memory/extractors/doc-extractor';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    statSync: jest.fn(),
    readdirSync: jest.fn()
  };
});

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const { execSync } = require('child_process') as jest.Mocked<any>;

describe('AxiomMemory Extractors', () => {
  const rootDir = '/mock/root';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AST Extractor', () => {
    it('should resolve imports correctly', () => {
      mockFs.existsSync.mockImplementation((p: any) => {
        return p === path.resolve(rootDir, 'src/lib/trust.ts');
      });
      mockFs.statSync.mockImplementation(() => ({ isFile: () => true } as any));

      const importer = path.resolve(rootDir, 'src/lib/did.ts');
      const resolved = resolveImportPath('./trust', importer, rootDir);

      expect(resolved).toBe('src/lib/trust.ts');
    });

    it('should extract imports and top-level exported symbols from AST', () => {
      const code = `
        import { validateNode } from './graph';
        import { run } from '@/lib/runner';

        export interface UserIdentity {
          id: string;
        }

        export class IdentityManager {
          constructor() {}
        }
      `;

      mockFs.readFileSync.mockReturnValue(code);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 500,
        mtime: new Date('2026-06-14T12:00:00.000Z')
      } as any);
      
      mockFs.existsSync.mockImplementation((p: any) => {
        return p.toString().endsWith('graph.ts') || p.toString().endsWith('runner.ts');
      });

      const filePath = path.resolve(rootDir, 'src/lib/identity.ts');
      const { nodes, edges } = extractASTInfo(filePath, rootDir);

      // Verify file node
      const fileNode = nodes.find(n => n.type === 'file');
      expect(fileNode).toBeDefined();
      expect(fileNode?.id).toBe('src/lib/identity.ts');

      // Verify symbol nodes
      const interfaceNode = nodes.find(n => n.id === 'src/lib/identity.ts#UserIdentity');
      expect(interfaceNode).toBeDefined();
      expect(interfaceNode?.metadata.kind).toBe('interface');

      const classNode = nodes.find(n => n.id === 'src/lib/identity.ts#IdentityManager');
      expect(classNode).toBeDefined();
      expect(classNode?.metadata.kind).toBe('class');

      // Verify edges
      const importEdges = edges.filter(e => e.type === 'imports');
      expect(importEdges).toHaveLength(2);

      const exportEdges = edges.filter(e => e.type === 'exports');
      expect(exportEdges).toHaveLength(2);
    });
  });

  describe('Git Extractor', () => {
    it('should return empty nodes/edges and warn if not a Git repository', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repo');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { nodes, edges } = extractGitInfo(rootDir);

      expect(nodes).toHaveLength(0);
      expect(edges).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should extract commit nodes and links if Git is available', () => {
      execSync.mockReturnValueOnce('true'); // for work-tree check
      
      const gitLogOutput = [
        'COMMIT:a1b2c3d|Mohamed Abdelaziz|2026-06-14T12:00:00+03:00',
        'src/lib/did.ts',
        'src/lib/trust.ts',
        'COMMIT:e5f6g7h|Reviewer Agent|2026-06-14T11:00:00+03:00',
        'src/app/page.tsx'
      ].join('\n');
      
      execSync.mockReturnValueOnce(gitLogOutput);

      const { nodes, edges } = extractGitInfo(rootDir);

      // Verify commits
      expect(nodes).toHaveLength(2);
      expect(nodes[0].id).toBe('commit:a1b2c3d');
      expect(nodes[0].metadata.author).toBe('Mohamed Abdelaziz');

      // Verify file references edges
      const refEdges = edges.filter(e => e.type === 'references');
      expect(refEdges).toHaveLength(3); // 2 in first commit, 1 in second commit

      // Verify co-occurrence edge between did.ts and trust.ts since they changed in same commit
      const coEdges = edges.filter(e => e.type === 'co-occurrence');
      expect(coEdges).toHaveLength(1);
      expect(coEdges[0].source).toBe('src/lib/did.ts');
      expect(coEdges[0].target).toBe('src/lib/trust.ts');
    });
  });

  describe('Doc Extractor', () => {
    it('should parse YAML frontmatter and extract body', () => {
      const content = [
        '---',
        'title: Verification Protocol',
        'tags: [security, identity, did]',
        'related: [src/lib/did.ts, docs/trust.md]',
        '---',
        'This is the body of the doc containing [[src/lib/did.ts]] reference.'
      ].join('\n');

      const { frontmatter, body } = parseFrontmatter(content);

      expect(frontmatter.title).toBe('Verification Protocol');
      expect(frontmatter.tags).toEqual(['security', 'identity', 'did']);
      expect(frontmatter.related).toEqual(['src/lib/did.ts', 'docs/trust.md']);
      expect(body.trim()).toBe('This is the body of the doc containing [[src/lib/did.ts]] reference.');
    });

    it('should extract wikilinks', () => {
      const body = 'Refer to [[docs/auth.md]] and [[src/lib/did.ts|DID Spec]].';
      const links = extractWikilinks(body);

      expect(links).toEqual(['docs/auth.md', 'src/lib/did.ts']);
    });

    it('should extract nodes and edges for docs', () => {
      const docContent = [
        '---',
        'title: Trust Guidelines',
        'related: [docs/auth.md]',
        '---',
        'Here is a [[src/lib/trust.ts]] link.'
      ].join('\n');

      mockFs.readFileSync.mockReturnValue(docContent);
      mockFs.existsSync.mockImplementation((p: any) => {
        const absPath = path.resolve(p.toString());
        return absPath === path.resolve(rootDir, 'src/lib/trust.ts') || 
               absPath === path.resolve(rootDir, 'docs/auth.md') ||
               absPath === path.resolve(rootDir, 'docs/trust.md');
      });
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        isDirectory: () => false
      } as any);

      const filePath = path.resolve(rootDir, 'docs/trust.md');
      const { nodes, edges } = extractDocInfo(filePath, rootDir);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('docs/trust.md');
      expect(nodes[0].type).toBe('doc');
      expect(nodes[0].metadata.title).toBe('Trust Guidelines');

      // Edges: 1 related (references) + 1 wikilink
      expect(edges).toHaveLength(2);
      expect(edges.find(e => e.type === 'wikilink')?.target).toBe('docs/src/lib/trust.ts');
    });

    it('should return empty body when content has no frontmatter', () => {
      const content = 'Just a plain body with no frontmatter here.';
      const { frontmatter, body } = parseFrontmatter(content);
      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    it('should return empty wikilinks array for empty body', () => {
      const links = extractWikilinks('');
      expect(links).toEqual([]);
    });

    it('should return empty wikilinks array for body with no wikilink syntax', () => {
      const linksNoBrackets = extractWikilinks('No wikilinks here at all. Just text.');
      expect(linksNoBrackets).toEqual([]);
    });

    it('should extract multiple wikilinks from the same body', () => {
      const body = 'See [[src/a.ts]] and [[docs/b.md]] for more info.';
      const links = extractWikilinks(body);
      expect(links).toHaveLength(2);
      expect(links).toContain('src/a.ts');
      expect(links).toContain('docs/b.md');
    });
  });

  describe('AST Extractor — external imports ignored', () => {
    it('should return null for external module imports (no ./ or @/ prefix)', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.statSync.mockReturnValue({ isFile: () => false } as any);

      const importer = path.resolve(rootDir, 'src/lib/did.ts');

      expect(resolveImportPath('react', importer, rootDir)).toBeNull();
      expect(resolveImportPath('zod', importer, rootDir)).toBeNull();
      expect(resolveImportPath('typescript', importer, rootDir)).toBeNull();
      expect(resolveImportPath('@radix-ui/react-dialog', importer, rootDir)).toBeNull();
    });
  });
});

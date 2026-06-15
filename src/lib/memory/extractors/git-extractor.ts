import { execSync } from 'child_process';
import { MemoryNode, MemoryEdge } from '../graph';

/**
 * Determines if the directory is a Git repository.
 *
 * @param rootDir - The directory to check
 * @returns `true` if the directory is inside a Git work tree, `false` otherwise
 */
export function isGitRepository(rootDir: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: rootDir,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts Git commits and file relationships as graph nodes and edges.
 *
 * Creates nodes for each commit with metadata and edges linking commits to modified
 * files and connecting files changed together in the same commit. Gracefully returns
 * empty results if Git is unavailable or the directory is not a Git repository.
 *
 * @param rootDir - The directory to extract Git information from
 * @param maxCommits - Maximum number of commits to process (default: 50)
 * @returns An object with `nodes` (commit nodes) and `edges` ("references" edges from
 *   commits to files and "co-occurrence" edges between files in the same commit)
 */
export function extractGitInfo(rootDir: string, maxCommits = 50): {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
} {
  const nodes: MemoryNode[] = [];
  const edges: MemoryEdge[] = [];

  if (!isGitRepository(rootDir)) {
    // Graceful degradation (RULE: Fallback when user doesn't have Git)
    console.warn('[Git Extractor] Git is not available or directory is not a Git repo. Skipping Git extraction.');
    return { nodes, edges };
  }

  try {
    const safeMaxCommits = Math.max(1, Math.min(500, Math.floor(maxCommits)));
    const logFormat = 'COMMIT:%h|%an|%cI';
    const output = execSync(
      `git log -n ${safeMaxCommits} --name-only --pretty=format:"${logFormat}"`,
      { cwd: rootDir, encoding: 'utf-8' }
    );

    const lines = output.split('\n');
    let currentCommitId: string | null = null;
    const commitFiles = new Map<string, string[]>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('COMMIT:')) {
        const parts = trimmed.substring(7).split('|');
        const hash = parts[0];
        const author = parts[1] || 'unknown';
        const timestamp = parts[2] || new Date().toISOString();

        currentCommitId = `commit:${hash}`;
        nodes.push({
          id: currentCommitId,
          type: 'commit',
          metadata: { hash, author, timestamp }
        });
        commitFiles.set(currentCommitId, []);
      } else if (currentCommitId) {
        // This is a file modified in the current commit
        // Convert to relative path format (using forward slashes)
        const fileRelativePath = trimmed.replace(/\\/g, '/');
        commitFiles.get(currentCommitId)?.push(fileRelativePath);

        // Link commit to file
        edges.push({
          source: currentCommitId,
          target: fileRelativePath,
          type: 'references',
          weight: 1.0
        });
      }
    }

    // Add co-occurrence edges for files changed together in the same commit.
    // Limited to commits with 5 or fewer files to avoid O(N^2) edge explosion.
    for (const [commitId, files] of commitFiles.entries()) {
      if (files.length > 1 && files.length <= 5) {
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            edges.push({
              source: files[i],
              target: files[j],
              type: 'co-occurrence',
              weight: 0.5 // Lower weight than direct AST imports
            });
          }
        }
      }
    }

  } catch (err) {
    console.error('[Git Extractor] Error executing git log:', err);
  }

  return { nodes, edges };
}

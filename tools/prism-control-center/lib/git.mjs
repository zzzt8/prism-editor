// lib/git.mjs — Git information collector
// Collects branch, commit, dirty state, modified files, and scope violations.

import { spawn } from 'child_process';
import { resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─── Shell helpers ────────────────────────────────────────────────────────────

/** Run a git command, return stdout (trimmed) or null on failure. */
function git(cmd, cwd = ROOT) {
  return new Promise((resolve) => {
    const [cmd0, ...args] = cmd.split(' ');
    const proc = spawn(cmd0, args, { cwd, shell: true });
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('close', (code) => {
      resolve(code === 0 ? out.trim() : null);
    });
    proc.on('error', () => resolve(null));
  });
}

// ─── File category ─────────────────────────────────────────────────────────────

const PROHIBITED_PATHS = [
  'packages/',
  'apps/',
];

/**
 * Classify a file path into a category.
 * @param {string} filePath
 * @returns {'tools'|'docs'|'openspec'|'tests'|'packages'|'apps'|'root'}
 */
function classify(filePath) {
  const p = filePath.replace(/\\/g, '/');
  if (p.startsWith('tools/')) return 'tools';
  if (p.startsWith('docs/')) return 'docs';
  if (p.startsWith('openspec/')) return 'openspec';
  if (p.startsWith('packages/')) return 'packages';
  if (p.startsWith('apps/')) return 'apps';
  if (p.includes('test') || p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.endsWith('.spec.ts')) return 'tests';
  if (p === '.' || p === 'package.json' || p === 'pnpm-workspace.yaml' || p === 'turbo.json' || p === '.gitignore') return 'root';
  return 'root';
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * @returns {Promise<{
 *   branch: string|null,
 *   commit: string|null,
 *   isDirty: boolean,
 *   modifiedFiles: Array<{path:string,category:string,inScope:boolean,warning:string|null}>,
 *   scopeViolations: Array<{path:string,type:string}>,
 *   recentCommits: Array<{hash:string,message:string}>,
 * }>}
 */
export async function collectGitInfo() {
  const [branch, commit, statusOut, diffOut] = await Promise.all([
    git('git branch --show-current'),
    git('git rev-parse HEAD'),
    git('git status --porcelain'),
    git('git diff --name-only'),
  ]);

  const shortCommit = commit ? commit.slice(0, 8) : null;
  const isDirty = !!(statusOut);

  // Parse modified files from diff
  const modifiedFiles = [];
  if (diffOut) {
    for (const line of diffOut.split('\n').filter(Boolean)) {
      const cat = classify(line);
      const isProhibited = PROHIBITED_PATHS.some(p => line.startsWith(p));
      const warnings = [];
      if (isProhibited) warnings.push('修改了禁止范围（packages/apps）');
      modifiedFiles.push({
        path: line,
        category: cat,
        inScope: !isProhibited,
        warning: warnings.length > 0 ? warnings.join('；') : null,
      });
    }
  }

  // Scope violations: only packages/** for this project
  const scopeViolations = modifiedFiles.filter(f => f.path.startsWith('packages/'));

  // Recent commits for context
  const logOut = await git('git log --oneline -10');
  const recentCommits = logOut
    ? logOut.split('\n').map(line => {
        const [hash, ...msgParts] = line.split(' ');
        return { hash, message: msgParts.join(' ') };
      })
    : [];

  return {
    branch: branch || null,
    commit: shortCommit,
    isDirty,
    modifiedFiles,
    scopeViolations,
    recentCommits,
  };
}

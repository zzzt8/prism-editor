#!/usr/bin/env node
// generate.mjs — Generate verification.json for a given phase.
// Usage: node tools/prism-control-center/generate.mjs [--phase M0]

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync } from 'fs';

import { collectGitInfo } from './lib/git.mjs';
import { collectSourceDocs, readPreviousHashes } from './lib/source-docs.mjs';
import { checkArtifacts, getArtifactsDir } from './lib/evidence.mjs';
import {
  runVitestM0,
  runTypecheck,
  runBuild,
  scanSkipTodo,
  checkBrowserConfig,
  computeGatesM0,
  computeMilestones,
  computeOverallStatus,
} from './lib/status.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SCHEMA_VERSION = '1.0.0';

// ─── CLI ───────────────────────────────────────────────────────────────────────

const phaseArg = process.argv.includes('--phase')
  ? process.argv[process.argv.indexOf('--phase') + 1]
  : 'M0';

const VERIFICATION_DIR = getArtifactsDir(phaseArg);
const VERIFICATION_FILE = resolve(VERIFICATION_DIR, 'verification.json');

// ─── OpenSpec active changes ───────────────────────────────────────────────────

async function getOpenSpecChanges() {
  const { spawn } = await import('child_process');
  return new Promise((resolve) => {
    const proc = spawn('openspec', ['list', '--json'], { cwd: ROOT, shell: true });
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('close', () => {
      try {
        const data = JSON.parse(out);
        resolve(data.changes || []);
      } catch {
        resolve([]);
      }
    });
    proc.on('error', () => resolve([]));
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const generatedAt = new Date().toISOString();

  console.log(`[generate] Collecting data for phase ${phaseArg}...`);
  console.log(`[generate] Root: ${ROOT}`);
  console.log(`[generate] Output: ${VERIFICATION_FILE}`);

  // 1. Read previous hashes for change detection
  const prevHashes = readPreviousHashes(VERIFICATION_FILE);

  // 2. Git info
  console.log('[generate] Collecting git info...');
  const gitInfo = await collectGitInfo();

  // 3. Source documents
  console.log('[generate] Computing source doc hashes...');
  const sourceDocs = await collectSourceDocs(prevHashes);

  // 4. Evidence files
  console.log('[generate] Checking artifact files...');
  const evidence = await checkArtifacts(phaseArg);

  // 5. Source code scan: skip/todo/only
  console.log('[generate] Scanning for skip/todo/only...');
  const dualExecTest = resolve(ROOT, 'packages/image-ops/src/dual-executor-consistency.test.ts');
  const skipScan = scanSkipTodo(dualExecTest);

  // 6. Browser config check
  console.log('[generate] Checking browser config...');
  const browserConfig = checkBrowserConfig();

  // 7. Run commands
  console.log('[generate] Running vitest (M0 dual-executor test)...');
  const vitestResult = await runVitestM0();
  console.log(`[generate] vitest exit code: ${vitestResult.exitCode}, duration: ${vitestResult.duration}ms`);

  console.log('[generate] Running typecheck...');
  const typecheckResult = await runTypecheck();
  console.log(`[generate] typecheck exit code: ${typecheckResult.exitCode}, duration: ${typecheckResult.duration}ms`);

  console.log('[generate] Running build...');
  const buildResult = await runBuild();
  console.log(`[generate] build exit code: ${buildResult.exitCode}, duration: ${buildResult.duration}ms`);

  // 8. OpenSpec changes
  console.log('[generate] Fetching OpenSpec changes...');
  const openspecChanges = await getOpenSpecChanges();

  // 9. Compute gates
  const gates = computeGatesM0({
    gitInfo,
    vitestResult,
    typecheckResult,
    buildResult,
    skipScan,
    browserConfig,
    evidence,
    sourceDocs,
  });

  // 10. Compute milestones
  const milestones = computeMilestones(gates);

  // 11. Overall status
  const gateStatuses = Object.values(gates).map(g => g.status);
  const overallStatus = computeOverallStatus(gateStatuses);

  // 12. Gate summary
  const gateSummary = {};
  for (const g of Object.values(gates)) {
    gateSummary[g.status] = (gateSummary[g.status] || 0) + 1;
  }

  // 13. Write output
  mkdirSync(VERIFICATION_DIR, { recursive: true });

  const verificationData = {
    schemaVersion: SCHEMA_VERSION,
    phase: phaseArg,
    overallStatus,
    generatedAt,
    git: {
      branch: gitInfo.branch,
      commit: gitInfo.commit,
      isDirty: gitInfo.isDirty,
      modifiedFiles: gitInfo.modifiedFiles,
      scopeViolations: gitInfo.scopeViolations,
      recentCommits: gitInfo.recentCommits.slice(0, 5),
    },
    sourceDocuments: sourceDocs,
    milestones,
    gates,
    artifacts: evidence.files,
    gateSummary,
    openspec: {
      activeChanges: openspecChanges,
    },
    _internal: {
      skipScan,
      browserConfig,
      vitestResult: { exitCode: vitestResult.exitCode, duration: vitestResult.duration },
      typecheckResult: { exitCode: typecheckResult.exitCode, duration: typecheckResult.duration },
      buildResult: { exitCode: buildResult.exitCode, duration: buildResult.duration },
    },
  };

  writeFileSync(VERIFICATION_FILE, JSON.stringify(verificationData, null, 2), 'utf8');

  // 14. Print summary
  console.log('\n========== GENERATION SUMMARY ==========');
  console.log(`Phase:       ${phaseArg}`);
  console.log(`Overall:     ${overallStatus}`);
  console.log(`Gates:       ${Object.entries(gateSummary).map(([s, n]) => `${s}=${n}`).join(', ')}`);
  console.log(`Git:         ${gitInfo.branch} @ ${gitInfo.commit}${gitInfo.isDirty ? ' (dirty)' : ''}`);
  console.log(`Output:      ${VERIFICATION_FILE}`);
  console.log('==========================================\n');

  // Exit with appropriate code
  if (overallStatus === 'PASS') {
    process.exit(0);
  } else if (overallStatus === 'BLOCKED' || overallStatus === 'FAILED') {
    process.exit(2);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[generate] Fatal error:', err);
  process.exit(3);
});

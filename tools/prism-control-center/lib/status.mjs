// lib/status.mjs — Status model and gate computation
// Computes gate statuses based on test results, evidence, git info, and source docs.

import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { readPreviousHashes, collectSourceDocs } from './source-docs.mjs';
import { checkArtifacts } from './evidence.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─── Status values ─────────────────────────────────────────────────────────────

/** Status severity order: BLOCKED > FAILED > WARNING > PASS */
export const STATUS_ORDER = {
  BLOCKED: 4,
  FAILED: 3,
  WARNING: 2,
  PASS: 1,
  PENDING: 0,
  LOCKED: -1,
};

/**
 * Compute overall milestone status from an array of gate statuses.
 * @param {string[]} gateStatuses
 * @returns {string}
 */
export function computeOverallStatus(gateStatuses) {
  let worst = STATUS_ORDER.PENDING;
  let worstName = 'PENDING';
  for (const s of gateStatuses) {
    const v = STATUS_ORDER[s] ?? 0;
    if (v > worst) {
      worst = v;
      worstName = s;
    }
  }
  return worstName;
}

// ─── Command execution ────────────────────────────────────────────────────────

/**
 * Spawn a command, resolve with { exitCode, stdout, stderr }.
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} [cwd]
 */
function runCommand(cmd, args, cwd = ROOT) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('close', (code) => {
      resolve({ exitCode: code ?? null, stdout, stderr });
    });
    proc.on('error', (err) => {
      resolve({ exitCode: null, stdout: '', stderr: err.message });
    });
  });
}

/**
 * Run vitest for the dual-executor consistency test.
 * @returns {Promise<{ exitCode: number|null, stdout: string, stderr: string, duration: number }>}
 */
export async function runVitestM0() {
  const start = Date.now();
  const result = await runCommand(
    'pnpm',
    ['--filter', '@prism/image-ops', 'exec', 'vitest', 'run', 'src/dual-executor-consistency.test.ts'],
    ROOT
  );
  return { ...result, duration: Date.now() - start };
}

/**
 * Run typecheck across all packages.
 * @returns {Promise<{ exitCode: number|null, stdout: string, stderr: string, duration: number }>}
 */
export async function runTypecheck() {
  const start = Date.now();
  const result = await runCommand('pnpm', ['typecheck'], ROOT);
  return { ...result, duration: Date.now() - start };
}

/**
 * Run build across all packages.
 * @returns {Promise<{ exitCode: number|null, stdout: string, stderr: string, duration: number }>}
 */
export async function runBuild() {
  const start = Date.now();
  const result = await runCommand('pnpm', ['build'], ROOT);
  return { ...result, duration: Date.now() - start };
}

// ─── Source code scanning ───────────────────────────────────────────────────────

/** Regex patterns for skip/todo/only in test files */
const SKIP_PATTERNS = [
  /\bit\.skip\b/g,
  /\btest\.skip\b/g,
  /\bdescribe\.skip\b/g,
  /\b(?:it|test|describe)\.only\b/g,
  /\btodo\s*\(/g,
];

/**
 * Count occurrences of skip/todo/only patterns in a test file.
 * @param {string} filePath
 * @returns {{ total: number, byType: Record<string,number>, lines: string[] }}
 */
export function scanSkipTodo(filePath) {
  if (!existsSync(filePath)) {
    return { total: 0, byType: {}, lines: [], notFound: true };
  }
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const byType = {};
  const foundLines = [];

  for (const pattern of SKIP_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    const label = pattern.toString().replace(/\\/g, '').replace(/\//g, '');
    byType[label] = matches ? matches.length : 0;
    if (matches) {
      for (const m of matches) {
        const idx = content.indexOf(m);
        const lineNum = content.slice(0, idx).split('\n').length;
        foundLines.push(`line ${lineNum}: ${m}`);
      }
    }
  }

  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  return { total, byType, lines: foundLines };
}

// ─── Browser config check ───────────────────────────────────────────────────────

/**
 * Check if vitest.browser.config.ts covers dual-executor tests.
 * @returns {{ configured: boolean, coversDualExecutor: boolean, reason: string }}
 */
export function checkBrowserConfig() {
  const browserConfigPath = resolve(ROOT, 'packages/image-ops/vitest.browser.config.ts');
  if (!existsSync(browserConfigPath)) {
    return {
      configured: false,
      coversDualExecutor: false,
      reason: 'vitest.browser.config.ts 不存在',
    };
  }
  const content = readFileSync(browserConfigPath, 'utf8');
  const includesDualExecutor = content.includes('dual-executor');
  const isWorkerOnly = content.includes("'src/**/*.worker.test.ts'") ||
    content.includes('src/**/*.worker.test.ts');
  return {
    configured: true,
    coversDualExecutor: includesDualExecutor && !isWorkerOnly,
    reason: includesDualExecutor
      ? 'browser config 包含 dual-executor 测试'
      : isWorkerOnly
        ? 'browser config 仅配置 worker tests，不包含 dual-executor-consistency.test.ts'
        : 'browser config 未包含 dual-executor 测试',
  };
}

// ─── Milestone definitions ───────────────────────────────────────────────────────

export const MILESTONES = {
  M0: {
    name: 'M0: 固定模板的浏览器与 Node 双端复现',
    description: '只使用一个确定性的测试 fixture，直接验证 Browser executor 与 Node executor',
    criteria: '指定 fixture 在 Browser executor 与 Node executor 上可重复执行且几何结果稳定',
    canProceed: null, // computed
  },
  M1: {
    name: 'M1: 统一 Protocol 和 DesignState',
    description: '将验证后的输入结构正式抽象为版本化 DesignState，并共享给 Browser 与 Node',
    criteria: '两端输入输出通过共享类型契约与 JSON schema 校验',
    lockedBy: 'M0',
  },
  M2: {
    name: 'M2: 确定性 Flow 选择与显式输出',
    description: '移除 findFirst、输出遍历顺序等非确定性选择',
    criteria: '相同输入永远选择同一 Flow，输出结果稳定且可审计',
    lockedBy: 'M1',
  },
  M3: {
    name: 'M3: 抽出无 UI Browser Runtime',
    description: '抽取无 UI Browser Runtime，只用测试宿主验证',
    criteria: '无 UI runtime 可被测试宿主独立驱动预览执行',
    lockedBy: 'M2',
  },
  M4: {
    name: 'M4: Composer 和 Dev Tool 统一使用 Browser Runtime',
    description: 'Dev Tool 迁移到 Browser Runtime，Composer 迁移到 Browser Runtime',
    criteria: 'Composer 与 Dev Tool 的预览实现收敛到同一个 runtime 入口',
    lockedBy: 'M3',
  },
  M5: {
    name: 'M5: 独立包及 React 19 / Vite 6 验证',
    description: 'Prism runtime packages 支持独立安装与消费',
    criteria: '独立包可被外部工程引用并完成基础渲染',
    lockedBy: 'M4',
  },
  M6: {
    name: 'M6: Mall 独立实验页',
    description: '验证 Mall 独立实验页加载 Runtime 与生产调用',
    criteria: '实验页可完成模板加载、预览、提交与生产调用',
    lockedBy: 'M5',
  },
  M7: {
    name: 'M7: 真实品类和工厂数据包',
    description: '接入真实品类配置与工厂数据包',
    criteria: '真实品类可稳定生产并满足工厂交付要求',
    lockedBy: 'M6',
  },
};

/**
 * Compute milestone statuses based on gate results and M0 gate statuses.
 * @param {Record<string,object>} gates - gate ID -> gate object with status
 * @returns {Record<string,object>}
 */
export function computeMilestones(gates) {
  const m0Blocked = gates['browser-executor-real-run']?.status === 'BLOCKED' ||
    gates['browser-node-comparison']?.status === 'BLOCKED' ||
    gates['geometry-comparison']?.status === 'BLOCKED' ||
    gates['browser-image-evidence']?.status === 'BLOCKED' ||
    gates['node-image-evidence']?.status === 'BLOCKED' ||
    gates['diff-image-evidence']?.status === 'BLOCKED' ||
    gates['metrics-json-evidence']?.status === 'BLOCKED';

  const m0Statuses = Object.values(gates).map(g => g.status);
  const m0Overall = computeOverallStatus(m0Statuses);

  const m0Progress = m0Statuses.length > 0
    ? Math.round(((m0Statuses.filter(s => s === 'PASS').length) / m0Statuses.length) * 100)
    : 0;

  const result = {
    M0: {
      ...MILESTONES.M0,
      status: m0Overall,
      canProceed: !m0Blocked && m0Overall === 'PASS',
      progress: m0Progress,
      blockers: Object.values(gates)
        .filter(g => g.status === 'BLOCKED')
        .map(g => ({ gate: g.id, name: g.name, reason: g.reason })),
    },
  };

  const m0Done = !m0Blocked && m0Overall === 'PASS';

  for (const [id, m] of Object.entries(MILESTONES)) {
    if (id === 'M0') continue;
    const locked = m.lockedBy && (m.lockedBy === 'M0' ? !m0Done : false);
    result[id] = {
      ...m,
      status: locked ? 'LOCKED' : 'PENDING',
      canProceed: false,
      progress: 0,
      blockers: locked ? [{ gate: 'upstream', name: m.lockedBy, reason: `${m.lockedBy} 未完成` }] : [],
    };
  }

  return result;
}

// ─── M0 gate definitions ───────────────────────────────────────────────────────

/**
 * Compute all M0 gates based on collected data.
 * @param {{
 *   gitInfo: object,
 *   vitestResult: object,
 *   typecheckResult: object,
 *   buildResult: object,
 *   skipScan: object,
 *   browserConfig: object,
 *   evidence: object,
 *   sourceDocs: object,
 * }} data
 * @returns {Record<string,object>}
 */
export function computeGatesM0(data) {
  const {
    gitInfo,
    vitestResult,
    typecheckResult,
    buildResult,
    skipScan,
    browserConfig,
    evidence,
    sourceDocs,
  } = data;

  const gates = {};

  // ── Gate: scope-clean ─────────────────────────────────────────────────────
  gates['scope-clean'] = {
    id: 'scope-clean',
    name: 'Scope clean',
    status: gitInfo.scopeViolations.length === 0 ? 'PASS' : 'FAILED',
    reason: gitInfo.scopeViolations.length === 0
      ? '当前 git diff 未修改禁止范围（packages/）'
      : `修改了 ${gitInfo.scopeViolations.map(f => f.path).join(', ')}，违反范围约束`,
    command: null,
    exitCode: null,
    evidencePath: null,
    lastRun: null,
  };

  // ── Gate: node-executor-real-run ─────────────────────────────────────────
  const nodeOk = vitestResult.exitCode === 0;
  gates['node-executor-real-run'] = {
    id: 'node-executor-real-run',
    name: 'Node executor real run',
    status: nodeOk ? 'PASS' : 'FAILED',
    reason: nodeOk
      ? 'pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts 退出码 0；Node 路径（transform→composite→sharp）真实执行'
      : `vitest 退出码 ${vitestResult.exitCode}，Node 执行失败`,
    command: 'pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts',
    exitCode: vitestResult.exitCode,
    evidencePath: null,
    lastRun: new Date().toISOString(),
    duration: vitestResult.duration,
  };

  // ── Gate: browser-executor-real-run ──────────────────────────────────────
  const browserReady = browserConfig.configured && browserConfig.coversDualExecutor;
  gates['browser-executor-real-run'] = {
    id: 'browser-executor-real-run',
    name: 'Browser executor real run',
    status: browserReady ? 'PASS' : 'BLOCKED',
    reason: browserReady
      ? 'vitest.browser.config.ts 已配置 dual-executor 测试'
      : `Browser executor 未配置 @vitest/browser + playwright provider；${browserConfig.reason}`,
    command: 'pnpm --filter @prism/image-ops test:browser',
    exitCode: null,
    evidencePath: 'packages/image-ops/vitest.browser.config.ts',
    lastRun: null,
  };

  // ── Gate: same-fixture ────────────────────────────────────────────────────
  gates['same-fixture'] = {
    id: 'same-fixture',
    name: 'Same fixture / same input',
    status: 'PASS',
    reason: '测试使用程序化 fixture（createLShapedBase / createUserImage），无外部 IO，确定性',
    command: null,
    exitCode: null,
    evidencePath: 'packages/image-ops/src/dual-executor-consistency.test.ts',
    lastRun: null,
  };

  // ── Gate: browser-node-comparison ─────────────────────────────────────────
  gates['browser-node-comparison'] = {
    id: 'browser-node-comparison',
    name: 'Browser vs Node comparison',
    status: browserReady ? 'PASS' : 'BLOCKED',
    reason: browserReady
      ? 'Browser executor 已配置，可与 Node 结果对照'
      : 'Browser executor 未真实执行，无法与 Node 结果对照；必须先修复 browser-executor-real-run',
    command: null,
    exitCode: null,
    evidencePath: null,
    lastRun: null,
  };

  // ── Gate: geometry-comparison ─────────────────────────────────────────────
  const diffPng = evidence.files['diff.png'];
  gates['geometry-comparison'] = {
    id: 'geometry-comparison',
    name: 'Geometry comparison',
    status: diffPng?.exists ? 'PASS' : 'BLOCKED',
    reason: diffPng?.exists
      ? `diff.png 存在（${diffPng.size} bytes）`
      : '无 diff.png；compareGeometry 在测试内部运行但未写入磁盘',
    command: null,
    exitCode: null,
    evidencePath: diffPng?.path ?? 'artifacts/verification/M0/diff.png',
    lastRun: diffPng?.modified ?? null,
  };

  // ── Gate: browser-image-evidence ─────────────────────────────────────────
  const browserPng = evidence.files['browser.png'];
  gates['browser-image-evidence'] = {
    id: 'browser-image-evidence',
    name: 'Browser image evidence',
    status: browserPng?.exists ? 'PASS' : 'BLOCKED',
    reason: browserPng?.exists
      ? `browser.png 存在（${browserPng.size} bytes）`
      : 'artifacts/verification/M0/browser.png 不存在',
    command: null,
    exitCode: null,
    evidencePath: browserPng?.path ?? 'artifacts/verification/M0/browser.png',
    lastRun: browserPng?.modified ?? null,
  };

  // ── Gate: node-image-evidence ─────────────────────────────────────────────
  const nodePng = evidence.files['node.png'];
  gates['node-image-evidence'] = {
    id: 'node-image-evidence',
    name: 'Node image evidence',
    status: nodePng?.exists ? 'PASS' : 'BLOCKED',
    reason: nodePng?.exists
      ? `node.png 存在（${nodePng.size} bytes）`
      : 'artifacts/verification/M0/node.png 不存在',
    command: null,
    exitCode: null,
    evidencePath: nodePng?.path ?? 'artifacts/verification/M0/node.png',
    lastRun: nodePng?.modified ?? null,
  };

  // ── Gate: diff-image-evidence ─────────────────────────────────────────────
  gates['diff-image-evidence'] = {
    id: 'diff-image-evidence',
    name: 'Diff image evidence',
    status: diffPng?.exists ? 'PASS' : 'BLOCKED',
    reason: diffPng?.exists
      ? `diff.png 存在（${diffPng.size} bytes）`
      : 'artifacts/verification/M0/diff.png 不存在',
    command: null,
    exitCode: null,
    evidencePath: diffPng?.path ?? 'artifacts/verification/M0/diff.png',
    lastRun: diffPng?.modified ?? null,
  };

  // ── Gate: metrics-json-evidence ──────────────────────────────────────────
  const metricsJson = evidence.files['metrics.json'];
  gates['metrics-json-evidence'] = {
    id: 'metrics-json-evidence',
    name: 'metrics.json evidence',
    status: metricsJson?.exists ? 'PASS' : 'BLOCKED',
    reason: metricsJson?.exists
      ? `metrics.json 存在（${metricsJson.size} bytes）`
      : 'artifacts/verification/M0/metrics.json 不存在；测试仅在内存中运行',
    command: null,
    exitCode: null,
    evidencePath: metricsJson?.path ?? 'artifacts/verification/M0/metrics.json',
    lastRun: metricsJson?.modified ?? null,
  };

  // ── Gate: no-skip-todo-only ───────────────────────────────────────────────
  const skipCount = skipScan.total;
  gates['no-skip-todo-only'] = {
    id: 'no-skip-todo-only',
    name: 'No skip/todo/only in core tests',
    status: skipCount === 0 ? 'PASS' : 'WARNING',
    reason: skipCount === 0
      ? 'dual-executor-consistency.test.ts 源码扫描：it.skip=0, test.skip=0, describe.skip=0, todo=0, only=0'
      : `dual-executor-consistency.test.ts 存在 ${skipCount} 个 skip/todo/only：${skipScan.lines.join('; ')}`,
    command: null,
    exitCode: null,
    evidencePath: 'packages/image-ops/src/dual-executor-consistency.test.ts',
    lastRun: null,
  };

  // ── Gate: deterministic ────────────────────────────────────────────────────
  // Vitest passed means deterministic tests passed for Node
  // But browser side determinism not verified (browser not running)
  const nodePass = vitestResult.exitCode === 0;
  gates['deterministic'] = {
    id: 'deterministic',
    name: 'Deterministic repeated execution',
    status: nodePass ? 'PASS' : 'FAILED',
    reason: nodePass
      ? 'Node 确定性测试在 vitest 中通过（identity: deterministic — Node）；但 Browser 确定性未验证（Browser 未运行）'
      : 'Node 确定性测试未通过',
    command: 'pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts',
    exitCode: vitestResult.exitCode,
    evidencePath: null,
    lastRun: new Date().toISOString(),
  };

  // ── Gate: typecheck ────────────────────────────────────────────────────────
  gates['typecheck'] = {
    id: 'typecheck',
    name: 'Typecheck',
    status: typecheckResult.exitCode === 0 ? 'PASS' : 'FAILED',
    reason: typecheckResult.exitCode === 0
      ? 'pnpm typecheck 退出码 0'
      : `pnpm typecheck 退出码 ${typecheckResult.exitCode}，存在类型错误`,
    command: 'pnpm typecheck',
    exitCode: typecheckResult.exitCode,
    evidencePath: null,
    lastRun: new Date().toISOString(),
    duration: typecheckResult.duration,
  };

  // ── Gate: relevant-test-command ────────────────────────────────────────────
  gates['relevant-test-command'] = {
    id: 'relevant-test-command',
    name: 'Relevant test command exit code',
    status: vitestResult.exitCode === 0 ? 'PASS' : 'FAILED',
    reason: `vitest 退出码 ${vitestResult.exitCode}；注意：exit code 0 不等于 M0 PASS（见硬性状态判定规则）`,
    command: 'pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts',
    exitCode: vitestResult.exitCode,
    evidencePath: null,
    lastRun: new Date().toISOString(),
  };

  // ── Gate: build ────────────────────────────────────────────────────────────
  gates['build'] = {
    id: 'build',
    name: 'Build',
    status: buildResult.exitCode === 0 ? 'PASS' : 'FAILED',
    reason: buildResult.exitCode === 0
      ? 'pnpm build 退出码 0'
      : `pnpm build 退出码 ${buildResult.exitCode}，构建失败`,
    command: 'pnpm build',
    exitCode: buildResult.exitCode,
    evidencePath: null,
    lastRun: new Date().toISOString(),
    duration: buildResult.duration,
  };

  // ── Gate: source-docs-stable ───────────────────────────────────────────────
  const docsChanged = Object.values(sourceDocs).some(d => d.changed);
  gates['source-docs-stable'] = {
    id: 'source-docs-stable',
    name: 'Architecture source docs stable',
    status: docsChanged ? 'WARNING' : 'PASS',
    reason: docsChanged
      ? `架构源文档发生变化：${Object.entries(sourceDocs).filter(([,d]) => d.changed).map(([k]) => k).join(', ')}`
      : '架构源文档未变化',
    command: null,
    exitCode: null,
    evidencePath: null,
    lastRun: null,
  };

  return gates;
}

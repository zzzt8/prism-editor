/**
 * M0 Driver — Main scheduling script.
 *
 * Responsibilities:
 * 1. Create a temporary artifact directory
 * 2. Start Vite dev server for the Browser Test Host page
 * 3. Launch Playwright Chromium
 * 4. For each scenario: run Browser workflow (via page.evaluate), run Node workflow (via Sharp), compare
 * 5. Write per-scenario artifacts
 * 6. Generate diff.png and metrics.json
 * 7. Validate artifacts (non-empty, dimensions correct, non-transparent)
 * 8. Atomic replace into artifacts/verification/M0/ — only on full success
 * 9. Clean up: close Chromium, stop Vite
 *
 * Usage: pnpm --filter @prism/image-ops exec node --import tsx _m0_evidence/driver/m0-driver.ts
 *
 * Constraints:
 * - NO new dependencies (uses already-installed playwright@1.58.2)
 * - NO lockfile changes
 * - NO protocol changes
 * - Single-run, single-shot, exit code reflects overall pass/fail
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, renameSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, ChildProcess } from 'node:child_process';
import { createServer } from 'vite';
import { chromium, Browser, Page } from 'playwright';
import sharp from 'sharp';

const sleepSync = (ms: number) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
};

import type {
  M0Scenario,
  M0ScenarioResult,
  M0ImageRef,
  M0ScenarioHashes,
} from '../shared/types';
import {
  M0_SCENARIOS,
  workflowHash,
  fixtureHash,
  buildLShapedBase,
  buildUserImage,
  getLShapedBaseSpec,
  getUserImageSpec,
} from '../shared';
import { compareGeometry, computeGeometryMetrics } from './compare-geometry';
import { generateDiffImage, imageDataToPngBuffer } from './diff-generator';
import { writeMetricsJson, hashBuffer, M0_THRESHOLDS } from './metrics-writer';
import { runNodeWorkflowSharp } from './node-workflow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const FINAL_ARTIFACT_DIR = join(REPO_ROOT, 'artifacts', 'verification', 'M0');
const RUNS_PER_SCENARIO = 3;

interface RunResult {
  scenario: M0Scenario;
  browser: { width: number; height: number; imageData: ImageData; pngBytes: Buffer };
  node: { width: number; height: number; imageData: ImageData; pngBytes: Buffer };
  diffPath: string;
  browserPath: string;
  nodePath: string;
  hashes: M0ScenarioHashes;
  fileHashes: { browser: string; node: string; diff: string };
  metrics: ReturnType<typeof compareGeometry>;
}

class Driver {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private viteProc: ChildProcess | null = null;
  private vitePort: number = 0;
  private tmpDir = '';
  private finalDir = '';

  async start(): Promise<void> {
    this.tmpDir = join(FINAL_ARTIFACT_DIR, '..', '.m0-tmp-' + Date.now());
    this.finalDir = FINAL_ARTIFACT_DIR;
    mkdirSync(this.tmpDir, { recursive: true });
    mkdirSync(join(this.tmpDir, 'scenarios'), { recursive: true });
    console.log(`[m0] tmp dir: ${this.tmpDir}`);

    await this.startVite();
    console.log(`[m0] Vite dev server started at http://localhost:${this.vitePort}`);

    this.browser = await chromium.launch({ headless: true, executablePath: resolveChromiumExecutable() });
    this.page = await this.browser.newPage();
    await this.page.goto(`http://localhost:${this.vitePort}/_m0_evidence/browser-runtime-host/`);
    await this.page.waitForFunction(() => window.__M0_RUNTIME__ !== undefined, { timeout: 30000 });
    console.log(`[m0] Browser page loaded: window.__M0_RUNTIME__ ready`);
  }

  private async startVite(): Promise<void> {
    const configFile = join(__dirname, '..', 'browser-runtime-host', 'vite.config.ts');
    const server = await createServer({
      configFile,
      server: { port: 0, strictPort: false, fs: { strict: false } },
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (typeof address === 'object' && address) {
      this.vitePort = address.port;
    } else {
      throw new Error('Failed to determine Vite port');
    }
    // We don't have a clean shutdown for createServer; rely on process exit.
    // For better cleanup, we can call server.close() in stop().
    this._viteServer = server;
  }

  private _viteServer: Awaited<ReturnType<typeof createServer>> | null = null;

  async run(): Promise<number> {
    const results: RunResult[] = [];

    for (const scenario of M0_SCENARIOS) {
      console.log(`[m0] running scenario: ${scenario.id} x${RUNS_PER_SCENARIO}`);
      const runResults: RunResult[] = [];
      for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
        try {
          const r = await this.runScenario(scenario, i);
          runResults.push(r);
        } catch (e) {
          console.error(`[m0] scenario ${scenario.id} run ${i} failed:`, e);
          throw e;
        }
      }
      // Take the LAST run as the canonical result for the scenario.
      results.push(runResults[runResults.length - 1]);
    }

    // Build scenario results + worst case from the FINAL run of each scenario.
    const scenarioResults: M0ScenarioResult[] = await Promise.all(
      results.map(async (r) => this.toScenarioResult(r)),
    );

    // Determine worst-case scenario (by an arbitrary metric).
    const worst = scenarioResults.reduce((acc, s) => {
      if (s.diff.interiorRgbMae > acc.diff.interiorRgbMae) return s;
      return acc;
    });
    console.log(`[m0] worst-case scenario: ${worst.id}`);

    // Copy worst-case browser.png / node.png / diff.png to root.
    const worstBrowserSrc = join(this.tmpDir, 'scenarios', worst.id + '-browser.png');
    const worstNodeSrc = join(this.tmpDir, 'scenarios', worst.id + '-node.png');
    const worstDiffSrc = join(this.tmpDir, 'scenarios', worst.id + '-diff.png');
    copyFileSync(worstBrowserSrc, join(this.tmpDir, 'browser.png'));
    copyFileSync(worstNodeSrc, join(this.tmpDir, 'node.png'));
    copyFileSync(worstDiffSrc, join(this.tmpDir, 'diff.png'));

    // Write metrics.json (single write)
    writeMetricsJson(join(this.tmpDir, 'metrics.json'), scenarioResults, M0_THRESHOLDS);

    // Validate all artifacts.
    const valid = this.validateArtifacts();
    if (!valid) {
      console.error(`[m0] artifact validation FAILED, leaving existing artifacts in place`);
      rmSync(this.tmpDir, { recursive: true, force: true });
      return 1;
    }

    // Atomic replace.
    this.atomicReplace();
    console.log(`[m0] SUCCESS — artifacts written to ${this.finalDir}`);
    return 0;
  }

  private async runScenario(scenario: M0Scenario, runIdx: number): Promise<RunResult> {
    // Build fixtures in Node — the Browser host will get its own copy from page state.
    const lShapedBase = buildLShapedBase();
    const userImage = buildUserImage();

    // 1. Browser run via page.evaluate
    const browserResult = await this.page!.evaluate(async ([scen, baseW, baseH, baseBytes, userW, userH, userBytes]: [
      unknown, number, number, number[], number, number, number[]
    ]) => {
      const lShapedBase = new ImageData(
        Uint8ClampedArray.from(baseBytes), baseW, baseH,
      );
      const userImage = new ImageData(
        Uint8ClampedArray.from(userBytes), userW, userH,
      );
      const base64 = await (window as any).__M0_RUNTIME__.runBrowserWorkflow(scen as any, lShapedBase, userImage);
      return {
        width: 0,
        height: 0,
        pngBytesBase64: base64.pngBase64,
        elapsedMs: base64.elapsedMs,
      };
    }, [
      scenario,
      lShapedBase.width,
      lShapedBase.height,
      Array.from(lShapedBase.data),
      userImage.width,
      userImage.height,
      Array.from(userImage.data),
    ]);

    const browserPngBuf = Buffer.from(browserResult.pngBytesBase64, 'base64');
    // Decode PNG back to raw RGBA pixels via sharp to avoid round-tripping the
    // entire pixel buffer through `page.evaluate`.
    const browserDecoded = await sharp(browserPngBuf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const browserImageData = makeImageDataNode(
      Uint8ClampedArray.from(browserDecoded.data),
      browserDecoded.info.width,
      browserDecoded.info.height,
    );

    // 2. Node run via Sharp.
    const { imageData: nodeImageData, pngBytes: nodePngBuf } =
      await runNodeWorkflowSharp(scenario, lShapedBase, userImage);

    // 3. Compare geometry metrics.
    const metrics = compareGeometry(browserImageData, nodeImageData);

    // 4. Write artifacts.
    const suffix = `-${scenario.id}-run${runIdx}`;
    const browserPath = join(this.tmpDir, 'scenarios', scenario.id + '-browser.png');
    const nodePath = join(this.tmpDir, 'scenarios', scenario.id + '-node.png');
    const diffPath = join(this.tmpDir, 'scenarios', scenario.id + '-diff.png');

    writeFileSync(browserPath, browserPngBuf);
    writeFileSync(nodePath, nodePngBuf);
    const diffBuf = await generateDiffImage(browserImageData, nodeImageData);
    writeFileSync(diffPath, diffBuf);

    return {
      scenario,
      browser: {
        width: browserImageData.width,
        height: browserImageData.height,
        imageData: browserImageData,
        pngBytes: browserPngBuf,
      },
      node: {
        width: nodeImageData.width,
        height: nodeImageData.height,
        imageData: nodeImageData,
        pngBytes: nodePngBuf,
      },
      diffPath,
      browserPath,
      nodePath,
      hashes: {
        fixture: 'sha256:' + fixtureHash(getLShapedBaseSpec()) + '/' + fixtureHash(getUserImageSpec()),
        workflow: workflowHash(scenario),
      },
      fileHashes: {
        browser: hashBuffer(browserPngBuf),
        node: hashBuffer(nodePngBuf),
        diff: hashBuffer(diffBuf),
      },
      metrics,
    };
  }

  private async toScenarioResult(r: RunResult): Promise<M0ScenarioResult> {
    const browserMetrics = computeGeometryMetrics(r.browser.imageData);
    const nodeMetrics = computeGeometryMetrics(r.node.imageData);
    const scenarioHashesBase = r.hashes;
    return {
      id: r.scenario.id,
      name: r.scenario.name,
      browser: {
        width: r.browser.width,
        height: r.browser.height,
        nonTransparentPixelCount: browserMetrics.alphaPixelCount,
        filePath: r.browserPath,
        fileHash: r.fileHashes.browser,
      },
      node: {
        width: r.node.width,
        height: r.node.height,
        nonTransparentPixelCount: nodeMetrics.alphaPixelCount,
        filePath: r.nodePath,
        fileHash: r.fileHashes.node,
      },
      diff: r.metrics,
      hashes: scenarioHashesBase,
    };
  }

  private validateArtifacts(): boolean {
    const required = [
      'metrics.json',
      'browser.png',
      'node.png',
      'diff.png',
      ...M0_SCENARIOS.flatMap((s) => [
        `scenarios/${s.id}-browser.png`,
        `scenarios/${s.id}-node.png`,
        `scenarios/${s.id}-diff.png`,
      ]),
    ];
    for (const rel of required) {
      const abs = join(this.tmpDir, rel);
      if (!existsSync(abs)) {
        console.error(`[m0] missing: ${rel}`);
        return false;
      }
      const st = statSync(abs);
      if (st.size === 0) {
        console.error(`[m0] empty: ${rel}`);
        return false;
      }
    }
    // Read metrics.json and ensure no scenario has zero non-transparent pixels.
    const metrics = JSON.parse(readFileSync(join(this.tmpDir, 'metrics.json'), 'utf-8'));
    for (const s of metrics.scenarios) {
      if (s.browser.nonTransparentPixelCount === 0 || s.node.nonTransparentPixelCount === 0) {
        console.error(`[m0] scenario ${s.id} produced all-transparent output`);
        return false;
      }
      if (!s.diff.outputDimensionsMatch) {
        console.error(`[m0] scenario ${s.id} dimensions don't match`);
        return false;
      }
    }
    return true;
  }

  private atomicReplace(): void {
    if (existsSync(this.finalDir)) {
      // Move existing to a backup, then move tmp -> final, then remove backup.
      const backupDir = this.finalDir + '.backup-' + Date.now();
      try {
        renameSync(this.finalDir, backupDir);
      } catch (e) {
        // On Windows the rename can fail with EBUSY when another handle (git
        // index, antivirus, etc.) is briefly holding a file in the target
        // directory. Retry once after a short delay.
        const err = e as NodeJS.ErrnoException;
        if (err.code !== 'EBUSY' && err.code !== 'EPERM') throw err;
        const start = Date.now();
        while (Date.now() - start < 5000) {
          try {
            renameSync(this.finalDir, backupDir);
            break;
          } catch (retryErr) {
            const re = retryErr as NodeJS.ErrnoException;
            if (re.code !== 'EBUSY' && re.code !== 'EPERM') throw re;
            sleepSync(100);
          }
        }
        if (!existsSync(backupDir)) throw err;
      }
      try {
        renameSync(this.tmpDir, this.finalDir);
        rmSync(backupDir, { recursive: true, force: true });
      } catch (e) {
        // Roll back: move backup back, remove tmp.
        try {
          rmSync(this.tmpDir, { recursive: true, force: true });
        } catch { /* ignore */ }
        if (existsSync(backupDir)) {
          renameSync(backupDir, this.finalDir);
        }
        throw e;
      }
    } else {
      mkdirSync(dirname(this.finalDir), { recursive: true });
      renameSync(this.tmpDir, this.finalDir);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this._viteServer) await this._viteServer.close();
    } catch { /* ignore */ }
    try {
      if (this.browser) await this.browser.close();
    } catch { /* ignore */ }
  }
}

function copyFileSync(src: string, dst: string): void {
  writeFileSync(dst, readFileSync(src));
}

function makeImageDataNode(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const Ctor = (globalThis as { ImageData?: new (d: Uint8ClampedArray, w: number, h: number) => ImageData }).ImageData;
  if (typeof Ctor === 'function') {
    return new Ctor(data, width, height);
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

function resolveChromiumExecutable(): string | undefined {
  const defaultPath = chromium.executablePath();
  if (defaultPath && existsSync(defaultPath)) return defaultPath;
  const base = process.env['PLAYWRIGHT_BROWSERS_PATH']
    ?? join(process.env['LOCALAPPDATA'] ?? '', 'ms-playwright');
  if (!existsSync(base)) return undefined;
  const headlessCandidates = readdirSync(base)
    .filter((n) => /^chromium_headless_shell-\d+$/.test(n))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const dir of headlessCandidates) {
    const exe = join(base, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
    if (existsSync(exe)) return exe;
  }
  const fullCandidates = readdirSync(base)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const dir of fullCandidates) {
    const exe = join(base, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

async function main(): Promise<number> {
  const driver = new Driver();
  let exitCode = 1;
  try {
    await driver.start();
    exitCode = await driver.run();
  } catch (e) {
    console.error('[m0] driver crashed:', e);
    exitCode = 1;
  } finally {
    await driver.stop();
  }
  process.exit(exitCode);
}

main();

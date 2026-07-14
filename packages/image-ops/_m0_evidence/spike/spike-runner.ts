/**
 * M0 P0 Spike Runner — Standalone Node script.
 *
 * NOT a vitest test. Exits with code 1 on any spike check failure.
 *
 * Steps:
 * 1. Start Vite dev server (browser-runtime-host)
 * 2. Launch Playwright Chromium
 * 3. Goto the test host page
 * 4. Run each spike check via page.evaluate
 * 5. Report each check's pass/fail
 * 6. Exit 0 if all 6 checks pass, exit 1 otherwise
 *
 * Hard-fail conditions:
 * - Cannot launch Chromium
 * - Vite dev server fails to start
 * - Page does not register window.__M0_RUNTIME__ within timeout
 * - Any individual spike check fails
 *
 * NEVER falls back to node + canvas polyfill.
 */

import { createServer, ViteDevServer } from 'vite';
import { chromium, Browser } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPIKE_CHECKS } from './spike-checks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VITE_CONFIG = join(__dirname, '..', 'browser-runtime-host', 'vite.config.ts');

interface CheckResult {
  id: string;
  description: string;
  passed: boolean;
  detail: unknown;
  error?: string;
}

async function runSpikeChecks(
  page: import('playwright').Page,
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const check of SPIKE_CHECKS) {
    try {
      const detail = await page.evaluate(check.script);
      let passed = true;
      const errorMsg: string | undefined = undefined;

      switch (check.id) {
        case 'chromium-userAgent':
          passed =
            typeof detail === 'object' && detail !== null &&
            (detail as any).isChrome === true &&
            (detail as any).hasNode === false;
          break;
        case 'has-window-document':
          passed =
            typeof detail === 'object' && detail !== null &&
            (detail as any).hasWindow === true &&
            (detail as any).hasDocument === true &&
            (detail as any).hasHTMLCanvasElement === true;
          break;
        case 'offscreencanvas-available':
          passed =
            typeof detail === 'object' && detail !== null &&
            typeof (detail as any).width === 'number' &&
            (detail as any).width === 10 &&
            (detail as any).error === undefined;
          break;
        case 'no-canvas-npm-polyfill':
          passed =
            typeof detail === 'object' && detail !== null &&
            (detail as any).hasCreateCanvas === false &&
            (detail as any).hasBuffer === false;
          break;
        case 'no-test-setup-polyfill':
          passed =
            typeof detail === 'object' && detail !== null &&
            (detail as any).isNative === true;
          break;
        case 'minimal-identity-workflow': {
          const d = detail as any;
          passed =
            typeof d === 'object' && d !== null &&
            d.runtimeMissing !== true &&
            typeof d.width === 'number' &&
            d.width > 0 &&
            typeof d.pngBytesLen === 'number' &&
            d.pngBytesLen > 0;
          break;
        }
      }

      results.push({
        id: check.id,
        description: check.description,
        passed,
        detail,
        error: errorMsg,
      });
    } catch (e) {
      results.push({
        id: check.id,
        description: check.description,
        passed: false,
        detail: null,
        error: String(e),
      });
    }
  }
  return results;
}

function reportResults(results: CheckResult[]): boolean {
  let allPass = true;
  console.log('\n=== M0 P0 Browser Spike Results ===');
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`${icon} [${r.id}] ${r.description}`);
    if (!r.passed) {
      allPass = false;
      console.log(`  detail: ${JSON.stringify(r.detail)}`);
      if (r.error) console.log(`  error:  ${r.error}`);
    }
  }
  console.log('===================================\n');
  return allPass;
}

async function main(): Promise<void> {
  let viteServer: ViteDevServer | null = null;
  let browser: Browser | null = null;
  let exitCode = 1;

  try {
    console.log('[spike] starting Vite dev server…');
    viteServer = await createServer({
      configFile: VITE_CONFIG,
      server: { port: 0, strictPort: false, fs: { strict: false } },
    });
    await viteServer.listen();
    const address = viteServer.httpServer?.address();
    if (typeof address !== 'object' || !address) {
      throw new Error('Vite did not bind a port');
    }
    const port = address.port;
    console.log(`[spike] Vite at http://localhost:${port}`);

    console.log('[spike] launching Chromium…');
    const executablePath = resolveChromiumExecutable();
    browser = await chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('pageerror', (e) => console.error('[spike] page error:', e));
    page.on('console', (m) => console.log(`[spike] page console [${m.type()}]:`, m.text()));

    console.log('[spike] navigating to test host…');
    await page.goto(`http://localhost:${port}/_m0_evidence/browser-runtime-host/`);
    await page.waitForFunction(
      () => (window as any).__M0_RUNTIME__ !== undefined,
      { timeout: 30000 },
    );
    console.log('[spike] window.__M0_RUNTIME__ registered');

    const results = await runSpikeChecks(page);
    const ok = reportResults(results);

    if (!ok) {
      console.error('[spike] FAIL — Spike checks failed. Will NOT fall back to node polyfill.');
      exitCode = 1;
    } else {
      console.log('[spike] PASS — All 6 spike checks pass. Real Chromium ready.');
      exitCode = 0;
    }
  } catch (e) {
    console.error('[spike] CRASH:', e);
    exitCode = 1;
  } finally {
    try { if (browser) await browser.close(); } catch { /* ignore */ }
    try { if (viteServer) await viteServer.close(); } catch { /* ignore */ }
    // Give Windows a brief moment to release file handles on the artifacts dir
    // before the next pipeline stage (m0-driver) tries to rename it.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  process.exit(exitCode);
}

main();

/**
 * Resolve a usable Chromium / chrome-headless-shell executable.
 *
 * Playwright's bundled chromium revision differs across versions, but the browser
 * binaries are forward-compatible enough to launch from a different revision's
 * install directory. This probe picks the newest installed Playwright Chromium
 * build on the machine so the M0 spike can run without re-downloading.
 *
 * Falls back to Playwright's default `chromium.executablePath()` if nothing
 * is found locally.
 */
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

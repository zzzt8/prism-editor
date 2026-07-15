/**
 * Chromium Test Runner
 *
 * Launches Playwright Chromium to run browser-runtime tests.
 * Uses M0 infrastructure for Chromium executable resolution.
 */

import { chromium, type Browser, type Page } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import http from 'http';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find Chromium executable path.
 * This uses the same approach as M0 infrastructure.
 */
async function findChromiumExecutable(): Promise<string> {
  // Try to find Playwright's bundled Chromium
  const chromiumPaths = [
    // Playwright bundled Chromium
    resolve(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright', '.local-chromium', 'chrome-win', 'chrome.exe'),
    resolve(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-*', 'chrome-win', 'chrome.exe'),
    // Try playwright CLI
  ];

  for (const pattern of chromiumPaths) {
    // Simple check - just try the most common location
  }

  // Use Playwright's built-in chromium
  return chromium.executablePath();
}

/**
 * Create a simple static file server.
 */
function createServer(port: number, rootDir: string): http.Server {
  return http.createServer((req, res) => {
    let filePath = path.join(rootDir, req.url || '/chromium-host.html');

    // Default to chromium-host.html
    if (req.url === '/' || req.url === '') {
      filePath = path.join(rootDir, 'chromium-host.html');
    }

    const ext = path.extname(filePath);
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.css': 'text/css',
    };

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(data);
    });
  });
}

/**
 * Wait for server to be ready.
 */
async function waitForServer(host: string, port: number, timeoutMs: number = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`http://${host}:${port}`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw new Error(`Server not ready after ${timeoutMs}ms`);
}

/**
 * Run Chromium test.
 */
export interface ChromiumTestResult {
  success: boolean;
  renderId?: string;
  status?: string;
  outputsCount?: number;
  error?: string;
  pageUrl: string;
}

/**
 * Execute browser-runtime in real Chromium.
 */
export async function runChromiumTest(options: {
  hostHtmlPath?: string;
  port?: number;
} = {}): Promise<ChromiumTestResult> {
  const port = options.port || 3456;
  const rootDir = options.hostHtmlPath
    ? dirname(options.hostHtmlPath)
    : resolve(__dirname);

  // Start server
  const server = createServer(port, rootDir);

  await new Promise<void>((resolve) => {
    server.listen(port, 'localhost', () => resolve());
  });

  try {
    // Wait for server
    await waitForServer('localhost', port);

    // Launch Chromium
    const chromiumPath = await findChromiumExecutable();
    const browser = await chromium.launch({
      executablePath: chromiumPath,
      headless: true,
    });

    try {
      const page = await browser.newPage();

      // Navigate to test page
      const pageUrl = `http://localhost:${port}/chromium-host.html`;
      await page.goto(pageUrl);

      // Wait for status to be 'ready' or 'error'
      await page.waitForFunction(
        () => {
          const status = document.getElementById('status');
          return status && (status.textContent === 'ready' || status.textContent === 'error');
        },
        { timeout: 30000 }
      );

      // Get result
      const result = await page.evaluate(() => {
        const resultEl = document.getElementById('result');
        const statusEl = document.getElementById('status');
        return {
          status: statusEl?.textContent,
          result: resultEl?.textContent,
          runtime: (window as any).__M3_RUNTIME__,
          error: (window as any).__M3_ERROR__,
        };
      });

      await browser.close();

      if (result.status === 'error') {
        return {
          success: false,
          error: result.error?.message || result.result || 'Unknown error',
          pageUrl,
        };
      }

      const parsed = JSON.parse(result.result || '{}');
      return {
        success: true,
        renderId: parsed.renderId,
        status: parsed.status,
        outputsCount: parsed.outputsCount,
        pageUrl,
      };
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Chromium test runner...');
  console.log(`Chromium path: ${await findChromiumExecutable()}`);

  runChromiumTest()
    .then((result) => {
      console.log('\nTest Result:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Test runner error:', err);
      process.exit(1);
    });
}

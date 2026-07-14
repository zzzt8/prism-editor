#!/usr/bin/env node
// serve.mjs — Local HTTP server for Prism Visual Control Center
// Usage: node tools/prism-control-center/serve.mjs [--port 8080] [--generate]
//   --generate  Run generate.mjs before serving (default: true)
//   --port N    Port to listen on (default: 8080)
//   --check     Check-only mode: generate then exit (exit code = gate status)

import { resolve } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '127.0.0.1';

// ─── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const portArg = args.includes('--port')
  ? parseInt(args[args.indexOf('--port') + 1]) || DEFAULT_PORT
  : DEFAULT_PORT;
const doGenerate = !args.includes('--no-generate') && !args.includes('--check');
const doCheck = args.includes('--check');
const doServe = !doCheck;

// ─── Subprocess runner ────────────────────────────────────────────────────────

function runProc(cmd, args2) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args2, { cwd: ROOT, shell: true });
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { out += d; });
    proc.on('close', (code) => resolve({ code, out }));
    proc.on('error', (e) => resolve({ code: -1, out: e.message }));
  });
}

// ─── MIME types ────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// ─── Static file server ────────────────────────────────────────────────────────

function serveFile(res, absPath) {
  if (!existsSync(absPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + absPath);
    return;
  }
  const stat = statSync(absPath);
  if (stat.isDirectory()) {
    const idx = resolve(absPath, 'index.html');
    if (existsSync(idx)) {
      serveFile(res, idx);
    } else {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Directory listing not allowed');
    }
    return;
  }
  const ext = '.' + absPath.split('.').pop();
  const mime = MIME[ext] || 'application/octet-stream';
  const content = readFileSync(absPath);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': content.length,
    'Cache-Control': 'no-cache',
  });
  res.end(content);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Step 1: Generate if requested
  if (doGenerate || doCheck) {
    console.log('[serve] Generating verification data...');
    const gen = await runProc('node', [resolve(__dirname, 'generate.mjs'), '--phase', 'M0']);
    if (gen.code !== 0) {
      console.warn('[serve] generate.mjs exited with code', gen.code);
      if (gen.out) process.stdout.write(gen.out);
    }

    // In check-only mode, print summary and exit
    if (doCheck) {
      const verifPath = resolve(ROOT, 'artifacts/verification/M0/verification.json');
      if (existsSync(verifPath)) {
        try {
          const data = JSON.parse(readFileSync(verifPath, 'utf8'));
          console.log(`\n[serve --check] Overall: ${data.overallStatus}`);
          console.log(`[serve --check] Gate summary: ${Object.entries(data.gateSummary || {}).map(([s, n]) => `${s}=${n}`).join(', ')}`);
          console.log(`[serve --check] Output: ${verifPath}`);
        } catch { /* ignore */ }
      }
      // Exit code: 0 if PASS, 1 if PENDING/WARNING, 2 if BLOCKED/FAILED
      const statusToCode = { PASS: 0, PENDING: 1, WARNING: 1, BLOCKED: 2, FAILED: 2 };
      let overall = 'BLOCKED';
      try { overall = JSON.parse(readFileSync(verifPath, 'utf8')).overallStatus; } catch { /* */ }
      process.exit(statusToCode[overall] ?? 1);
      return;
    }
  }

  // Step 2: Start HTTP server
  const server = http.createServer((req, res) => {
    const urlPath = req.url?.split('?')[0] || '/';
    const normalized = urlPath.replace(/\/+/g, '/').replace(/^\//, '');

    // Map URL to filesystem
    if (normalized === '' || normalized === 'index.html' || normalized === 'dashboard/') {
      serveFile(res, resolve(__dirname, 'dashboard', 'index.html'));
      return;
    }

    // Serve dashboard assets (strip leading "dashboard/" prefix to avoid double-dashboard)
    const assetPath = normalized.replace(/^dashboard\//, '');
    const dashAsset = resolve(__dirname, 'dashboard', assetPath);
    if (existsSync(dashAsset)) {
      serveFile(res, dashAsset);
      return;
    }

    // Serve artifacts (verification.json, images, metrics)
    if (normalized.startsWith('artifacts/')) {
      const artifactPath = resolve(ROOT, normalized);
      serveFile(res, artifactPath);
      return;
    }

    // Not found
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  return new Promise((resolve) => {
    server.listen(portArg, DEFAULT_HOST, () => {
      console.log(`\n[serve] Prism Visual Control Center`);
      console.log(`[serve] Local:   http://${DEFAULT_HOST}:${portArg}/`);
      console.log(`[serve] Dashboard: http://${DEFAULT_HOST}:${portArg}/dashboard/index.html`);
      console.log(`[serve] Press Ctrl+C to stop.\n`);
      if (doServe) {
        console.log('[serve] Serving static files from:');
        console.log(`[serve]   dashboard: ${resolve(__dirname, 'dashboard')}`);
        console.log(`[serve]   artifacts: ${resolve(ROOT, 'artifacts')}`);
      }
    });
    server.on('error', (err) => {
      console.error('[serve] Server error:', err.message);
      process.exit(1);
    });
  });
}

main().catch((err) => {
  console.error('[serve] Fatal error:', err);
  process.exit(3);
});

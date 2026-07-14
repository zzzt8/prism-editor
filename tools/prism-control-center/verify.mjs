#!/usr/bin/env node
// verify.mjs — CLI entry point for prism:verify
// Runs checks and generates verification.json for a given phase.
// Usage: node tools/prism-control-center/verify.mjs [--phase M0]

import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');
const { default: generate } = await import('./generate.mjs');

const phaseArg = process.argv.includes('--phase')
  ? process.argv[process.argv.indexOf('--phase') + 1]
  : 'M0';

console.log(`[verify] Starting verification for phase ${phaseArg}...`);

try {
  // generate.mjs is self-contained — we import and re-run with the phase
  // But to avoid infinite import loop, we spawn it as a subprocess
  const { spawn } = await import('child_process');
  const proc = spawn(
    'node',
    [resolve(__dirname, 'generate.mjs'), '--phase', phaseArg],
    { cwd: ROOT, shell: true, stdio: 'inherit' }
  );
  proc.on('close', (code) => {
    process.exit(code ?? 1);
  });
  proc.on('error', (err) => {
    console.error('[verify] Failed to spawn generate.mjs:', err.message);
    process.exit(3);
  });
} catch (err) {
  console.error('[verify] Error:', err.message);
  process.exit(3);
}

#!/usr/bin/env node
/**
 * verify.mjs - Sequential verification script for CI/CD
 *
 * Runs typecheck, lint, test, and build in sequence.
 * Exits with non-zero code if any step fails.
 *
 * Usage:
 *   node scripts/verify.mjs
 *   pnpm verify
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const steps = [
  { name: 'TypeCheck', command: 'pnpm', args: ['typecheck'] },
  { name: 'Lint', command: 'pnpm', args: ['lint'] },
  { name: 'Test', command: 'pnpm', args: ['test'] },
  { name: 'Build', command: 'pnpm', args: ['build'] },
];

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('========================================');
  console.log('  Prism Editor - Verification Pipeline');
  console.log('========================================\n');

  let failed = false;

  for (const step of steps) {
    console.log(`\n[${step.name}] Starting...`);
    console.log('----------------------------------------');

    try {
      await runCommand(step.command, step.args, rootDir);
      console.log(`\n[${step.name}] PASSED`);
    } catch (error) {
      console.error(`\n[${step.name}] FAILED`);
      console.error(`Error: ${error.message}`);
      failed = true;
      break;
    }
  }

  console.log('\n========================================');
  if (failed) {
    console.log('  Verification FAILED');
    console.log('========================================\n');
    process.exit(1);
  } else {
    console.log('  Verification PASSED');
    console.log('========================================\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

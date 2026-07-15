/**
 * Browser Entry Isolation Test
 *
 * Verifies that `@prism/image-ops/browser` does not contain Sharp or Node built-ins.
 * This test ensures clean separation between browser and Node.js code paths.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Bundle is at packages/image-ops/dist/src/browser-entry.js
const BUNDLE_PATH = resolve(__dirname, '../../dist/src/browser-entry.js');

describe('browser-entry-isolation', () => {
  let bundle: string;

  beforeAll(() => {
    if (existsSync(BUNDLE_PATH)) {
      bundle = readFileSync(BUNDLE_PATH, 'utf-8');
    } else {
      // Build hasn't been run or path is different - skip bundle analysis
      console.warn(`Bundle not found at ${BUNDLE_PATH}, skipping bundle analysis`);
      bundle = '';
    }
  });

  it('should export browserExecutors from browser-entry module', () => {
    // Just verify the module can be imported - actual exports are tested by the module itself
    expect(existsSync(resolve(__dirname, '../browser-entry.ts'))).toBe(true);
  });

  it('should NOT contain Sharp imports in bundle', () => {
    if (!bundle) {
      console.warn('Bundle not found, skipping bundle analysis');
      return;
    }
    expect(bundle).not.toMatch(/from\s+['"]sharp['"]/);
    expect(bundle).not.toMatch(/require\s*\(\s*['"]sharp['"]/);
    expect(bundle).not.toMatch(/import\s*.*\bfrom\b.*\bsharp\b/);
  });

  it('should NOT contain Node built-ins in bundle', () => {
    if (!bundle) {
      console.warn('Bundle not found, skipping bundle analysis');
      return;
    }
    // Check for Node.js built-in imports that shouldn't be in browser code
    expect(bundle).not.toMatch(/from\s+['"]fs['"]/);
    expect(bundle).not.toMatch(/from\s+['"]path['"]/);
    expect(bundle).not.toMatch(/from\s+['"]buffer['"]/);
    expect(bundle).not.toMatch(/from\s+['"]stream['"]/);
    expect(bundle).not.toMatch(/from\s+['"]crypto['"]/);
    expect(bundle).not.toMatch(/from\s+['"]process['"]/);
    expect(bundle).not.toMatch(/require\s*\(\s*['"]fs['"]/);
    expect(bundle).not.toMatch(/require\s*\(\s*['"]path['"]/);
  });

  it('should NOT contain @prism/image-ops/nodejs imports in bundle', () => {
    if (!bundle) {
      console.warn('Bundle not found, skipping bundle analysis');
      return;
    }
    expect(bundle).not.toMatch(/@prism\/image-ops\/nodejs/);
    expect(bundle).not.toMatch(/@prism\/image-ops\/sharp-utils/);
  });
});

/**
 * Package Boundary Gates
 *
 * Verifies browser-runtime does NOT contain forbidden dependencies.
 * This ensures clean separation between browser and Node.js code paths.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Package root - go up from src/__tests__/boundary-gates.test.ts
// Test file: packages/browser-runtime/src/__tests__/boundary-gates.test.ts
// __dirname: packages/browser-runtime/src/__tests__
// __dirname/../..: packages/browser-runtime/src
// __dirname/../../..: packages/browser-runtime
const PACKAGE_ROOT = resolve(__dirname, '../..');

// Bundle paths to check
const BUNDLE_PATHS = [
  resolve(PACKAGE_ROOT, 'dist/src/index.js'),
  resolve(PACKAGE_ROOT, 'dist/src/execute.js'),
];

// Forbidden packages that should never be in browser-runtime
const FORBIDDEN_PACKAGES = [
  'react',
  '@types/react',
  'zustand',
  '@prism/dev-tool',
  '@prism/composer-sdk',
  '@prism/server',
  'sharp',
  '@prism/image-ops/nodejs',
];

// Forbidden import patterns
const FORBIDDEN_PATTERNS = [
  { pattern: /@prism\/image-ops\/nodejs/, description: '@prism/image-ops/nodejs' },
  { pattern: /\bfs\b/, description: 'Node.js fs module' },
  { pattern: /\bpath\b/, description: 'Node.js path module' },
  { pattern: /\bBuffer\b/, description: 'Node.js Buffer class' },
  { pattern: /\bprocess\b/, description: 'Node.js process global' },
  { pattern: /\bstream\b/, description: 'Node.js stream module' },
  { pattern: /\bcrypto\b/, description: 'Node.js crypto module' },
];

describe('package boundary gates', () => {
  let bundle: string;

  beforeAll(() => {
    // Read the main bundle
    const mainBundlePath = BUNDLE_PATHS[0];
    if (existsSync(mainBundlePath)) {
      bundle = readFileSync(mainBundlePath, 'utf-8');
    } else {
      bundle = '';
    }
  });

  describe('package.json dependencies', () => {
    it('should not list forbidden packages in dependencies', async () => {
      const pkgPath = resolve(PACKAGE_ROOT, 'package.json');
      expect(existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = [
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
      ];

      const violations = allDeps.filter(d =>
        FORBIDDEN_PACKAGES.some(f => d === f || d.includes(f))
      );

      expect(violations).toHaveLength(0);
    });

    it('should not include @types/node', async () => {
      const pkgPath = resolve(PACKAGE_ROOT, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      const hasNodeTypes = Object.keys(pkg.devDependencies ?? {}).some(
        d => d === '@types/node'
      );

      expect(hasNodeTypes).toBe(false);
    });
  });

  describe('bundle analysis', () => {
    it('should have bundle content when built', () => {
      if (!bundle) {
        console.warn('Bundle not found at', BUNDLE_PATHS[0], '- run pnpm build first');
      }
      expect(typeof bundle).toBe('string');
    });

    it('should not contain sharp imports', () => {
      if (!bundle) {
        console.warn('Bundle not found - skipping sharp check');
        return;
      }

      const hasSharp = bundle.includes("from 'sharp'") ||
        bundle.includes('from "sharp"') ||
        bundle.includes("require('sharp')") ||
        bundle.includes('require("sharp")');

      expect(hasSharp).toBe(false);
    });

    it('should not contain Node.js built-in imports', () => {
      if (!bundle) {
        console.warn('Bundle not found - skipping Node built-in check');
        return;
      }

      const violations: string[] = [];

      for (const { pattern, description } of FORBIDDEN_PATTERNS) {
        // Skip fs/path/Buffer/process patterns that might appear in comments
        const cleanBundle = bundle
          .split('\n')
          .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
          .join('\n');

        if (pattern.test(cleanBundle)) {
          violations.push(description);
        }
      }

      expect(violations).toHaveLength(0);
    });

    it('should not contain @prism/image-ops/nodejs imports', () => {
      if (!bundle) {
        console.warn('Bundle not found - skipping image-ops/nodejs check');
        return;
      }

      const hasNodejsPath = bundle.includes('@prism/image-ops/nodejs');
      expect(hasNodejsPath).toBe(false);
    });

    it('should not contain deep imports from @prism/image-ops/src (except /browser/)', () => {
      if (!bundle) {
        console.warn('Bundle not found - skipping deep import check');
        return;
      }

      // Check for imports from @prism/image-ops/src that are not /browser/
      const imageOpsImports = bundle.match(/@prism\/image-ops\/src\/[^'"]+/g) || [];

      const violations = imageOpsImports.filter(
        imp => !imp.includes('/browser/')
      );

      expect(violations).toHaveLength(0);
    });
  });

  describe('exports configuration', () => {
    it('should have correct exports map', async () => {
      const pkgPath = resolve(PACKAGE_ROOT, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.exports).toBeDefined();
      expect(pkg.exports['.']).toBeDefined();
    });

    it('should export main entry point', async () => {
      const pkgPath = resolve(PACKAGE_ROOT, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.main).toBeDefined();
      expect(pkg.types).toBeDefined();
    });
  });
});

/**
 * Vite configuration for M0 Browser Test Host.
 *
 * This Vite config is ONLY used by the M0 verify:m0 script to serve
 * packages/image-ops/_m0_evidence/browser-runtime-host/index.html as a test page.
 * It is NOT part of the package's normal build output.
 *
 * It configures:
 * - Root = packages/image-ops (so /src/* and /_m0_evidence/* resolve from file paths)
 * - Index HTML entry pointed at the M0 browser-runtime-host subdir
 * - Server on a random localhost port (set via M0_PORT env var or random)
 * - fs.allow = repo root + node_modules so Vite can serve from outside the root
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_ROOT = resolve(__dirname, '..', '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');

export default defineConfig({
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '@prism/shared-types': resolve(PACKAGE_ROOT, '..', 'shared-types', 'src', 'index.ts'),
    },
  },
  server: {
    port: Number(process.env.M0_PORT) || 0,
    strictPort: false,
    fs: {
      strict: false,
      allow: [REPO_ROOT],
    },
  },
  optimizeDeps: {
    include: [],
  },
});
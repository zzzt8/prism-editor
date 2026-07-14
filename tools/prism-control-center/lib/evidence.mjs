// lib/evidence.mjs — Evidence file existence checker
// Checks for browser.png, node.png, diff.png, metrics.json in artifacts dir.

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// __dirname resolves to tools/prism-control-center/lib/ when imported from generate.mjs.
// ROOT is the project root regardless of which module calls getArtifactsDir.
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const _srcDir = __dirname; // source file dir (lib/)
// Derive project root: go up from tools/prism-control-center/lib/ to prism-editor/
const _parentDir = resolve(_srcDir, '..'); // tools/prism-control-center/
const _toolsDir = resolve(_parentDir, '..'); // tools/
const PROJECT_ROOT = resolve(_toolsDir, '..'); // prism-editor/

/** Default artifacts base directory per phase. */
export function getArtifactsDir(phase = 'M0') {
  return resolve(PROJECT_ROOT, 'artifacts', 'verification', phase);
}

/** Files expected for dual-executor M0 verification. */
export const M0_ARTIFACT_FILES = [
  'browser.png',
  'node.png',
  'diff.png',
  'metrics.json',
];

/**
 * @typedef {Object} ArtifactFile
 * @property {string} name
 * @property {boolean} exists
 * @property {string|null} path
 * @property {number|null} size
 * @property {string|null} modified
 */

/**
 * Check existence and basic metadata of all expected artifact files.
 * @param {string} phase
 * @returns {Promise<{
 *   artifactsDir: string,
 *   dirExists: boolean,
 *   files: Record<string,ArtifactFile>,
 *   metrics: object|null,
 * }>}
 */
export async function checkArtifacts(phase = 'M0') {
  const dir = getArtifactsDir(phase);
  const dirExists = existsSync(dir);

  /** @type {Record<string,ArtifactFile>} */
  const files = {};
  let metrics = null;

  for (const fileName of M0_ARTIFACT_FILES) {
    const filePath = resolve(dir, fileName);
    const exists = existsSync(filePath);
    let size = null;
    let modified = null;
    if (exists) {
      try {
        const { statSync } = await import('fs');
        const stat = statSync(filePath);
        size = stat.size;
        modified = stat.mtime.toISOString();
      } catch { /* ignore */ }

      // If metrics.json, try to parse it
      if (fileName === 'metrics.json' && exists) {
        try {
          const content = readFileSync(filePath, 'utf8');
          metrics = JSON.parse(content);
        } catch {
          metrics = { _parseError: 'Invalid JSON' };
        }
      }
    }
    files[fileName] = {
      name: fileName,
      exists,
      path: filePath,
      size,
      modified,
    };
  }

  return {
    artifactsDir: dir,
    dirExists,
    files,
    metrics,
  };
}

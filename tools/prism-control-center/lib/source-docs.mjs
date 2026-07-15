// lib/source-docs.mjs — Architecture document hash collector
// Computes SHA-256 hashes of architecture source documents and detects changes.

import { createHash } from 'crypto';
import { readFileSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');

/** Architecture source documents that control-center must monitor. */
export const SOURCE_DOCS = [
  'docs/architecture/PRISM_TARGET_ARCHITECTURE.md',
  'docs/architecture/PRISM_ARCHITECTURE_GUARDRAILS.md',
  'docs/architecture/PRISM_MIGRATION_ROADMAP.md',
  '.cursor/rules/prism-architecture.mdc',
];

/**
 * Compute SHA-256 hex digest of a file.
 * @param {string} absPath
 * @returns {string|null} hex digest or null if file missing
 */
export function computeHash(absPath) {
  if (!existsSync(absPath)) return null;
  const content = readFileSync(absPath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Read the previous hashes from an existing verification.json so we can
 * detect changes.
 * @param {string} verificationPath - path to verification.json
 * @returns {Record<string,string>} docPath -> hash
 */
export function readPreviousHashes(verificationPath) {
  if (!existsSync(verificationPath)) return {};
  try {
    const content = readFileSync(verificationPath, 'utf8');
    const data = JSON.parse(content);
    const result = {};
    if (data.sourceDocuments) {
      for (const [name, doc] of Object.entries(data.sourceDocuments)) {
        if (doc && doc.hash) result[name] = doc.hash;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Collect architecture document info.
 * @param {Record<string,string>} [previousHashes] - optional previous state for change detection
 * @returns {Promise<Record<string,{
 *   path: string,
 *   hash: string|null,
 *   lastModified: string|null,
 *   changed: boolean,
 *   previousHash: string|null,
 * }>>}
 */
export async function collectSourceDocs(previousHashes = {}) {
  const result = {};
  for (const docPath of SOURCE_DOCS) {
    const absPath = resolve(ROOT, docPath);
    const hash = computeHash(absPath);
    let lastModified = null;
    if (existsSync(absPath)) {
      try {
        const stat = statSync(absPath);
        lastModified = stat.mtime.toISOString().slice(0, 10);
      } catch { /* ignore */ }
    }
    const prevHash = previousHashes[docPath] || null;
    const changed = hash !== null && prevHash !== null && hash !== prevHash;
    result[docPath] = {
      path: docPath,
      hash: hash ? `sha256:${hash.slice(0, 12)}...` : null,
      hashFull: hash,
      lastModified,
      changed,
      previousHash: prevHash ? `sha256:${prevHash.slice(0, 12)}...` : null,
    };
  }
  return result;
}

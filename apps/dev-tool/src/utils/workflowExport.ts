/**
 * Workflow export utilities for dev-tool
 * Handles copy-to-clipboard and file download of published workflows.
 */

import type { PublishedWorkflow } from '@prism/shared-types';

/**
 * Format a workflow name into a safe filename string.
 * - Lowercase
 * - Spaces replaced with hyphens
 * - Non-alphanumeric characters stripped
 */
function toFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format a Date to YYYY-MM-DD string.
 */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build a safe, readable filename for a published workflow export.
 * Format: workflow-{name}-{shortId}-{date}.json
 * shortId = first 6 chars of sourceId
 */
export function buildExportFileName(pw: PublishedWorkflow): string {
  const shortId = pw.sourceId.slice(0, 6);
  const date = toDateString(new Date(pw.publishedAt));
  const name = toFileName(pw.name);
  return `workflow-${name}-${shortId}-${date}.json`;
}

/**
 * Copy a published workflow as pretty-printed JSON to the clipboard.
 * Returns true if successful, false otherwise.
 */
export async function copyWorkflowToClipboard(pw: PublishedWorkflow): Promise<boolean> {
  try {
    const json = JSON.stringify(pw, null, 2);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * Trigger a browser download of a published workflow as a .json file.
 */
export function downloadWorkflowAsFile(pw: PublishedWorkflow): void {
  const fileName = buildExportFileName(pw);
  const json = JSON.stringify(pw, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

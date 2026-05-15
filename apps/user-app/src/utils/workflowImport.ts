/**
 * Workflow import utilities for user-app
 * Handles file upload, clipboard paste, and Zod schema validation.
 */

import { z } from 'zod';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const publishedInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  // v2 format uses 'image' | 'string'; legacy format may use 'text'
  type: z.enum(['image', 'mask', 'number', 'string', 'boolean', 'text']),
  required: z.boolean().default(true),
  description: z.string().optional(),
  visible: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
});

const publishedOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'mask', 'number', 'string', 'boolean']),
  description: z.string().optional(),
});

const connectionSchema = z.object({
  id: z.string(),
  from: z.object({
    nodeId: z.string(),
    port: z.string(),
  }),
  to: z.object({
    nodeId: z.string(),
    port: z.string(),
  }),
});

const nodeConfigSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  _internalParams: z.record(z.string(), z.unknown()).optional(),
});

const publishedConfigSchema = z.object({
  connections: z.array(connectionSchema).default([]),
  nodeTypes: z.record(z.string(), z.string()).optional(),
  nodeIndexMap: z.record(z.string(), z.string()).optional(),
  internalParams: z.record(z.string(), z.unknown()).optional(),
  nodeConfigs: z.record(z.string(), nodeConfigSchema),
  paramVisibility: z.record(z.string(), z.record(z.string(), z.enum(['visible', 'hidden', 'locked']))).optional(),

  // v2 publish config fields (auto-infer + whitelist)
  inputs: z.array(z.object({
    nodeId: z.string(),
    label: z.string(),
    type: z.enum(['image', 'mask', 'string']),
  })).default([]),

  exposedParams: z.array(z.object({
    nodeId: z.string(),
    paramId: z.string(),
    label: z.string(),
  })).default([]),

  outputs: z.array(z.object({
    nodeId: z.string(),
    label: z.string(),
    format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  })).default([]),

  /** Rich parameter definitions (includes UI metadata for exposed params) */
  paramDefinitions: z.array(z.object({
    nodeId: z.string(),
    paramId: z.string(),
    label: z.string(),
    controlType: z.enum(['select', 'number', 'string', 'boolean', 'image-file']),
    options: z.array(z.object({ label: z.string(), value: z.unknown() })).default([]),
    defaultValue: z.unknown().optional(),
    validation: z.object({
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    }).optional(),
    visibility: z.enum(['visible', 'hidden', 'locked']).optional(),
    description: z.string().optional(),
  })).optional(),
});

export const publishedWorkflowSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  sourceName: z.string(),
  version: z.string(),
  inputs: z.array(publishedInputSchema),
  outputs: z.array(publishedOutputSchema),
  config: publishedConfigSchema,
  publishedAt: z.string(),
  publishedBy: z.string().optional(),
});

export type ValidatedPublishedWorkflow = z.infer<typeof publishedWorkflowSchema>;

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  success: true;
  data: ValidatedPublishedWorkflow;
}

export interface ValidationError {
  success: false;
  reason: string;
}

export type WorkflowValidation = ValidationResult | ValidationError;

/**
 * Validate a raw unknown value as a PublishedWorkflow.
 * Returns a structured result so callers can handle errors gracefully.
 */
export function validateWorkflowJson(raw: unknown): WorkflowValidation {
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return { success: false, reason: 'JSON is not an object' };
  }

  const result = publishedWorkflowSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Surface the first meaningful error
  const firstIssue = result.error.issues[0];
  const path = firstIssue.path.join('.');
  const message = firstIssue.message;
  return {
    success: false,
    reason: path ? `Field "${path}": ${message}` : message,
  };
}

// ─── File Import ──────────────────────────────────────────────────────────────

export interface FileImportResult {
  success: true;
  workflow: ValidatedPublishedWorkflow;
  fileName: string;
}

export interface FileImportError {
  success: false;
  reason: string;
  fileName: string;
}

export type FileImport = FileImportResult | FileImportError;

/**
 * Read and validate a .json workflow file selected via <input type="file">.
 */
export function importWorkflowFromFile(file: File): Promise<FileImport> {
  return new Promise((resolve) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      resolve({ success: false, reason: '请选择 .json 文件', fileName: file.name });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          resolve({ success: false, reason: '文件内容无法读取', fileName: file.name });
          return;
        }
        const raw = JSON.parse(text);
        const validation = validateWorkflowJson(raw);
        if (validation.success) {
          resolve({ success: true, workflow: validation.data, fileName: file.name });
        } else {
          resolve({ success: false, reason: validation.reason, fileName: file.name });
        }
      } catch {
        resolve({ success: false, reason: '文件不是有效的 JSON', fileName: file.name });
      }
    };
    reader.onerror = () => resolve({ success: false, reason: '文件读取失败', fileName: file.name });
    reader.readAsText(file);
  });
}

// ─── Clipboard Import ────────────────────────────────────────────────────────

export interface ClipboardImportResult {
  success: true;
  workflow: ValidatedPublishedWorkflow;
}

export interface ClipboardImportError {
  success: false;
  reason: string;
}

export type ClipboardImport = ClipboardImportResult | ClipboardImportError;

/**
 * Read and validate workflow JSON from the clipboard.
 * Returns an error if the clipboard content is not a valid PublishedWorkflow.
 */
export async function importWorkflowFromClipboard(): Promise<ClipboardImport> {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      return { success: false, reason: '剪贴板为空' };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { success: false, reason: '剪贴板内容不是有效的 JSON' };
    }

    const validation = validateWorkflowJson(raw);
    if (validation.success) {
      return { success: true, workflow: validation.data };
    } else {
      return { success: false, reason: validation.reason };
    }
  } catch {
    // clipboard API may be denied or unavailable
    return { success: false, reason: '无法访问剪贴板（请检查浏览器权限）' };
  }
}

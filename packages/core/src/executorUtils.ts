// Executor parsing utilities — shared code for parsing inline and remote executors

import type { NodeExecutor } from '@prism/shared-types';

/**
 * Parse inline TypeScript/JavaScript code into a NodeExecutor function.
 *
 * The code is wrapped in a Function constructor with parameters:
 * - inputs: Record<string, unknown> — input port values
 * - params: Record<string, unknown> — node parameters
 * - context: ExecutionContext — execution context (signal, nodeId, etc.)
 *
 * @param code - The executor code as a string
 * @param executorId - Identifier for error messages
 * @returns A NodeExecutor function
 * @throws Error if the code contains syntax errors
 */
export function parseInlineExecutor(code: string, executorId: string): NodeExecutor {
  if (typeof code !== 'string' || !code.trim()) {
    throw new Error(`Executor "${executorId}": inline code cannot be empty`);
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'inputs',
      'params',
      'context',
      `"use strict";\n${code}`
    );
    return fn as NodeExecutor;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Executor "${executorId}" parse error: ${message}`);
  }
}

/**
 * Validate that inline executor code has required structure.
 * This is a lightweight check that doesn't require parsing.
 *
 * @param code - The executor code
 * @returns true if the code appears valid
 */
export function validateInlineCode(code: string): boolean {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (!trimmed) return false;

  // Check for common syntax issues
  try {
    new Function('inputs', 'params', 'context', `"use strict";\n${trimmed}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract function name from executor code if it has one.
 * Useful for debugging and display purposes.
 */
export function extractFunctionName(code: string): string | null {
  const match = code.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
  return match?.[1] ?? null;
}

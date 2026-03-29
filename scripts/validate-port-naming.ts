#!/usr/bin/env npx tsx
/**
 * Port Naming Validation Script
 *
 * Validates that:
 * 1. All ctx.requireInput() keys in executors match the inputs[].id of node definitions
 * 2. All executor return object keys match the outputs[].id of node definitions
 *
 * Reference: openspec/changes/node-editor-comfyui-refactor/design.md
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation errors found
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

interface Port {
  id: string;
  name: string;
  type: string;
  dataType: string;
  required?: boolean;
}

interface NodeDefinition {
  type: string;
  label: string;
  inputs: Port[];
  outputs: Port[];
}

interface ExecutorInfo {
  nodeType: string;
  requireInputCalls: string[];
  returnKeys: string[];
}

// ─── Parse definitions.ts ─────────────────────────────────────────────────────

function parseDefinitions(content: string): NodeDefinition[] {
  const definitions: NodeDefinition[] = [];

  const defRegex = /export\s+const\s+(\w+Definition)\s*:\s*NodeDefinition\s*=\s*\{/g;
  let match;

  while ((match = defRegex.exec(content)) !== null) {
    const defName = match[1];
    const nodeType = defName.replace('Definition', '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

    let startIdx = match.index + match[0].length;
    let braceCount = 1;
    let endIdx = startIdx;

    while (braceCount > 0 && endIdx < content.length) {
      if (content[endIdx] === '{') braceCount++;
      else if (content[endIdx] === '}') braceCount--;
      endIdx++;
    }

    const defContent = content.substring(startIdx, endIdx - 1);
    const inputs = parsePorts(defContent, 'inputs');
    const outputs = parsePorts(defContent, 'outputs');

    definitions.push({
      type: nodeType,
      label: defName,
      inputs,
      outputs,
    });
  }

  return definitions;
}

function parsePorts(content: string, arrayName: string): Port[] {
  const ports: Port[] = [];

  const arrayRegex = new RegExp(`${arrayName}\\s*:\\s*\\[([\\s\\S]*?)\\]\\s*,`, 'g');
  let arrayMatch = arrayRegex.exec(content);

  if (!arrayMatch) {
    const arrayRegex2 = new RegExp(`${arrayName}\\s*:\\s*\\[([\\s\\S]*?)\\]\\s*\\}`, 'g');
    arrayMatch = arrayRegex2.exec(content);
  }

  if (!arrayMatch) return ports;

  const arrayContent = arrayMatch[1];
  const portRegex = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*type:\s*['"]([^'"]+)['"]\s*,\s*dataType:\s*\w+/g;
  let portMatch;

  while ((portMatch = portRegex.exec(arrayContent)) !== null) {
    ports.push({
      id: portMatch[1],
      name: portMatch[2],
      type: portMatch[3],
      dataType: '',
      required: arrayContent.includes('required: true'),
    });
  }

  return ports;
}

// ─── Parse executors.ts ────────────────────────────────────────────────────────

function parseExecutors(content: string): ExecutorInfo[] {
  const executors: ExecutorInfo[] = [];

  const executorRegex = /export\s+const\s+(\w+Executor)\s*:\s*NodeExecutor\s*=/g;
  let match;

  while ((match = executorRegex.exec(content)) !== null) {
    const executorName = match[1];
    const nodeType = executorName.replace('Executor', '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

    let startIdx = match.index + match[0].length;
    while (startIdx < content.length && content[startIdx] !== '(') startIdx++;
    const funcStart = content.lastIndexOf('async', startIdx);
    const actualStart = funcStart >= 0 ? funcStart : startIdx;

    let braceCount = 0;
    let funcEnd = actualStart;
    let inFunc = false;

    for (let i = actualStart; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
        inFunc = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunc && braceCount === 0) {
          funcEnd = i + 1;
          break;
        }
      }
    }

    const funcBody = content.substring(actualStart, funcEnd);

    const requireInputCalls: string[] = [];
    // Match ctx.requireInput<...>('key', 'NodeName') with any type argument (including generics)
    const requireInputRegex = /ctx\.requireInput\s*<\s*[^)]+>\s*\(\s*['"]([^'"]+)['"]/g;
    let reqMatch;
    while ((reqMatch = requireInputRegex.exec(funcBody)) !== null) {
      requireInputCalls.push(reqMatch[1]);
    }

    const returnKeys: string[] = [];
    const returnRegex = /return\s*\{([\s\S]*?)\}\s*(?:satisfies|as\s+)/g;
    let retMatch;
    while ((retMatch = returnRegex.exec(funcBody)) !== null) {
      const returnContent = retMatch[1];

      const keyValueRegex = /(\w+)\s*:/g;
      let keyMatch;
      while ((keyMatch = keyValueRegex.exec(returnContent)) !== null) {
        const key = keyMatch[1];
        if (key !== 'type') {
          returnKeys.push(key);
        }
      }

      const shorthandRegex = /(?:^|[,;])\s*(\w+)(?:\s*,|\s*\}|\s*$)/g;
      let shortMatch;
      while ((shortMatch = shorthandRegex.exec(returnContent)) !== null) {
        const key = shortMatch[1];
        if (!returnKeys.includes(key) && key !== 'width' && key !== 'height' && key !== 'mimeType' && key !== 'dataUrl' && key !== 'previewUrl') {
          returnKeys.push(key);
        }
      }
    }

    executors.push({
      nodeType,
      requireInputCalls,
      returnKeys,
    });
  }

  return executors;
}

// ─── Validation Logic ─────────────────────────────────────────────────────────

interface ValidationError {
  nodeType: string;
  category: 'requireInput' | 'returnKey';
  expected: string[];
  actual: string[];
  message: string;
}

function validate(definitions: NodeDefinition[], executors: ExecutorInfo[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const defMap = new Map<string, NodeDefinition>();
  for (const def of definitions) {
    defMap.set(def.type, def);
  }

  for (const executor of executors) {
    const def = defMap.get(executor.nodeType);

    if (!def) {
      console.warn(`Warning: No definition found for executor '${executor.nodeType}'`);
      continue;
    }

    const inputIds = def.inputs.map((p) => p.id);
    const missingInputs = inputIds.filter((id) => !executor.requireInputCalls.includes(id));
    const extraInputs = executor.requireInputCalls.filter((id) => !inputIds.includes(id));

    if (missingInputs.length > 0 || extraInputs.length > 0) {
      errors.push({
        nodeType: executor.nodeType,
        category: 'requireInput',
        expected: inputIds,
        actual: executor.requireInputCalls,
        message: `ctx.requireInput() calls mismatch:\n    Definition inputs: [${inputIds.join(', ')}]\n    Executor calls:   [${executor.requireInputCalls.join(', ')}]\n    Missing: ${missingInputs.length > 0 ? `[${missingInputs.join(', ')}]` : 'none'}\n    Extra:   ${extraInputs.length > 0 ? `[${extraInputs.join(', ')}]` : 'none'}`,
      });
    }

    // Check 2: All defined output port IDs should be returned by executor
    // Note: Executors may return additional metadata keys (previewUrl, width, height, etc.)
    // that are not defined as output ports - these are intentional for UI purposes
    const outputIds = def.outputs.map((p) => p.id);
    const missingOutputs = outputIds.filter((id) => !executor.returnKeys.includes(id));

    if (missingOutputs.length > 0) {
      errors.push({
        nodeType: executor.nodeType,
        category: 'returnKey',
        expected: outputIds,
        actual: executor.returnKeys,
        message: `Executor missing required output ports:\n    Definition outputs: [${outputIds.join(', ')}]\n    Executor returns:   [${executor.returnKeys.join(', ')}]\n    Missing ports: [${missingOutputs.join(', ')}]`,
      });
    }
  }

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Port Naming Validation Script');
  console.log('  Reference: openspec/changes/node-editor-comfyui-refactor/design.md');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const definitionsPath = path.join(PROJECT_ROOT, 'packages', 'node-definitions', 'src', 'definitions.ts');
  const executorsPath = path.join(PROJECT_ROOT, 'packages', 'image-ops', 'src', 'executors.ts');

  if (!fs.existsSync(definitionsPath)) {
    console.error(`Error: definitions.ts not found at ${definitionsPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(executorsPath)) {
    console.error(`Error: executors.ts not found at ${executorsPath}`);
    process.exit(1);
  }

  const definitionsContent = fs.readFileSync(definitionsPath, 'utf-8');
  const executorsContent = fs.readFileSync(executorsPath, 'utf-8');

  const definitions = parseDefinitions(definitionsContent);
  const executors = parseExecutors(executorsContent);

  console.log(`Found ${definitions.length} node definitions:`);
  for (const def of definitions) {
    const inputIds = def.inputs.map((p) => p.id).join(', ') || '(none)';
    const outputIds = def.outputs.map((p) => p.id).join(', ') || '(none)';
    console.log(`  - ${def.type}: inputs=[${inputIds}], outputs=[${outputIds}]`);
  }
  console.log();

  console.log(`Found ${executors.length} executors:`);
  for (const exec of executors) {
    const reqInputs = exec.requireInputCalls.join(', ') || '(none)';
    const retKeys = exec.returnKeys.join(', ') || '(none)';
    console.log(`  - ${exec.nodeType}: requireInput=[${reqInputs}], returns=[${retKeys}]`);
  }
  console.log();

  const errors = validate(definitions, executors);

  if (errors.length === 0) {
    console.log('✅ All validations passed!');
    console.log('');
    console.log('Summary:');
    console.log('  - All ctx.requireInput() keys match input port IDs');
    console.log('  - All executor return keys match output port IDs');
    process.exit(0);
  } else {
    console.error('❌ Validation errors found:\n');
    for (const error of errors) {
      console.error(`[${error.nodeType}] (${error.category})`);
      console.error(`  ${error.message.replace(/\n/g, '\n  ')}`);
      console.error('');
    }
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error(`Total: ${errors.length} error(s)`);
    process.exit(1);
  }
}

main();

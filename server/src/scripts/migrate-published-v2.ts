/**
 * migrate-published-v2.ts
 *
 * Migrates old published workflows (without V2 config fields) to the new V2 format.
 * This script:
 * 1. Finds all PublishedWorkflow records with old format (no config.nodeTypes)
 * 2. Attempts to reconstruct V2 config from legacy pw.inputs[] format
 * 3. Updates the database with the migrated content
 *
 * Usage:
 *   pnpm --filter=@prism/server exec tsx src/scripts/migrate-published-v2.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Minimal types to avoid importing from shared-types (which has browser-only types)
interface Connection {
  id: string;
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
}

interface PublishedWorkflow {
  id: string;
  sourceId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  inputs: Array<{ id: string; name: string; type: string; required: boolean; visible: boolean }>;
  outputs: Array<{ id: string; name: string; type: string }>;
  config: {
    connections?: Connection[];
    nodeTypes?: Record<string, string>;
    nodeConfigs: Record<string, { params: Record<string, unknown>; _internalParams?: Record<string, unknown> }>;
    internalParams?: Record<string, unknown>;
    inputs?: Array<{ nodeId: string; label: string; type: string }>;
    exposedParams?: Array<{ nodeId: string; paramId: string; label: string }>;
    outputs?: Array<{ nodeId: string; label: string; format: string }>;
    [key: string]: unknown;
  };
  publishedAt: string;
  publishedBy?: string;
}

interface LegacyPublishedWorkflow {
  id: string;
  sourceId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  inputs: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    description?: string;
    visible: boolean;
    defaultValue?: unknown;
  }>;
  outputs: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
  config: {
    connections?: Connection[];
    nodeTypes?: Record<string, string>;
    nodeConfigs: Record<string, {
      params: Record<string, unknown>;
      _internalParams?: Record<string, unknown>;
    }>;
    [key: string]: unknown;
  };
  publishedAt: string;
  publishedBy?: string;
}

/**
 * Check if a PublishedWorkflow is in legacy format (no nodeTypes in config)
 */
function isLegacyWorkflow(pw: LegacyPublishedWorkflow): boolean {
  return !pw.config?.nodeTypes || Object.keys(pw.config.nodeTypes).length === 0;
}

/**
 * Attempt to reconstruct V2 config from legacy pw.inputs[] format.
 *
 * Legacy format uses pw.inputs[].id = "{nodeId}:{portId}" where nodeId is the
 * index-based node ID (e.g., "0:image", "1:mask").
 *
 * This tries to derive node types and configurations from the available data.
 */
function reconstructV2Config(
  pw: LegacyPublishedWorkflow
): { nodeTypes: Record<string, string>; nodeConfigs: Record<string, { params: Record<string, unknown>; _internalParams?: Record<string, unknown> }> } | null {
  // Try to extract node information from legacy inputs
  // Legacy inputs have id format: "{nodeIndex}:{portType}"
  // e.g., "0:image", "1:mask"

  const nodeTypes: Record<string, string> = {};
  const nodeConfigs: Record<string, { params: Record<string, unknown>; _internalParams?: Record<string, unknown> }> = {};

  // First pass: extract node IDs from legacy input IDs
  const nodeIdSet = new Set<string>();
  for (const input of pw.inputs) {
    const parts = input.id.split(':');
    if (parts.length >= 1) {
      nodeIdSet.add(parts[0]);
    }
  }

  // Extract node IDs from connection endpoints
  for (const conn of (pw.config?.connections ?? [])) {
    nodeIdSet.add(String(conn.from.nodeId));
    nodeIdSet.add(String(conn.to.nodeId));
  }

  // If we have node IDs, try to reconstruct basic node types
  // This is limited - we can only infer load-* nodes from inputs
  for (const nodeId of nodeIdSet) {
    // Check if any input references this node
    const hasInput = pw.inputs.some((inp) => inp.id.startsWith(`${nodeId}:`));
    const hasOutput = pw.outputs.some((out) => out.id.startsWith(`${nodeId}:`));

    // Try to infer node type from context
    let inferredType = 'unknown';
    if (hasInput && !hasOutput) {
      // Node with input but no output - likely a source node
      const inputType = pw.inputs.find((inp) => inp.id.startsWith(`${nodeId}:`))?.type;
      if (inputType === 'image') inferredType = 'load-image';
      else if (inputType === 'mask') inferredType = 'load-mask';
      else inferredType = 'load-image';
    } else if (hasOutput) {
      // Node with output - likely an export node
      inferredType = 'export';
    }

    nodeTypes[nodeId] = inferredType;
    nodeConfigs[nodeId] = { params: {} };
  }

  return { nodeTypes, nodeConfigs };
}

/**
 * Migrate a single published workflow to V2 format
 */
async function migratePublishedWorkflow(
  pw: LegacyPublishedWorkflow
): Promise<{ success: boolean; migrated: boolean; error?: string }> {
  try {
    // Check if already V2
    if (!isLegacyWorkflow(pw)) {
      return { success: true, migrated: false };
    }

    // Try to reconstruct V2 config
    const reconstructed = reconstructV2Config(pw);

    if (!reconstructed || Object.keys(reconstructed.nodeTypes).length === 0) {
      return { success: false, migrated: false, error: 'Could not reconstruct node types from legacy format' };
    }

    // Build the V2 migrated workflow
    const migratedWorkflow: PublishedWorkflow = {
      ...pw,
      config: {
        ...pw.config,
        nodeTypes: reconstructed.nodeTypes,
        nodeConfigs: reconstructed.nodeConfigs,
        // Add empty V2 fields (minimal migration)
        internalParams: {},
        inputs: [],
        exposedParams: [],
        outputs: pw.outputs.map((o) => {
          const parts = o.id.split(':');
          return {
            nodeId: parts[0] || o.id,
            label: o.name,
            format: 'png',
          };
        }),
      },
    };

    // Update the database
    await prisma.publishedWorkflow.update({
      where: { id: pw.id },
      data: { content: JSON.stringify(migratedWorkflow) },
    });

    return { success: true, migrated: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, migrated: false, error };
  }
}

async function main() {
  console.log('=== Published Workflow V2 Migration ===\n');

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Fetch all published workflows
  const publishedWorkflows = await prisma.publishedWorkflow.findMany({
    orderBy: { publishedAt: 'desc' },
  });

  console.log(`Found ${publishedWorkflows.length} published workflows\n`);

  let legacyCount = 0;
  let alreadyV2Count = 0;

  // First pass: count legacy vs V2
  for (const pwRecord of publishedWorkflows) {
    try {
      const pw = JSON.parse(pwRecord.content) as LegacyPublishedWorkflow;
      if (isLegacyWorkflow(pw)) {
        legacyCount++;
      } else {
        alreadyV2Count++;
      }
    } catch {
      console.warn(`Warning: Could not parse content for ${pwRecord.id}`);
    }
  }

  console.log(`Legacy (no nodeTypes): ${legacyCount}`);
  console.log(`Already V2: ${alreadyV2Count}\n`);

  if (legacyCount === 0) {
    console.log('No legacy workflows to migrate. Nothing to do!');
    return;
  }

  if (!dryRun) {
    console.log('Starting migration...\n');
  } else {
    console.log('Dry run - would migrate the following workflows:\n');
  }

  let successCount = 0;
  let migratedCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: string; name: string; error: string }> = [];

  for (const pwRecord of publishedWorkflows) {
    let pw: LegacyPublishedWorkflow;
    try {
      pw = JSON.parse(pwRecord.content) as LegacyPublishedWorkflow;
    } catch {
      console.warn(`Skipping ${pwRecord.id} - could not parse content`);
      continue;
    }

    if (!isLegacyWorkflow(pw)) {
      continue; // Skip already V2 workflows
    }

    process.stdout.write(`  ${pw.name} (${pw.id})... `);

    if (dryRun) {
      console.log('[would migrate]');
      migratedCount++;
      continue;
    }

    const result = await migratePublishedWorkflow(pw);

    if (result.success) {
      if (result.migrated) {
        console.log('✓ migrated');
        migratedCount++;
      } else {
        console.log('- already V2');
        alreadyV2Count++;
      }
      successCount++;
    } else {
      console.log(`✗ (${result.error})`);
      errorCount++;
      errors.push({ id: pw.id, name: pw.name, error: result.error || 'Unknown error' });
    }
  }

  console.log('\n=== Migration Complete ===\n');
  console.log(`Migrated:  ${migratedCount}`);
  console.log(`Skipped:   ${alreadyV2Count}`);
  console.log(`Errors:    ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    for (const err of errors) {
      console.log(`  ${err.name} (${err.id}): ${err.error}`);
    }
  }

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
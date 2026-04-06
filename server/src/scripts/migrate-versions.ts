import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration Script: Initialize WorkflowVersion for existing workflows
 * 
 * This script creates initial version records for all existing workflows
 * that don't have any versions yet, based on their current content.
 * 
 * Usage:
 *   pnpm --filter=@prism/server exec tsx src/scripts/migrate-versions.ts
 */

interface MigrationResult {
  total: number;
  success: number;
  skipped: number;
  errors: Array<{ id: string; name: string; error: string }>;
}

async function main(): Promise<void> {
  console.log('=== Workflow Version Migration ===\n');

  const result: MigrationResult = {
    total: 0,
    success: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Find all workflows
    const workflows = await prisma.workflow.findMany({
      include: {
        versions: {
          select: { id: true },
        },
      },
    });

    result.total = workflows.length;
    console.log(`Found ${workflows.length} workflows to process\n`);

    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const progress = `[${i + 1}/${workflows.length}]`;

      process.stdout.write(`${progress} Processing "${workflow.name}" (${workflow.id})... `);

      try {
        // Skip if workflow already has versions
        if (workflow.versions.length > 0) {
          console.log('⊘ (skipped - has versions)');
          result.skipped++;
          continue;
        }

        // Skip if content is empty
        if (!workflow.content || workflow.content.trim() === '') {
          console.log('⊘ (skipped - empty content)');
          result.skipped++;
          continue;
        }

        // Create initial version record
        await prisma.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            version: workflow.version || '1.0.0',
            content: workflow.content,
            createdBy: 'migration-script',
          },
        });

        console.log('✓');
        result.success++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.log(`✗ (${error})`);
        result.errors.push({ id: workflow.id, name: workflow.name, error });
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  console.log('\n=== Migration Complete ===\n');
  console.log(`Total:     ${result.total}`);
  console.log(`Success:   ${result.success}`);
  console.log(`Skipped:   ${result.skipped}`);
  console.log(`Errors:    ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\n=== Errors ===');
    for (const err of result.errors) {
      console.log(`  ${err.name} (${err.id}): ${err.error}`);
    }
  }

  await prisma.$disconnect();
}

main()
  .catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
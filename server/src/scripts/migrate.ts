import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const LOCAL_STORAGE_KEY_PREFIX = 'prism:workflow:';
const INDEX_KEY = 'prism:workflows:index';

interface LocalWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: unknown[];
  connections: unknown[];
  inputs: unknown[];
  outputs: unknown[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author?: string;
    tags?: string[];
  };
}

function getLocalStorageData(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    // Node.js environment - read from a JSON file if provided
    return null;
  }
  return localStorage.getItem(key);
}

function parseLocalStorage(): LocalWorkflow[] {
  const workflows: LocalWorkflow[] = [];

  if (typeof localStorage === 'undefined') {
    console.log('localStorage not available in Node.js environment');
    console.log('Please provide a JSON export of your localStorage data');
    console.log('Usage: pnpm migrate:local <path-to-localstorage-export.json>');
    return workflows;
  }

  try {
    const indexJson = localStorage.getItem(INDEX_KEY);
    if (!indexJson) {
      console.log('No workflow index found in localStorage');
      return workflows;
    }

    const ids: string[] = JSON.parse(indexJson);
    console.log(`Found ${ids.length} workflows in localStorage index`);

    for (const id of ids) {
      try {
        const key = `${LOCAL_STORAGE_KEY_PREFIX}${id}`;
        const data = localStorage.getItem(key);
        if (data) {
          const workflow = JSON.parse(data) as LocalWorkflow;
          workflows.push(workflow);
        }
      } catch (err) {
        console.warn(`Failed to parse workflow ${id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error reading localStorage:', err);
  }

  return workflows;
}

async function migrateWorkflow(workflow: LocalWorkflow): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if workflow already exists in API
    const existing = await prisma.workflow.findUnique({
      where: { id: workflow.id },
    });

    if (existing) {
      return { success: false, error: 'Already exists - skipped' };
    }

    // Get or create default user
    let user = await prisma.user.findFirst({
      where: { email: 'default@localhost' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'default@localhost',
          name: 'Default User',
          password: process.env.SEED_USER_PASSWORD || 'migrated',
        },
      });
    }

    // Create workflow in API
    await prisma.workflow.create({
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        content: JSON.stringify({
          id: workflow.id,
          name: workflow.name,
          version: workflow.version,
          nodes: workflow.nodes,
          connections: workflow.connections,
          inputs: workflow.inputs,
          outputs: workflow.outputs,
          metadata: workflow.metadata,
        }),
        userId: user.id,
        status: 'DRAFT',
      },
    });

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

function parseWorkflowsFromJsonFile(filePath: string): LocalWorkflow[] {
  const workflows: LocalWorkflow[] = [];

  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      workflows.push(...data);
    } else if (typeof data === 'object' && data !== null) {
      // Single workflow object
      workflows.push(data as LocalWorkflow);
    }
  } catch (err) {
    throw new Error(`Failed to parse JSON file: ${err}`);
  }

  return workflows;
}

async function main() {
  console.log('=== Prism Workflow Migration Tool ===\n');

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  pnpm migrate:local          - Migrate from localStorage (requires browser environment)');
    console.log('  pnpm migrate:local <file>   - Migrate from JSON export of localStorage');
    console.log('\nTo export localStorage to JSON:');
    console.log('  1. Open DevTools in the browser');
    console.log('  2. Run: JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("prism:"))))');
    console.log('  3. Copy the output to a .json file');
    console.log('  4. Run: pnpm migrate:local ./path/to/export.json\n');
    return;
  }

  let workflows: LocalWorkflow[] = [];

  if (args[0] === 'local' && args[1]) {
    // Migrate from JSON file
    const filePath = join(process.cwd(), args[1]);
    console.log(`Reading workflows from: ${filePath}`);
    workflows = parseWorkflowsFromJsonFile(filePath);
  } else {
    // Try to parse from localStorage
    workflows = parseLocalStorage();
  }

  if (workflows.length === 0) {
    console.log('\nNo workflows found to migrate.');
    return;
  }

  console.log(`\nFound ${workflows.length} workflows to migrate\n`);
  console.log('Starting migration...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: string; name: string; error: string }> = [];

  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];
    const progress = `[${i + 1}/${workflows.length}]`;

    process.stdout.write(`${progress} Migrating "${workflow.name}" (${workflow.id})... `);

    const result = await migrateWorkflow(workflow);

    if (result.success) {
      console.log('✓');
      successCount++;
    } else if (result.error?.includes('skipped')) {
      console.log('⊘ (skipped - already exists)');
      skipCount++;
    } else {
      console.log(`✗ (${result.error})`);
      errorCount++;
      errors.push({ id: workflow.id, name: workflow.name, error: result.error || 'Unknown error' });
    }
  }

  console.log('\n=== Migration Complete ===\n');
  console.log(`Successful: ${successCount}`);
  console.log(`Skipped:    ${skipCount}`);
  console.log(`Errors:     ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n=== Errors ===');
    for (const err of errors) {
      console.log(`  ${err.name} (${err.id}): ${err.error}`);
    }
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

import { describe, it, expect, beforeEach } from 'vitest';
import { resetStorage } from '../test-setup';
import { LocalStorageAdapter } from './LocalStorageAdapter';

const PREFIX = 'test:prism:';

function createAdapter() {
  return new LocalStorageAdapter(PREFIX);
}

describe('LocalStorageAdapter', () => {

  beforeEach(() => {
    resetStorage();
  });

  // ── createWorkflow ────────────────────────────────────────────────────────

  describe('createWorkflow', () => {
    it('creates a new workflow with metadata and content', async () => {
      const adapter = createAdapter();
      const { meta, content } = await adapter.createWorkflow('My Workflow', 'A test description', 'Data Pipeline');

      expect(meta.name).toBe('My Workflow');
      expect(meta.description).toBe('A test description');
      expect(meta.category).toBe('Data Pipeline');
      expect(meta.status).toBe('draft');
      expect(meta.version).toBe('1.0.0');
      expect(meta.id).toBeTruthy();
      expect(meta.createdAt).toBeTruthy();
      expect(meta.updatedAt).toBeTruthy();

      expect(content.id).toBe(meta.id);
      expect(content.name).toBe('My Workflow');
      expect(content.nodes).toEqual([]);
      expect(content.connections).toEqual([]);
    });

    it('adds the workflow id to the index', async () => {
      const adapter = createAdapter();
      const { meta } = await adapter.createWorkflow('First');
      await adapter.createWorkflow('Second');

      const list = await adapter.list();
      expect(list.map((w) => w.id)).toContain(meta.id);
      expect(list).toHaveLength(2);
    });

    it('creates workflow with minimal fields when description and category are omitted', async () => {
      const adapter = createAdapter();
      const { meta } = await adapter.createWorkflow('Minimal Workflow');

      expect(meta.name).toBe('Minimal Workflow');
      expect(meta.description).toBeUndefined();
      expect(meta.category).toBeUndefined();
    });
  });

  // ── deleteWorkflow ────────────────────────────────────────────────────────

  describe('delete (workflow id)', () => {
    it('removes both workflow content and meta keys', async () => {
      const adapter = createAdapter();
      const { meta } = await adapter.createWorkflow('To Delete');

      await adapter.delete(meta.id);

      await expect(adapter.load(meta.id)).rejects.toThrow();
      const list = await adapter.list();
      expect(list.find((w) => w.id === meta.id)).toBeUndefined();
    });

    it('removes id from the workflows index', async () => {
      const adapter = createAdapter();
      const { meta: first } = await adapter.createWorkflow('First');
      const { meta: second } = await adapter.createWorkflow('Second');

      await adapter.delete(first.id);

      const list = await adapter.list();
      expect(list.map((w) => w.id)).not.toContain(first.id);
      expect(list.map((w) => w.id)).toContain(second.id);
    });
  });

  // ── updateWorkflowMeta ─────────────────────────────────────────────────────

  describe('updateWorkflowMeta', () => {
    it('updates specified fields and sets updatedAt', async () => {
      const adapter = createAdapter();
      const { meta } = await adapter.createWorkflow('Original');

      await new Promise((r) => setTimeout(r, 10)); // ensure different timestamp
      await adapter.updateWorkflowMeta(meta.id, {
        name: 'Updated Name',
        status: 'published',
        description: 'New description',
      });

      const updated = (await adapter.list()).find((w) => w.id === meta.id)!;
      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('published');
      expect(updated.description).toBe('New description');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(meta.updatedAt).getTime());
    });

    it('preserves fields not included in the patch', async () => {
      const adapter = createAdapter();
      const { meta } = await adapter.createWorkflow('Original', 'Some desc', 'Infra');

      await adapter.updateWorkflowMeta(meta.id, { status: 'published' });

      const updated = (await adapter.list()).find((w) => w.id === meta.id)!;
      expect(updated.name).toBe('Original');
      expect(updated.description).toBe('Some desc');
      expect(updated.category).toBe('Infra');
    });

    it('throws when id does not exist', async () => {
      const adapter = createAdapter();
      await expect(
        adapter.updateWorkflowMeta('nonexistent-id', { name: 'X' })
      ).rejects.toThrow();
    });
  });

  // ── list: sorted order ─────────────────────────────────────────────────────

  describe('list sorted order', () => {
    it('returns workflows sorted by updatedAt descending (most recent first)', async () => {
      const adapter = createAdapter();
      const { meta: first } = await adapter.createWorkflow('First');
      await new Promise((r) => setTimeout(r, 50)); // ensure updateWorkflowMeta has clearly later timestamp
      await adapter.updateWorkflowMeta(first.id, { name: 'First Updated' });
      await new Promise((r) => setTimeout(r, 50));
      const { meta: second } = await adapter.createWorkflow('Second');
      await new Promise((r) => setTimeout(r, 50));
      const { meta: third } = await adapter.createWorkflow('Third');

      const list = await adapter.list();
      // Third created last, Second created before third
      expect(list[0].name).toBe('Third');
      expect(list[1].name).toBe('Second');
      expect(list[2].name).toBe('First Updated');
    });
  });

  // ── migration idempotency ──────────────────────────────────────────────────

  describe('migration idempotency', () => {
    it('migration is idempotent: running twice produces the same result', async () => {
      const adapter1 = createAdapter();
      const { meta } = await adapter1.createWorkflow('Migrated');

      // Simulate re-initialising by creating a new adapter instance (triggers runMigration)
      const adapter2 = createAdapter();

      const list = await adapter2.list();
      expect(list.find((w) => w.id === meta.id)).toBeDefined();
      expect(list).toHaveLength(1);
    });

    it('migration does not duplicate workflows already in the index', async () => {
      const adapter1 = createAdapter();
      await adapter1.createWorkflow('Existing');

      // Trigger migration again via new instance
      const adapter2 = createAdapter();
      await adapter2.createWorkflow('New');

      const list = await adapter2.list();
      expect(list).toHaveLength(2);
    });

    it('migration flag prevents re-running', async () => {
      const adapter = createAdapter();
      await adapter.createWorkflow('Workflow');

      // Run migration a second time
      const adapter2 = createAdapter();
      const list = await adapter2.list();
      expect(list).toHaveLength(1);
    });
  });

  // ── save / load round-trip ────────────────────────────────────────────────

  describe('save and load', () => {
    it('saves and loads a workflow correctly', async () => {
      const adapter = createAdapter();
      const { meta } = await adapter.createWorkflow('Source');
      const workflow = await adapter.load(meta.id);
      workflow.name = 'Loaded and Modified';
      await adapter.save(workflow);

      const reloaded = await adapter.load(meta.id);
      expect(reloaded.name).toBe('Loaded and Modified');
    });
  });
});

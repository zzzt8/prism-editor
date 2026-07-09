// Unit tests for product-template-service
// Phase 2: covers selectProductionFlow / validateTemplateHasBothFlows / getById

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '../db/client.js';
import {
  create,
  getById,
  deleteTemplate,
  addFlow,
  deleteFlow,
  selectProductionFlow,
  validateTemplateHasBothFlows,
  TemplateNotFoundError,
  FlowNotFoundError,
  RenderPlatformNotFoundError,
} from './product-template-service.js';

const TEST_TEMPLATE = {
  name: 'Test Template',
  description: 'For unit tests',
  content: '{}',
};

const BROWSER_FLOW = {
  name: 'Preview Flow',
  platform: 'browser' as const,
  content: '{"nodes":[]}',
};

const NODEJS_FLOW = {
  name: 'Production Flow',
  platform: 'nodejs' as const,
  content: '{"nodes":[]}',
};

describe('product-template-service', () => {
  let templateId: string;

  beforeAll(async () => {
    const t = await create(TEST_TEMPLATE);
    templateId = t.id;
  });

  afterAll(async () => {
    await prisma.productTemplate.deleteMany({ where: { id: templateId } });
  });

  describe('getById', () => {
    it('returns template when exists', async () => {
      const result = await getById(templateId);
      expect(result.id).toBe(templateId);
      expect(result.name).toBe(TEST_TEMPLATE.name);
    });

    it('throws TemplateNotFoundError when not found', async () => {
      await expect(getById('non-existent-id')).rejects.toThrow(TemplateNotFoundError);
    });
  });

  describe('addFlow + selectProductionFlow', () => {
    let nodejsFlowId: string;

    afterEach(async () => {
      await prisma.workflow.deleteMany({ where: { templateId } });
    });

    it('selects nodejs platform flow', async () => {
      const flow = await addFlow(templateId, NODEJS_FLOW);
      nodejsFlowId = flow.id;
      const result = await selectProductionFlow(templateId);
      expect(result.platform).toBe('nodejs');
      expect(result.id).toBe(nodejsFlowId);
    });

    it('throws RenderPlatformNotFoundError when no nodejs flow exists', async () => {
      await expect(selectProductionFlow(templateId)).rejects.toThrow(RenderPlatformNotFoundError);
    });
  });

  describe('validateTemplateHasBothFlows', () => {
    afterEach(async () => {
      await prisma.workflow.deleteMany({ where: { templateId } });
    });

    it('throws when no browser flow', async () => {
      await addFlow(templateId, NODEJS_FLOW);
      await expect(validateTemplateHasBothFlows(templateId)).rejects.toThrow('preview');
    });

    it('throws when no nodejs flow', async () => {
      await addFlow(templateId, BROWSER_FLOW);
      await expect(validateTemplateHasBothFlows(templateId)).rejects.toThrow('production');
    });

    it('succeeds when both flows exist', async () => {
      await addFlow(templateId, BROWSER_FLOW);
      await addFlow(templateId, NODEJS_FLOW);
      await expect(validateTemplateHasBothFlows(templateId)).resolves.toBeUndefined();
    });
  });
});

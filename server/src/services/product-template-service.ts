// ProductTemplate service — business logic layer for CRUD + Flow management
// Phase 2: ProductTemplate multi-flow support

import { prisma } from '../db/client.js';
import type { ProductTemplate, Workflow } from '@prisma/client';
import type {
  CreateProductTemplateInput,
  UpdateProductTemplateInput,
  CreateFlowInput,
  UpdateFlowInput,
} from '../schemas/templates.js';

// --- Error types ---

export class TemplateNotFoundError extends Error {
  readonly code = 'TEMPLATE_NOT_FOUND' as const;
  constructor(id: string) {
    super(`ProductTemplate not found: ${id}`);
    this.name = 'TemplateNotFoundError';
  }
}

export class FlowNotFoundError extends Error {
  readonly code = 'FLOW_NOT_FOUND' as const;
  constructor(identifier?: string, reason?: string) {
    const msg = reason
      ? `Flow not found (${reason}): ${identifier ?? 'unknown'}`
      : identifier
        ? `Flow not found: ${identifier}`
        : 'Flow not found';
    super(msg);
    this.name = 'FlowNotFoundError';
  }
}

export class RenderPlatformNotFoundError extends Error {
  readonly code = 'PLATFORM_NOT_FOUND' as const;
  constructor(templateId: string) {
    super(`No nodejs platform Flow found for template: ${templateId}`);
    this.name = 'RenderPlatformNotFoundError';
  }
}

// --- Template operations ---

/**
 * List all ProductTemplates (without workflows content, just metadata).
 */
export async function listTemplates(): Promise<Omit<ProductTemplate, 'content'>[]> {
  return prisma.productTemplate.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Get a ProductTemplate by ID. Throws TemplateNotFoundError if not found.
 */
export async function getById(id: string): Promise<ProductTemplate> {
  const template = await prisma.productTemplate.findUnique({ where: { id } });
  if (!template) throw new TemplateNotFoundError(id);
  return template;
}

/**
 * Create a new ProductTemplate.
 */
export async function create(
  data: CreateProductTemplateInput
): Promise<ProductTemplate> {
  return prisma.productTemplate.create({ data });
}

/**
 * Update a ProductTemplate. Throws TemplateNotFoundError if not found.
 */
export async function update(
  id: string,
  data: UpdateProductTemplateInput
): Promise<ProductTemplate> {
  await getById(id); // validate existence
  return prisma.productTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.content !== undefined && { content: data.content }),
    },
  });
}

/**
 * Delete a ProductTemplate and all its Flows (cascade). Throws TemplateNotFoundError if not found.
 */
export async function deleteTemplate(id: string): Promise<void> {
  await getById(id); // validate existence
  await prisma.productTemplate.delete({ where: { id } });
}

// --- Flow operations ---

/**
 * List all Flows for a given template. Throws TemplateNotFoundError if template not found.
 */
export async function listFlows(
  templateId: string
): Promise<Omit<Workflow, 'content'>[]> {
  await getById(templateId); // validate existence
  return prisma.workflow.findMany({
    where: { templateId },
    select: {
      id: true,
      templateId: true,
      flowKey: true,
      name: true,
      platform: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get a single Flow by ID. Throws FlowNotFoundError if not found.
 */
export async function getFlowById(flowId: string): Promise<Workflow> {
  const flow = await prisma.workflow.findUnique({ where: { id: flowId } });
  if (!flow) throw new FlowNotFoundError(flowId);
  return flow;
}

/**
 * Add a new Flow to a template. Throws TemplateNotFoundError if template not found.
 */
export async function addFlow(
  templateId: string,
  data: CreateFlowInput
): Promise<Workflow> {
  await getById(templateId); // validate existence
  return prisma.workflow.create({
    data: {
      templateId,
      name: data.name,
      flowKey: data.flowKey,
      platform: data.platform,
      content: data.content,
    },
  });
}

/**
 * Update a Flow. Throws FlowNotFoundError if not found.
 */
export async function updateFlow(
  flowId: string,
  data: UpdateFlowInput
): Promise<Workflow> {
  await getFlowById(flowId); // validate existence
  return prisma.workflow.update({
    where: { id: flowId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.flowKey !== undefined && { flowKey: data.flowKey }),
      ...(data.platform !== undefined && { platform: data.platform }),
      ...(data.content !== undefined && { content: data.content }),
    },
  });
}

/**
 * Delete a Flow. Throws FlowNotFoundError if not found.
 */
export async function deleteFlow(flowId: string): Promise<void> {
  await getFlowById(flowId); // validate existence
  await prisma.workflow.delete({ where: { id: flowId } });
}

/**
 * Select a Flow by exact (templateId, templateVersion, flowKey).
 *
 * Uses Prisma findUnique with the @@unique([templateId, flowKey]) constraint
 * for O(1) deterministic lookup. Verifies templateVersion matches before
 * returning.
 *
 * @throws FlowNotFoundError when the flow does not exist or version mismatches.
 */
export async function selectFlowByKey(
  templateId: string,
  templateVersion: string,
  flowKey: string,
): Promise<Workflow> {
  const flow = await prisma.workflow.findUnique({
    where: { templateId_flowKey: { templateId, flowKey } },
    include: { template: true },
  });

  if (!flow) {
    throw new FlowNotFoundError(flowKey, 'not found');
  }

  if (flow.template.version !== templateVersion) {
    throw new FlowNotFoundError(
      flowKey,
      `templateVersion mismatch (expected ${templateVersion}, got ${flow.template.version})`,
    );
  }

  return flow;
}

// --- Query helpers ---

/**
 * @deprecated Use selectFlowByKey instead. This function uses findFirst
 * (implicit platform filter) and is non-deterministic when multiple nodejs
 * Flows exist per template. Will be removed in M4.
 */
export async function selectProductionFlow(
  templateId: string
): Promise<Workflow> {
  const flow = await prisma.workflow.findFirst({
    where: { templateId, platform: 'nodejs' },
  });
  if (!flow) throw new RenderPlatformNotFoundError(templateId);
  return flow;
}

/**
 * Validate that a template has at least 1 preview (browser) and 1 production (nodejs) Flow.
 * Used before saving / publishing.
 */
export async function validateTemplateHasBothFlows(
  templateId: string
): Promise<void> {
  const [browserCount, nodejsCount] = await Promise.all([
    prisma.workflow.count({ where: { templateId, platform: 'browser' } }),
    prisma.workflow.count({ where: { templateId, platform: 'nodejs' } }),
  ]);
  if (browserCount === 0) {
    throw new Error('VALIDATION_ERROR: Template must have at least 1 preview (browser) Flow');
  }
  if (nodejsCount === 0) {
    throw new Error('VALIDATION_ERROR: Template must have at least 1 production (nodejs) Flow');
  }
}

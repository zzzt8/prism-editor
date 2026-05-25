import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { SKURenderParamsSchema, SKURenderBodySchema } from '../schemas/sku-render.js';
import { nodeExecutors } from '@prism/image-ops/nodejs';
import type { Workflow, WorkflowNode } from '@prism/shared-types';
import { createRequire } from 'module';
import { saveRenderedImage, type StoredFile } from '../services/file-storage.js';

const require = createRequire(import.meta.url);

// Lazy load to avoid circular dependencies
function getWorkflowExecutor() {
  const { WorkflowExecutorNodeJs } = require('@prism/workflow-core');
  return WorkflowExecutorNodeJs;
}

interface RenderResult {
  files: StoredFile[];
  renderedAt: string;
}

const skuRenderRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const getCurrentUserId = (request: FastifyRequest): string => {
    return request.user.userId;
  };

  // POST /api/skus/:id/render - Render SKU with backend workflow
  fastify.post<{
    Params: { id: string };
    Body: { userParams?: Record<string, unknown>; workflowIds?: string[] };
  }>('/skus/:id/render', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = getCurrentUserId(request);
    const params = SKURenderParamsSchema.parse(request.params);
    const body = SKURenderBodySchema.parse(request.body);
    const { userParams, workflowIds } = body;

    // Get SKU with associated workflows
    const sku = await prisma.sKU.findUnique({
      where: { id: params.id },
      include: {
        workflows: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                content: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!sku) {
      return reply.status(404).send({ error: 'SKU not found' });
    }

    // Check user has access to at least one associated workflow
    const accessibleWorkflows = sku.workflows.filter((sw) => sw.workflow.userId === userId);
    if (accessibleWorkflows.length === 0) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Filter to requested workflowIds if provided
    const workflowsToRender = workflowIds && workflowIds.length > 0
      ? accessibleWorkflows.filter((sw) => workflowIds.includes(sw.workflow.id))
      : accessibleWorkflows;

    if (workflowsToRender.length === 0) {
      return reply.status(400).send({
        error: 'No valid workflows found',
        message: 'Either no workflowIds were provided or none are accessible',
      });
    }

        const files: StoredFile[] = [];
    const renderedAt = new Date().toISOString();

    for (const sw of workflowsToRender) {
      try {
        const workflowContent: Workflow = JSON.parse(sw.workflow.content);

        // Resolve assetIds in userParams and inject into workflow nodes
        const resolvedInputs = resolveAssetIds(userParams ?? {});

        // Inject userParams into load-image and load-mask nodes
        const modifiedNodes = injectUserInputs(workflowContent.nodes, resolvedInputs);

        const workflowForExecution: Workflow = {
          ...workflowContent,
          nodes: modifiedNodes,
        };

        // Execute workflow with Node.js executors
        const WorkflowExecutorClass = getWorkflowExecutor();
        const executor = new WorkflowExecutorClass({ nodeExecutors });
        const result = await executor.execute(workflowForExecution);

        if (result.status === 'error') {
          request.log.error({
            workflowId: sw.workflow.id,
            error: result.error,
          }, 'Workflow execution failed');
          return reply.status(500).send({
            error: 'Workflow execution failed',
            workflowId: sw.workflow.id,
            message: result.error,
          });
        }

        // Extract output images from results and save to storage
        const workflowFiles = await extractAndSaveOutputFiles(result.results, sw.workflow.name);
        files.push(...workflowFiles);
      } catch (err) {
        request.log.error({
          err,
          workflowId: sw.workflow.id,
        }, 'Failed to execute workflow');
        return reply.status(500).send({
          error: 'Failed to execute workflow',
          workflowId: sw.workflow.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const response: RenderResult = {
      files,
      renderedAt,
    };

    return response;
  });
};

/**
 * Resolve assetId references in userParams.
 *
 * Parsing rules (from shared-types/sku.ts):
 * - If value starts with 'asset:' → lookup in asset store by ID (placeholder)
 * - If value starts with 'blob:' → treat as blob URL (placeholder for server)
 * - Otherwise → treat as external URL directly
 */
function resolveAssetIds(userParams: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(userParams)) {
    if (typeof value === 'string') {
      if (value.startsWith('asset:')) {
        // TODO: Implement asset store lookup
        // For now, treat as URL directly
        resolved[key] = value;
      } else if (value.startsWith('blob:')) {
        // blob: URLs are browser-specific, treat as invalid for server
        throw new Error(`blob: URLs cannot be used for server-side rendering: ${key}`);
      } else {
        // External URL
        resolved[key] = value;
      }
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Inject user input values into workflow nodes.
 * For load-image and load-mask nodes, inject the resolved URL.
 * For other nodes with exposed params, inject user values.
 */
function injectUserInputs(
  nodes: WorkflowNode[],
  userInputs: Record<string, unknown>
): WorkflowNode[] {
  return nodes.map((node) => {
    const modifiedParams = { ...node.params };

    // For load-image and load-mask nodes, inject url from userInputs
    if (node.type === 'load-image' || node.type === 'load-mask') {
      // Try to find matching input key (format: "{nodeId}:out" or "{nodeId}:image")
      const inputKeyOut = `${node.id}:out`;
      const inputKeyImage = `${node.id}:image`;

      if (userInputs[inputKeyOut] !== undefined) {
        modifiedParams.url = userInputs[inputKeyOut];
      } else if (userInputs[inputKeyImage] !== undefined) {
        modifiedParams.url = userInputs[inputKeyImage];
      }
    }

    // For other nodes, look for params with matching nodeId:paramId keys
    for (const [inputKey, inputValue] of Object.entries(userInputs)) {
      if (inputKey.startsWith(`${node.id}:`)) {
        const paramId = inputKey.split(':')[1];
        if (paramId) {
          modifiedParams[paramId] = inputValue;
        }
      }
    }

    return {
      ...node,
      params: modifiedParams,
    };
  });
}

/**
 * Extract output files from workflow execution results and save them to storage.
 * Currently extracts image outputs from composite and export nodes.
 */
async function extractAndSaveOutputFiles(
  results: Record<string, Record<string, unknown>>,
  workflowName: string
): Promise<StoredFile[]> {
  const files: StoredFile[] = [];

  for (const [nodeId, nodeResult] of Object.entries(results)) {
    // Check for image output format (from compositeExecutor or exportExecutor)
    if (nodeResult && typeof nodeResult === 'object') {
      const resultObj = nodeResult as Record<string, unknown>;

      // Composite executor output format
      if (resultObj.type === 'composite' || resultObj.type === 'export') {
        const imageData = resultObj.image as {
          data?: unknown;
          width?: number;
          height?: number;
          previewUrl?: string;
        } | undefined;

        if (imageData?.previewUrl) {
          // Extract base64 data from previewUrl (data:image/png;base64,...)
          const storedFile = await saveRenderedImage(
            workflowName,
            { data: Buffer.from([]), width: 0, height: 0 }, // Placeholder, will be overridden
            'image/png'
          );

          // For now, use the previewUrl directly since we have base64 data
          const base64Match = imageData.previewUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const mimeType = base64Match[1];
            const base64Data = base64Match[2];
            const savedFile = await saveRenderedImage(
              workflowName,
              { data: Buffer.from(base64Data, 'base64'), width: imageData.width ?? 0, height: imageData.height ?? 0 },
              mimeType
            );
            files.push(savedFile);
          } else {
            // Non-base64 URL, pass through directly
            files.push({
              name: `${workflowName}-${nodeId}.png`,
              url: imageData.previewUrl,
              mimeType: 'image/png',
              size: 0,
            });
          }
        }
      }
    }
  }

  return files;
}

export default skuRenderRoutes;

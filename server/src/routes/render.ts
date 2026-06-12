// Render routes — workflow execution on the server side

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { WorkflowExecutorNodeJs } from '@prism/workflow-core';
import { nodeExecutors } from '@prism/image-ops/nodejs';
import { ZipArchive } from 'archiver';

// Initialize executor with all node executors
const executor = new WorkflowExecutorNodeJs({ nodeExecutors });

interface RenderWorkflowBody {
  workflow: string; // JSON string
}

interface RenderBatchBody {
  workflow: string; // JSON string
  limit?: string; // max images per batch
}

const renderRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /api/render/workflow
  // Execute a workflow with uploaded images
  fastify.post<{
    Body: RenderWorkflowBody;
  }>('/workflow', async (request, reply) => {
    const { workflow: workflowJson } = request.body;

    if (!workflowJson || typeof workflowJson !== 'string') {
      return reply.status(400).send({
        error: 'workflow JSON is required',
      });
    }

    let workflow;
    try {
      workflow = JSON.parse(workflowJson);
    } catch {
      return reply.status(400).send({
        error: 'Invalid workflow JSON',
      });
    }

    // Collect uploaded images from multipart
    const files = await request.files();
    const images: Record<string, Buffer> = {};

    for await (const file of files) {
      const buffer = await file.toBuffer();
      images[file.fieldname] = buffer;
    }

    try {
      // Execute the workflow
      // Note: In production, we would inject images into the workflow inputs
      // For now, we execute with the raw workflow and return the result
      const result = await executor.execute(workflow, {
        signal: undefined,
      });

      if (result.status === 'error') {
        return reply.status(500).send({
          error: 'Workflow execution failed',
          message: result.error,
        });
      }

      // Return results as JSON (images would need to be serialized separately)
      return reply.status(200).send({
        status: 'done',
        results: result.results,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({
        error: 'Workflow execution error',
        message,
      });
    }
  });

  // POST /api/render/batch
  // Execute workflow on multiple images and return as ZIP
  fastify.post<{
    Body: RenderBatchBody;
  }>('/batch', async (request, reply) => {
    const { workflow: workflowJson, limit: limitStr } = request.body ?? {};

    if (!workflowJson || typeof workflowJson !== 'string') {
      return reply.status(400).send({
        error: 'workflow JSON is required',
      });
    }

    let workflow;
    try {
      workflow = JSON.parse(workflowJson);
    } catch {
      return reply.status(400).send({
        error: 'Invalid workflow JSON',
      });
    }

    const limit = Math.min(parseInt(limitStr ?? '10', 10), 100);

    // Collect uploaded images
    const files = await request.files();
    const images: Buffer[] = [];

    for await (const file of files) {
      if (images.length >= limit) break;
      const buffer = await file.toBuffer();
      images.push(buffer);
    }

    if (images.length === 0) {
      return reply.status(400).send({
        error: 'At least one image is required',
      });
    }

    // Process images and create ZIP
    const archive: ZipArchive = new ZipArchive({ zlib: { level: 9 } });

    // Set up response headers for ZIP download
    reply.header('Content-Type', 'application/zip');
    reply.header(
      'Content-Disposition',
      'attachment; filename="render-results.zip"'
    );

    // Pipe archive to response
    archive.pipe(reply as unknown as NodeJS.WritableStream);

    // Execute workflow for each image
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await executor.execute(workflow, {
          signal: undefined,
        });

        if (result.status === 'done' && result.results) {
          // Add result to ZIP
          const resultJson = JSON.stringify(result.results, null, 2);
          archive.append(resultJson, { name: `result-${i + 1}.json` });
        }
      } catch {
        // Skip failed images, log them
        archive.append(
          JSON.stringify({ error: 'Execution failed' }),
          { name: `result-${i + 1}.json` }
        );
      }
    }

    archive.finalize();
  });
};

export default renderRoutes;

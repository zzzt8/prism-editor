// Render routes — workflow execution on the server side

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { WorkflowExecutorNodeJs } from '@prism/workflow-core';
import { nodeExecutors } from '@prism/image-ops/nodejs';
import { ZipArchive } from 'archiver';

// Initialize executor with all node executors
const executor = new WorkflowExecutorNodeJs({ nodeExecutors });

// Marker for user-provided input injection
const USER_INPUT_MARKER = '__USER_INPUT__';

interface RenderWorkflowBody {
  workflow: string; // JSON string
}

interface RenderBatchBody {
  workflow: string; // JSON string
  limit?: string; // max images per batch
}

/**
 * Inject user-provided images into workflow nodes.
 * Finds nodes with "__USER_INPUT__" marker and replaces with the uploaded image.
 */
function injectUserInputs(workflow: any, images: Record<string, string>): any {
  const updatedNodes = workflow.nodes.map((node: any) => {
    if (!node.params) return node;

    const updatedParams = { ...node.params };
    let modified = false;

    for (const [key, value] of Object.entries(updatedParams)) {
      if (value === USER_INPUT_MARKER) {
        // Check if there's an uploaded image for this node
        const imageKey = `${node.id}:${key}`;
        const imageData = images[imageKey] || images[node.id] || Object.values(images)[0];
        if (imageData) {
          updatedParams[key] = imageData;
          modified = true;
        }
      }
    }

    return modified ? { ...node, params: updatedParams } : node;
  });

  return { ...workflow, nodes: updatedNodes };
}

/**
 * Collect uploaded images and convert to data URLs.
 */
async function collectImages(files: AsyncIterable<any>): Promise<Record<string, string>> {
  const images: Record<string, string> = {};
  let index = 0;

  for await (const file of files) {
    const buffer = await file.toBuffer();
    const mimeType = file.mimetype || 'image/png';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Support both named fields and sequential access
    const key = file.fieldname !== 'images' ? file.fieldname : `image-${index++}`;
    images[key] = dataUrl;
  }

  return images;
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

    let workflow: any;
    try {
      workflow = JSON.parse(workflowJson);
    } catch {
      return reply.status(400).send({
        error: 'Invalid workflow JSON',
      });
    }

    // Collect uploaded images from multipart
    const images = await collectImages(request.files());

    // Inject user inputs into workflow nodes
    const updatedWorkflow = injectUserInputs(workflow, images);

    try {
      const result = await executor.execute(updatedWorkflow, {
        signal: undefined,
      });

      if (result.status === 'error') {
        return reply.status(500).send({
          error: 'Workflow execution failed',
          message: result.error,
        });
      }

      // Extract final image output for response
      const results = result.results || {};
      const finalNodeId = Object.keys(results).pop();
      const finalOutput = finalNodeId ? (results[finalNodeId] as any) : null;

      // Build response with preview/image data
      const response: any = {
        status: 'done',
        results,
      };

      // If the output has an image/previewUrl, include it
      if (finalOutput?.previewUrl) {
        response.image = finalOutput.previewUrl;
      } else if (finalOutput?.image?.previewUrl) {
        response.image = finalOutput.image.previewUrl;
      }

      return reply.status(200).send(response);
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

    let workflow: any;
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
    const imageList: Record<string, string>[] = [];
    let index = 0;

    for await (const file of files) {
      if (imageList.length >= limit) break;
      const buffer = await file.toBuffer();
      const mimeType = file.mimetype || 'image/png';
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      imageList.push({ [`image-${index++}`]: dataUrl });
    }

    if (imageList.length === 0) {
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
    for (let i = 0; i < imageList.length; i++) {
      try {
        const updatedWorkflow = injectUserInputs(workflow, imageList[i]);
        const result = await executor.execute(updatedWorkflow, {
          signal: undefined,
        });

        if (result.status === 'done' && result.results) {
          // Extract final output
          const results = result.results;
          const finalNodeId = Object.keys(results).pop();
          const finalOutput = finalNodeId ? (results[finalNodeId] as any) : null;

          const resultData: any = {
            index: i + 1,
            results,
          };

          // Include image data if available
          if (finalOutput?.previewUrl) {
            resultData.image = finalOutput.previewUrl;
          } else if (finalOutput?.image?.previewUrl) {
            resultData.image = finalOutput.image.previewUrl;
          }

          archive.append(JSON.stringify(resultData, null, 2), { name: `result-${i + 1}.json` });
        } else {
          archive.append(
            JSON.stringify({ error: result.error || 'Execution failed' }),
            { name: `result-${i + 1}.json` }
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        archive.append(
          JSON.stringify({ error: message }),
          { name: `result-${i + 1}.json` }
        );
      }
    }

    archive.finalize();
  });
};

export default renderRoutes;

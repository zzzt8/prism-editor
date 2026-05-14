// inlineExecutorWorker - Web Worker for sandboxed inline executor execution
// This worker executes untrusted inline executor code in isolation from the main thread

interface WorkerMessage {
  type: 'execute';
  executorId: string;
  code: string;
  inputs: Record<string, unknown>;
  params: Record<string, unknown>;
  context: {
    signal?: AbortSignal;
    nodeId: string;
  };
}

interface WorkerResponse {
  type: 'result' | 'error';
  executorId: string;
  result?: unknown;
  error?: string;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, executorId, code, inputs, params, context } = event.data;

  if (type !== 'execute') return;

  try {
    // Wrap code in a function and execute with timeout
    const timeoutMs = 5000; // 5 second timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Executor "${executorId}" timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const result = await Promise.race([
      executeCode(code, inputs, params, context),
      timeoutPromise,
    ]);

    const response: WorkerResponse = {
      type: 'result',
      executorId,
      result,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      type: 'error',
      executorId,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

async function executeCode(
  code: string,
  inputs: Record<string, unknown>,
  params: Record<string, unknown>,
  context: { signal?: AbortSignal; nodeId: string }
): Promise<unknown> {
  // Use Function constructor with sandboxed parameters
   
  const fn = new Function(
    'inputs',
    'params',
    'context',
    `"use strict";\n${code}`
  );

  const result = fn(inputs, params, context);

  // Handle promise return
  if (result && typeof result === 'object' && 'then' in result) {
    return await result;
  }

  return result;
}
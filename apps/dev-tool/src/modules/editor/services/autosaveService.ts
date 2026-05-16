// autosaveService - handles automatic workflow saving
// Extracted from canvasStore to reduce store complexity

import type { EditorWorkflowMeta, EditorCanvasNode, EditorCanvasEdge } from '@prism/shared-types';
import type { IWorkflowRepository } from '../../repositories/interfaces';

const AUTO_SAVE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

export interface AutosaveService {
  trigger: (
    _workflowMeta: EditorWorkflowMeta,
    _nodes: EditorCanvasNode[],
    _edges: EditorCanvasEdge[],
    _onDone: () => void
  ) => void;
  cancel: () => void;
}

export function createAutosaveService(repository: IWorkflowRepository): AutosaveService {
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    trigger(workflowMeta, nodes, edges, onDone) {
      if (!workflowMeta.id) return;

      // Cancel any existing timer
      if (autoSaveTimer !== null) {
        clearTimeout(autoSaveTimer);
      }

      autoSaveWorkflowId = workflowMeta.id;
      autoSaveTimer = setTimeout(async () => {
        autoSaveTimer = null;

        try {
          const { canvasToWorkflow } = await import('../../editor/mappers');
          const workflow = canvasToWorkflow(nodes, edges, workflowMeta);
          await repository.save(workflow);
          onDone();
        } catch (error) {
          console.error('[autosaveService] Auto-save failed:', error);
        }
      }, AUTO_SAVE_DELAY_MS);
    },

    cancel() {
      if (autoSaveTimer !== null) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
    },
  };
}

// Singleton instance for backward compatibility
let _serviceInstance: AutosaveService | null = null;

export function getAutosaveService(): AutosaveService {
  if (!_serviceInstance) {
    throw new Error('AutosaveService not initialized. Call initAutosaveService first.');
  }
  return _serviceInstance;
}

export function initAutosaveService(repository: IWorkflowRepository): void {
  _serviceInstance = createAutosaveService(repository);
}

// Default instance (lazy initialization)
export const autosaveService: AutosaveService = {
  trigger: (workflowMeta, nodes, edges, onDone) => {
    if (!_serviceInstance) {
      throw new Error('AutosaveService not initialized. Call initAutosaveService first.');
    }
    return _serviceInstance.trigger(workflowMeta, nodes, edges, onDone);
  },
  cancel: () => {
    if (_serviceInstance) {
      _serviceInstance.cancel();
    }
  },
};

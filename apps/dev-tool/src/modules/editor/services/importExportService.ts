// importExportService - handles workflow import/export operations
// Extracted from canvasStore

import type { EditorWorkflowMeta, EditorCanvasNode, EditorCanvasEdge } from '@prism/shared-types';

export interface ImportExportService {
  exportAsJson: (
    _workflowMeta: EditorWorkflowMeta,
    _nodes: EditorCanvasNode[],
    _edges: EditorCanvasEdge[]
  ) => Promise<void>;
  importFromFile: (_file: File) => Promise<{
    nodes: EditorCanvasNode[];
    edges: EditorCanvasEdge[];
    workflowMeta: EditorWorkflowMeta;
  }>;
}

interface JsonFileAdapterType {
  importFromFile: (_file: File) => Promise<import('@prism/shared-types').Workflow>;
}

export function createImportExportService(
  jsonFileAdapter: JsonFileAdapterType
): ImportExportService {
  return {
    async exportAsJson(workflowMeta, nodes, edges) {
      const { canvasToWorkflow } = await import('../../editor/mappers');
      const workflow = canvasToWorkflow(nodes, edges, workflowMeta);
      const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${workflow.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '-')}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },

    async importFromFile(file) {
      const workflow = await jsonFileAdapter.importFromFile(file);
      const { workflowToCanvas } = await import('../../editor/mappers');
      const canvas = workflowToCanvas(workflow);
      return {
        nodes: canvas.nodes,
        edges: canvas.edges,
        workflowMeta: canvas.workflowMeta,
      };
    },
  };
}

// Singleton instance for backward compatibility
let _serviceInstance: ImportExportService | null = null;

export function getImportExportService(): ImportExportService {
  if (!_serviceInstance) {
    throw new Error('ImportExportService not initialized. Call initImportExportService first.');
  }
  return _serviceInstance;
}

export function initImportExportService(jsonFileAdapter: JsonFileAdapterType): void {
  _serviceInstance = createImportExportService(jsonFileAdapter);
}

// Default instance (lazy initialization)
export const importExportService: ImportExportService = {
    async exportAsJson(workflowMeta, nodes, edges) {
    if (!_serviceInstance) {
      throw new Error('ImportExportService not initialized. Call initImportExportService first.');
    }
    return _serviceInstance.exportAsJson(workflowMeta, nodes, edges);
  },
  async importFromFile(file) {
    if (!_serviceInstance) {
      throw new Error('ImportExportService not initialized. Call initImportExportService first.');
    }
    return _serviceInstance.importFromFile(file);
  },
};

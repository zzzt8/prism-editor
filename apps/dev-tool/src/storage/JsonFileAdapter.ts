// JsonFileAdapter - export/import workflow as JSON files

import type { JsonFileAdapter } from '@prism/shared-types';
import type { Workflow } from '@prism/shared-types';

export class JsonFileAdapterImpl implements JsonFileAdapter {
  private safeName(workflow: Workflow): string {
    const s = workflow.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '-').toLowerCase();
    return `${s}-${workflow.version}.json`;
  }

  async exportToFile(workflow: Workflow): Promise<void> {
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.safeName(workflow);
    anchor.click();

    URL.revokeObjectURL(url);
  }

  async importFromFile(file: File): Promise<Workflow> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          if (!parsed.id || !parsed.name || !Array.isArray(parsed.nodes)) {
            reject(new Error('Invalid workflow JSON file'));
            return;
          }
          resolve(parsed as Workflow);
        } catch {
          reject(new Error('Failed to parse workflow JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Singleton instance
export const jsonFileAdapter = new JsonFileAdapterImpl();

// inspectorSlice - manages inspector panel state
// Independent from graph state

export type InspectorTab = 'parameters' | 'settings' | 'info';

export interface InspectorSlice {
  // State
  inspectorTab: InspectorTab;

  // Operations
  openInspector: (tab: InspectorTab, nodeId?: string) => void;
}

export function createInspectorSlice(): Pick<InspectorSlice, keyof InspectorSlice> {
  return {
    // Initial state
    inspectorTab: 'parameters',

    // Operations
    openInspector(tab) {
      return tab;
    },
  };
}

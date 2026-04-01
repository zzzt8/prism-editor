// App store - manages top-level navigation state using Zustand

import { create } from 'zustand';

interface AppState {
  view: 'workflows' | 'editor';
  currentWorkflowId: string | null;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  navigateToHome: () => void;
  navigateToEditor: (workflowId: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'workflows',
  currentWorkflowId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,

  navigateToHome: () =>
    set({ view: 'workflows', currentWorkflowId: null }),

  navigateToEditor: (workflowId: string) =>
    set({ view: 'editor', currentWorkflowId: workflowId, leftPanelOpen: true, rightPanelOpen: true }),

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));

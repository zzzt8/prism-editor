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

  navigateToEditor: (_workflowId: string) => {
    // Persist the last workflow ID so it can be restored after refresh/restart
    localStorage.setItem('prism:lastWorkflowId', _workflowId);
    set({ view: 'editor', currentWorkflowId: _workflowId, leftPanelOpen: true, rightPanelOpen: true });
  },

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));

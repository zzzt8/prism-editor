// App store — manages panel visibility state only; routing is handled by react-router

import { create } from 'zustand';

interface AppState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: true,

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
}));

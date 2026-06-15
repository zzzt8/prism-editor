// App store — manages panel visibility state only; routing is handled by react-router

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  // ── Live Preview (frontend workflow reactive execution) ───────────────────
  /** Enable reactive execution for browser-platform workflows. */
  livePreviewEnabled: boolean;
  /** Debounce window for reactive execution, in milliseconds. */
  livePreviewDebounceMs: number;

  setLivePreviewEnabled: (_enabled: boolean) => void;
  setLivePreviewDebounceMs: (_ms: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      leftPanelOpen: true,
      rightPanelOpen: true,

      toggleLeftPanel: () =>
        set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
      toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

      livePreviewEnabled: true,
      livePreviewDebounceMs: 200,

      setLivePreviewEnabled: (enabled) => set({ livePreviewEnabled: enabled }),
      setLivePreviewDebounceMs: (ms) =>
        set({ livePreviewDebounceMs: Math.max(0, Math.min(1000, ms)) }),
    }),
    {
      name: 'prism-dev-tool-app-state',
      storage: createJSONStorage(() => localStorage),
      // Only persist Live Preview settings; panel toggles stay session-local.
      partialize: (state) => ({
        livePreviewEnabled: state.livePreviewEnabled,
        livePreviewDebounceMs: state.livePreviewDebounceMs,
      }),
    },
  ),
);

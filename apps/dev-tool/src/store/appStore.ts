// App store — manages panel visibility state and editor preferences (live preview, etc.)
//
// Settings persisted to localStorage so user preferences survive page reloads.
// Panel visibility is intentionally NOT persisted (panels reset to open on reload).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'prism.dev-tool.app-prefs.v1';
const DEFAULT_LIVE_PREVIEW_DEBOUNCE_MS = 50;
const MAX_LIVE_PREVIEW_DEBOUNCE_MS = 500;
const MIN_LIVE_PREVIEW_DEBOUNCE_MS = 0;

export interface AppState {
  // Session-only
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Persisted editor preferences
  livePreviewEnabled: boolean;
  livePreviewDebounceMs: number;

  // Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLivePreviewEnabled: (_enabled: boolean) => void;
  setLivePreviewDebounceMs: (_ms: number) => void;
}

const clampDebounce = (ms: number): number => {
  if (!Number.isFinite(ms)) return DEFAULT_LIVE_PREVIEW_DEBOUNCE_MS;
  if (ms < MIN_LIVE_PREVIEW_DEBOUNCE_MS) return MIN_LIVE_PREVIEW_DEBOUNCE_MS;
  if (ms > MAX_LIVE_PREVIEW_DEBOUNCE_MS) return MAX_LIVE_PREVIEW_DEBOUNCE_MS;
  return Math.round(ms);
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      leftPanelOpen: true,
      rightPanelOpen: true,

      livePreviewEnabled: true,
      livePreviewDebounceMs: DEFAULT_LIVE_PREVIEW_DEBOUNCE_MS,

      toggleLeftPanel: () =>
        set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

      toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

      setLivePreviewEnabled: (enabled) =>
        set({ livePreviewEnabled: enabled }),

      setLivePreviewDebounceMs: (ms) =>
        set({ livePreviewDebounceMs: clampDebounce(ms) }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences. Panel visibility is session-only.
      partialize: (state) => ({
        livePreviewEnabled: state.livePreviewEnabled,
        livePreviewDebounceMs: state.livePreviewDebounceMs,
      }),
      version: 1,
    }
  )
);

export const LIVE_PREVIEW_DEBOUNCE_RANGE = {
  min: MIN_LIVE_PREVIEW_DEBOUNCE_MS,
  max: MAX_LIVE_PREVIEW_DEBOUNCE_MS,
  default: DEFAULT_LIVE_PREVIEW_DEBOUNCE_MS,
} as const;

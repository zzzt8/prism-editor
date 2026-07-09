// ComposerState - Zustand store for Composer SDK state management
// Provides reactive state for layer management and parameter binding
// Includes undo/redo history management

import { create } from 'zustand';
import type {
  LayerState,
} from './types';

export interface ComposerStoreState {
  layers: LayerState[];
  selectedLayerId: string | null;
  designParams: Record<string, number | string>;
  inputs: Record<string, string>;
}

export interface ComposerStoreActions {
  selectLayer: (_id: string | null) => void;
  updateLayer: (_id: string, _updates: Partial<LayerState>) => void;
  addLayer: (_layer: LayerState) => void;
  removeLayer: (_id: string) => void;
  updateDesignParam: (_key: string, _value: number | string) => void;
  updateInput: (_key: string, _value: string) => void;
  setLayers: (_layers: LayerState[]) => void;
  setDesignParams: (_params: Record<string, number | string>) => void;
  setInputs: (_inputs: Record<string, string>) => void;
  toggleVisibility: (_id: string) => void;
  setLocked: (_id: string, _locked: boolean) => void;
  reset: () => void;
  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface HistoryEntry {
  layers: LayerState[];
  selectedLayerId: string | null;
  designParams: Record<string, number | string>;
  inputs: Record<string, string>;
}

const MAX_HISTORY_SIZE = 50;

const initialState: ComposerStoreState = {
  layers: [],
  selectedLayerId: null,
  designParams: {},
  inputs: {},
};

export type ComposerStore = ComposerStoreState & ComposerStoreActions;

// Create a history-aware store factory
export const createComposerStore = (initial?: Partial<ComposerStoreState>) => {
  // History state (outside the store to avoid being part of state)
  let history: HistoryEntry[] = [initialState];
  let historyIndex = 0;
  let isUndoRedo = false;

  const pushHistory = (newState: HistoryEntry) => {
    // Clear any future history when adding new entry
    history = history.slice(0, historyIndex + 1);
    history.push(newState);
    // Limit history size
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(-MAX_HISTORY_SIZE);
    }
    historyIndex = history.length - 1;
  };

  const store = create<ComposerStore>()((set, get) => ({
    ...initialState,
    ...initial,

    selectLayer: (id) =>
      set({ selectedLayerId: id }),

    updateLayer: (layerId, layerUpdates) => {
      if (isUndoRedo) return;
      const state = get();
      const newLayers = state.layers.map((l) =>
        l.id === layerId ? { ...l, ...layerUpdates } : l
      );
      // Push to history
      pushHistory({ ...state, layers: newLayers });
      set({ layers: newLayers });
    },

    addLayer: (newLayer) => {
      if (isUndoRedo) return;
      const state = get();
      const newLayers = [...state.layers, newLayer];
      pushHistory({ ...state, layers: newLayers });
      set({ layers: newLayers });
    },

    removeLayer: (id) => {
      if (isUndoRedo) return;
      const state = get();
      const newLayers = state.layers.filter((layer) => layer.id !== id);
      const newSelectedLayerId =
        state.selectedLayerId === id ? null : state.selectedLayerId;
      pushHistory({
        ...state,
        layers: newLayers,
        selectedLayerId: newSelectedLayerId,
      });
      set({ layers: newLayers, selectedLayerId: newSelectedLayerId });
    },

    updateDesignParam: (paramKey, paramValue) => {
      if (isUndoRedo) return;
      const state = get();
      const newDesignParams = { ...state.designParams, [paramKey]: paramValue };
      pushHistory({ ...state, designParams: newDesignParams });
      set({ designParams: newDesignParams });
    },

    updateInput: (inputKey, inputValue) => {
      if (isUndoRedo) return;
      const state = get();
      const newInputs = { ...state.inputs, [inputKey]: inputValue };
      pushHistory({ ...state, inputs: newInputs });
      set({ inputs: newInputs });
    },

    setLayers: (newLayers) => {
      if (isUndoRedo) {
        set({ layers: newLayers });
        return;
      }
      const state = get();
      pushHistory({ ...state, layers: newLayers });
      set({ layers: newLayers });
    },

    setDesignParams: (newDesignParams) => {
      if (isUndoRedo) {
        set({ designParams: newDesignParams });
        return;
      }
      const state = get();
      pushHistory({ ...state, designParams: newDesignParams });
      set({ designParams: newDesignParams });
    },

    setInputs: (newInputs) => {
      if (isUndoRedo) {
        set({ inputs: newInputs });
        return;
      }
      const state = get();
      pushHistory({ ...state, inputs: newInputs });
      set({ inputs: newInputs });
    },

    toggleVisibility: (id) => {
      if (isUndoRedo) return;
      const state = get();
      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      );
      pushHistory({ ...state, layers: newLayers });
      set({ layers: newLayers });
    },

    setLocked: (id, locked) => {
      if (isUndoRedo) return;
      const state = get();
      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, locked } : l
      );
      pushHistory({ ...state, layers: newLayers });
      set({ layers: newLayers });
    },

    reset: () => {
      if (isUndoRedo) {
        set(initialState);
        return;
      }
      pushHistory(initialState);
      set(initialState);
      // Reset history
      history = [initialState];
      historyIndex = 0;
    },

    undo: () => {
      if (historyIndex > 0) {
        historyIndex--;
        isUndoRedo = true;
        const entry = history[historyIndex];
        set({
          layers: entry.layers,
          selectedLayerId: entry.selectedLayerId,
          designParams: entry.designParams,
          inputs: entry.inputs,
        });
        isUndoRedo = false;
      }
    },

    redo: () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        isUndoRedo = true;
        const entry = history[historyIndex];
        set({
          layers: entry.layers,
          selectedLayerId: entry.selectedLayerId,
          designParams: entry.designParams,
          inputs: entry.inputs,
        });
        isUndoRedo = false;
      }
    },

    canUndo: () => historyIndex > 0,

    canRedo: () => historyIndex < history.length - 1,
  }));

  return store;
};

// Default store instance
export const useComposerStore = createComposerStore();

// Selector hooks for performance optimization
export const useLayers = () => useComposerStore((state) => state.layers);
export const useSelectedLayer = () => {
  const layers = useComposerStore((state) => state.layers);
  const selectedLayerId = useComposerStore((state) => state.selectedLayerId);
  return layers.find((l) => l.id === selectedLayerId) ?? null;
};
export const useDesignParams = () =>
  useComposerStore((state) => state.designParams);
export const useInputs = () => useComposerStore((state) => state.inputs);

// ComposerState - Zustand store for Composer SDK state management
// Provides reactive state for layer management and parameter binding

import { create } from 'zustand';
import type {
  LayerState,
  BlendMode,
  MaskState,
  ComposerState as IComposerState,
} from './types';

export interface ComposerStoreState {
  layers: LayerState[];
  selectedLayerId: string | null;
  designParams: Record<string, number | string>;
  inputs: Record<string, string>;
}

export interface ComposerStoreActions {
  selectLayer: (id: string | null) => void;
  updateLayer: (id: string, updates: Partial<LayerState>) => void;
  addLayer: (layer: LayerState) => void;
  removeLayer: (id: string) => void;
  updateDesignParam: (key: string, value: number | string) => void;
  updateInput: (key: string, value: string) => void;
  setLayers: (layers: LayerState[]) => void;
  setDesignParams: (params: Record<string, number | string>) => void;
  setInputs: (inputs: Record<string, string>) => void;
  reset: () => void;
}

const initialState: ComposerStoreState = {
  layers: [],
  selectedLayerId: null,
  designParams: {},
  inputs: {},
};

export type ComposerStore = ComposerStoreState & ComposerStoreActions;

export const createComposerStore = (initial?: Partial<ComposerStoreState>) =>
  create<ComposerStore>((set) => ({
    ...initialState,
    ...initial,

    selectLayer: (id) =>
      set({ selectedLayerId: id }),

    updateLayer: (id, updates) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === id ? { ...layer, ...updates } : layer
        ),
      })),

    addLayer: (layer) =>
      set((state) => ({
        layers: [...state.layers, layer],
      })),

    removeLayer: (id) =>
      set((state) => ({
        layers: state.layers.filter((layer) => layer.id !== id),
        selectedLayerId:
          state.selectedLayerId === id ? null : state.selectedLayerId,
      })),

    updateDesignParam: (key, value) =>
      set((state) => ({
        designParams: { ...state.designParams, [key]: value },
      })),

    updateInput: (key, value) =>
      set((state) => ({
        inputs: { ...state.inputs, [key]: value },
      })),

    setLayers: (layers) =>
      set({ layers }),

    setDesignParams: (designParams) =>
      set({ designParams }),

    setInputs: (inputs) =>
      set({ inputs }),

    reset: () =>
      set(initialState),
  }));

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

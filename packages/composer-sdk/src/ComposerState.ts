// ComposerState - Zustand store for Composer SDK state management
// Provides reactive state for layer management and parameter binding

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

    updateLayer: (layerId, layerUpdates) =>
      set((state) => ({
        layers: state.layers.map((l) =>
          l.id === layerId ? { ...l, ...layerUpdates } : l
        ),
      })),

    addLayer: (newLayer) =>
      set((state) => ({
        layers: [...state.layers, newLayer],
      })),

    removeLayer: (id) =>
      set((state) => ({
        layers: state.layers.filter((layer) => layer.id !== id),
        selectedLayerId:
          state.selectedLayerId === id ? null : state.selectedLayerId,
      })),

    updateDesignParam: (paramKey, paramValue) =>
      set((state) => ({
        designParams: { ...state.designParams, [paramKey]: paramValue },
      })),

    updateInput: (inputKey, inputValue) =>
      set((state) => ({
        inputs: { ...state.inputs, [inputKey]: inputValue },
      })),

    setLayers: (newLayers) =>
      set({ layers: newLayers }),

    setDesignParams: (newDesignParams) =>
      set({ designParams: newDesignParams }),

    setInputs: (newInputs) =>
      set({ inputs: newInputs }),

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

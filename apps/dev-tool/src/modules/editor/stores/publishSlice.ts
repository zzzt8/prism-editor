// publishSlice - standalone Zustand store for publish dialog parameter management
// Manages enriched PublishedParamDefinition[] with visibility and validation state

import { create } from 'zustand';
import type { PublishedParamDefinition, ParamControlType } from '@prism/shared-types';

export interface PublishSlice {
  // State
  paramDefinitions: PublishedParamDefinition[];
  isDialogOpen: boolean;

  // Actions
  setParamDefinitions: (defs: PublishedParamDefinition[]) => void;
  updateParamDefinition: (nodeId: string, paramId: string, patch: Partial<PublishedParamDefinition>) => void;
  setVisibility: (nodeId: string, paramId: string, visibility: 'visible' | 'hidden' | 'locked') => void;
  setControlType: (nodeId: string, paramId: string, controlType: ParamControlType) => void;
  setLabel: (nodeId: string, paramId: string, label: string) => void;
  setDefaultValue: (nodeId: string, paramId: string, defaultValue: unknown) => void;
  clearParamDefinitions: () => void;
  setDialogOpen: (open: boolean) => void;
}

export const usePublishStore = create<PublishSlice>((set) => ({
  paramDefinitions: [],
  isDialogOpen: false,

  setParamDefinitions(defs) {
    set({ paramDefinitions: defs });
  },

  updateParamDefinition(nodeId, paramId, patch) {
    set((state) => ({
      paramDefinitions: state.paramDefinitions.map((d) =>
        d.nodeId === nodeId && d.paramId === paramId ? { ...d, ...patch } : d
      ),
    }));
  },

  setVisibility(nodeId, paramId, visibility) {
    set((state) => ({
      paramDefinitions: state.paramDefinitions.map((d) =>
        d.nodeId === nodeId && d.paramId === paramId ? { ...d, visibility } : d
      ),
    }));
  },

  setControlType(nodeId, paramId, controlType) {
    set((state) => ({
      paramDefinitions: state.paramDefinitions.map((d) =>
        d.nodeId === nodeId && d.paramId === paramId ? { ...d, controlType } : d
      ),
    }));
  },

  setLabel(nodeId, paramId, label) {
    set((state) => ({
      paramDefinitions: state.paramDefinitions.map((d) =>
        d.nodeId === nodeId && d.paramId === paramId ? { ...d, label } : d
      ),
    }));
  },

  setDefaultValue(nodeId, paramId, defaultValue) {
    set((state) => ({
      paramDefinitions: state.paramDefinitions.map((d) =>
        d.nodeId === nodeId && d.paramId === paramId ? { ...d, defaultValue } : d
      ),
    }));
  },

  clearParamDefinitions() {
    set({ paramDefinitions: [] });
  },

  setDialogOpen(open) {
    set({ isDialogOpen: open });
  },
}));

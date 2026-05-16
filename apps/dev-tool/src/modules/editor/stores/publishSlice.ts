// publishSlice - standalone Zustand store for publish dialog parameter management
// Manages enriched PublishedParamDefinition[] with visibility and validation state

import { create } from 'zustand';
import type { PublishedParamDefinition, ParamControlType } from '@prism/shared-types';

export interface PublishSlice {
  // State
  paramDefinitions: PublishedParamDefinition[];
  isDialogOpen: boolean;

  // Actions
  setParamDefinitions: (_defs: PublishedParamDefinition[]) => void;
  updateParamDefinition: (_nodeId: string, _paramId: string, _patch: Partial<PublishedParamDefinition>) => void;
  setVisibility: (_nodeId: string, _paramId: string, _visibility: 'visible' | 'hidden' | 'locked') => void;
  setControlType: (_nodeId: string, _paramId: string, _controlType: ParamControlType) => void;
  setLabel: (_nodeId: string, _paramId: string, _label: string) => void;
  setDefaultValue: (_nodeId: string, _paramId: string, _defaultValue: unknown) => void;
  clearParamDefinitions: () => void;
  setDialogOpen: (_open: boolean) => void;
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

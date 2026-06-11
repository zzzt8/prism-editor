import { create } from 'zustand';
import { createId, type ProductTemplate, type ProductTemplateSummary } from '@prism/shared-types';
import { ProductTemplateRepository } from '../modules/repositories';

const productTemplateRepository = new ProductTemplateRepository();

function createEmptyProductTemplate(): ProductTemplate {
  const now = new Date().toISOString();

  return {
    id: createId(),
    name: 'Untitled Product',
    version: '1.0.0',
    description: '',
    inputs: [],
    designParams: [],
    assets: [],
    preview: {
      canvas: {
        width: 1920,
        height: 1080,
        background: '#ffffff',
        fit: 'contain',
        viewport: { x: 0, y: 0, zoom: 1 },
        layers: [],
      },
      flow: {
        type: 'workflow',
      },
    },
    production: {
      output: {
        format: 'png',
        dpi: 300,
        size: {
          width: 1920,
          height: 1080,
          unit: 'px',
        },
        outputs: [],
      },
      flow: {
        type: 'none',
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}

interface ProductTemplateState {
  currentProductTemplate: ProductTemplate | null;
  productTemplateList: ProductTemplateSummary[];
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  isEditorOpen: boolean;

  openEditor: () => void;
  closeEditor: () => void;
  loadProductTemplateList: () => Promise<void>;
  newProductTemplate: () => void;
  loadProductTemplate: (id: string) => Promise<void>;
  updateProductTemplate: (patch: Partial<ProductTemplate>) => void;
  saveProductTemplate: () => Promise<ProductTemplate | null>;
  deleteProductTemplate: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useProductTemplateStore = create<ProductTemplateState>((set, get) => ({
  currentProductTemplate: null,
  productTemplateList: [],
  isDirty: false,
  isLoading: false,
  error: null,
  isEditorOpen: false,

  openEditor: () => set({ isEditorOpen: true }),
  closeEditor: () => set({ isEditorOpen: false }),

  loadProductTemplateList: async () => {
    set({ isLoading: true, error: null });
    try {
      const productTemplateList = await productTemplateRepository.list();
      set({ productTemplateList, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  newProductTemplate: () => {
    set({
      currentProductTemplate: createEmptyProductTemplate(),
      isDirty: false,
      error: null,
      isEditorOpen: true,
    });
  },

  loadProductTemplate: async (id: string) => {
    set({ isLoading: true, error: null, isEditorOpen: true });
    try {
      const currentProductTemplate = await productTemplateRepository.load(id);
      set({ currentProductTemplate, isDirty: false, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  updateProductTemplate: (patch) => {
    const current = get().currentProductTemplate;
    if (!current) return;

    set({
      currentProductTemplate: {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    });
  },

  saveProductTemplate: async () => {
    const current = get().currentProductTemplate;
    if (!current) return null;

    set({ isLoading: true, error: null });
    try {
      const saved = await productTemplateRepository.save(current);
      const productTemplateList = await productTemplateRepository.list();
      set({
        currentProductTemplate: saved,
        productTemplateList,
        isDirty: false,
        isLoading: false,
        isEditorOpen: true,
      });
      return saved;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      return null;
    }
  },

  deleteProductTemplate: async (id: string) => {
    try {
      await productTemplateRepository.delete(id);
      const current = get().currentProductTemplate;
      set((state) => ({
        productTemplateList: state.productTemplateList.filter((item) => item.id !== id),
        currentProductTemplate: current?.id === id ? null : current,
        isDirty: current?.id === id ? false : state.isDirty,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearError: () => set({ error: null }),
}));

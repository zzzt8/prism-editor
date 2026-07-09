// useKeyboardShortcuts - Hook for composer SDK keyboard shortcuts
// Supports:
// - Ctrl/Cmd + Z: Undo
// - Ctrl/Cmd + Shift + Z: Redo
// - Delete/Backspace: Remove selected layer
// - Arrow keys: Move selected layer (with Shift for larger step)

import { useEffect } from 'react';
import { useComposerStore } from './ComposerState';

export const useKeyboardShortcuts = (): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      // Ctrl/Cmd + Z: Undo (but not in input)
      if (cmdKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const store = useComposerStore.getState();
        if (store.undo) {
          store.undo();
        }
        return;
      }

      // Ctrl/Cmd + Shift + Z: Redo (but not in input)
      if (cmdKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        const store = useComposerStore.getState();
        if (store.redo) {
          store.redo();
        }
        return;
      }

      // Ctrl/Cmd + Y: Redo (alternative, but not in input)
      if (cmdKey && e.key === 'y' && !e.shiftKey) {
        e.preventDefault();
        const store = useComposerStore.getState();
        if (store.redo) {
          store.redo();
        }
        return;
      }

      // Delete: Remove selected layer (only when not in input)
      if (!isInputFocused && (e.key === 'Delete' || e.key === 'Backspace')) {
        const store = useComposerStore.getState();
        if (store.selectedLayerId) {
          e.preventDefault();
          store.removeLayer(store.selectedLayerId);
        }
        return;
      }

      // Arrow Keys: Nudge selected layer position (only when not in input)
      if (
        !isInputFocused &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        const store = useComposerStore.getState();
        if (store.selectedLayerId) {
          e.preventDefault();
          const delta = e.shiftKey ? 10 : 1;
          const layer = store.layers.find((l) => l.id === store.selectedLayerId);
          if (!layer) return;

          const updates: Partial<typeof layer> = {};
          if (e.key === 'ArrowUp') updates.y = layer.y - delta;
          if (e.key === 'ArrowDown') updates.y = layer.y + delta;
          if (e.key === 'ArrowLeft') updates.x = layer.x - delta;
          if (e.key === 'ArrowRight') updates.x = layer.x + delta;

          store.updateLayer(store.selectedLayerId, updates);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};

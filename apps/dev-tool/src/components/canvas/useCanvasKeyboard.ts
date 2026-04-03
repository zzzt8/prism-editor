// useCanvasKeyboard — keyboard shortcuts for canvas operations
// Handles: Delete/Backspace (remove), Escape (clear selection), Ctrl+G (group),
// Ctrl+C/X/V (copy/cut/paste), Ctrl+S (save)

import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export function useCanvasKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Ctrl+S - Save workflow
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        useCanvasStore.getState().saveWorkflow();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedEdgeIds = useCanvasStore.getState().selectedEdgeIds;
        const selectedNodeIds = useCanvasStore.getState().selectedNodeIds;
        if (selectedEdgeIds.length > 0) {
          useCanvasStore.getState().removeSelectedEdges();
          return;
        }
        if (selectedNodeIds.length > 0) {
          useCanvasStore.getState().removeSelectedNodes();
        }
        return;
      }

      if (e.key === 'Escape') {
        useCanvasStore.getState().clearSelection();
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        const selectedNodeIds = useCanvasStore.getState().selectedNodeIds;
        if (selectedNodeIds.length >= 2) {
          useCanvasStore.getState().addGroup(`Group ${Date.now() % 1000}`, selectedNodeIds);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedNodeIds = useCanvasStore.getState().selectedNodeIds;
        if (selectedNodeIds.length > 0) {
          useCanvasStore.getState().copyNodes(selectedNodeIds);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const selectedNodeIds = useCanvasStore.getState().selectedNodeIds;
        if (selectedNodeIds.length > 0) {
          useCanvasStore.getState().cutNodes(selectedNodeIds);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        useCanvasStore.getState().pasteNodes({ x: 400, y: 300 });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

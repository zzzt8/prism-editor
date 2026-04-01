// useCanvasDragDrop — file drop handling for canvas
// Supports: node creation via NodeSearchModal, image replacement via LoadImage/LoadMask nodes
// Also manages isDraggingFromPanel state for canvas drag feedback overlay.

import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { setDragImageState } from '../nodes/PrismNode';
import type { useReactFlow } from '@xyflow/react';

type ReactFlowInstance = ReturnType<typeof useReactFlow>;

export function useCanvasDragDrop(reactFlowInstance: ReactFlowInstance) {
  // Listen for dragstart on node cards to detect panel drags
  useEffect(() => {
    const setDragging = useCanvasStore.getState().setDraggingFromPanel;

    const handleDragStart = (e: DragEvent) => {
      const nodeType = e.dataTransfer?.types.includes('application/prism-node-type');
      if (nodeType) {
        setDragging(true);
      }
    };

    const handleDragEnd = () => {
      setDragging(false);
    };

    // Use a capture phase listener so we get it before the React handler
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('dragend', handleDragEnd, true);

    return () => {
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('dragend', handleDragEnd, true);
    };
  }, []);

  useEffect(() => {
    const handleGlobalDragEnter = (_e: DragEvent) => {
      // No-op — handled on drop
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (files?.length && files[0]?.type.startsWith('image/')) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'copy';
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files?.length || !files[0]?.type.startsWith('image/')) return;
      e.preventDefault();

      const target = (e.target as HTMLElement);
      const nodeElement = target.closest('[data-node-id]');
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute('data-node-id');
        const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
        if (node && (node.data.nodeType === 'load-image' || node.data.nodeType === 'load-mask')) {
          const paramKey = node.data.nodeType === 'load-image' ? 'imageFile' : 'maskFile';
          const file = files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
              useCanvasStore.getState().updateNodeParams(nodeId!, {
                ...node.data.params,
                [paramKey]: { dataUrl, width: img.naturalWidth, height: img.naturalHeight, fileName: file.name },
              });
            };
            img.onerror = () => {
              useCanvasStore.getState().updateNodeParams(nodeId!, {
                ...node.data.params,
                [paramKey]: { dataUrl, width: 0, height: 0, fileName: file.name },
              });
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          return;
        }
      }
      setDragImageState(null);
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!relatedTarget || !document.body.contains(relatedTarget)) {
        setDragImageState(null);
      }
    };

    document.addEventListener('dragenter', handleGlobalDragEnter);
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragleave', handleGlobalDragLeave);

    return () => {
      document.removeEventListener('dragenter', handleGlobalDragEnter);
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const dragState = getDragImageStateFromWindow();
    e.dataTransfer.dropEffect = dragState ? 'copy' : 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragState = getDragImageStateFromWindow();
    const files = e.dataTransfer?.files;
    const isImageFile = files?.length && files[0]?.type.startsWith('image/');

    if (dragState && isImageFile) {
      setDragImageState(null);
      const store = useCanvasStore.getState();
      const node = store.nodes.find((n) => n.id === dragState.nodeId);
      if (node) {
        const file = files![0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const img = new Image();
          img.onload = () => {
            store.updateNodeParams(dragState.nodeId, {
              ...node.data.params,
              [dragState.paramKey]: { dataUrl, width: img.naturalWidth, height: img.naturalHeight, fileName: file.name },
            });
          };
          img.onerror = () => {
            store.updateNodeParams(dragState.nodeId, {
              ...node.data.params,
              [dragState.paramKey]: { dataUrl, width: 0, height: 0, fileName: file.name },
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
      return;
    }

    const nodeType = e.dataTransfer.getData('application/prism-node-type');
    if (!nodeType) return;

    const screenPos = { x: e.clientX, y: e.clientY };
    const flowPos = reactFlowInstance.screenToFlowPosition(screenPos);
    const finalPos = { x: flowPos.x - 80, y: flowPos.y - 20 };
    useCanvasStore.getState().addNode(nodeType, finalPos);
  };

  return { handleDragOver, handleDrop };
}

function getDragImageStateFromWindow() {
  return (window as unknown as Record<string, unknown>)['__prism_drag_image'] as { paramKey: 'imageFile' | 'maskFile'; nodeId: string } | null;
}

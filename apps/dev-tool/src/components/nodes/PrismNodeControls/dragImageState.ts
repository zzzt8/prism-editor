// Drag state for image file sharing between canvas and node components

const DRAG_DATA_KEY = '__prism_drag_image';

export interface DragState {
  paramKey: 'imageFile' | 'maskFile';
  nodeId: string;
}

export function setDragImageState(state: DragState | null) {
  (window as unknown as Record<string, unknown>)[DRAG_DATA_KEY] = state;
}

export function getDragImageState(): DragState | null {
  return (window as unknown as Record<string, unknown>)[DRAG_DATA_KEY] as DragState | null;
}
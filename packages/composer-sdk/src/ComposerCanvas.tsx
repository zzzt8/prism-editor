// ComposerCanvas - PS-style drag-and-drop canvas with real-time compositing
// Uses image-ops browser executor for cross-platform pixel-level consistency

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { useComposerStore } from './ComposerState';
import type {
  ComposerSDKProps,
  LayerState,
} from './types';
import { compositeExecutor } from '@prism/image-ops/browser';
import type { BlendMode } from './types';

/**
 * Helper: Convert HTMLImageElement to ImageData
 */
async function imageToImageData(img: HTMLImageElement): Promise<ImageData> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * ComposerCanvas - Main component for PS-style canvas interaction
 *
 * Uses image-ops browser executor for cross-platform pixel-level consistency
 * with the nodejs sharp executor.
 *
 * Features:
 * - Layer drag-and-drop (position, scale, rotation)
 * - Layer selection with visual indicator
 * - Real-time Canvas compositing via image-ops
 * - Keyboard shortcuts (Delete to remove selected layer)
 */
export const ComposerCanvas: React.FC<ComposerSDKProps> = ({
  template,
  initialState,
  onChange,
  onSubmit,
  width = 800,
  height = 600,
  backgroundColor = '#ffffff',
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, layerX: 0, layerY: 0 });

  // State for loaded images
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // Store
  const {
    layers,
    selectedLayerId,
    designParams,
    inputs,
    selectLayer,
    updateLayer,
    setLayers,
    setDesignParams,
    setInputs,
  } = useComposerStore();

  // Initialize from template
  useEffect(() => {
    if (!template) return;

    try {
      const templateData = typeof template.content === 'string'
        ? JSON.parse(template.content)
        : template.content;

      if (templateData.layers) {
        setLayers(templateData.layers);
      }

      // Initialize designParams defaults
      if (templateData.designParams) {
        const defaults: Record<string, number | string> = {};
        templateData.designParams.forEach((param: { id: string; defaultValue?: number | string; min?: number }) => {
          defaults[param.id] = param.defaultValue ?? param.min ?? 0;
        });
        setDesignParams(defaults);
      }

      // Initialize inputs defaults
      if (templateData.inputs) {
        const defaults: Record<string, string> = {};
        templateData.inputs.forEach((input: { id: string; defaultValue?: string | number }) => {
          defaults[input.id] = input.defaultValue?.toString() ?? '';
        });
        setInputs(defaults);
      }
    } catch (e) {
      console.warn('Failed to parse template content:', e);
    }
  }, [template, setLayers, setDesignParams, setInputs]);

  // Apply initial state if provided
  useEffect(() => {
    if (initialState) {
      if (initialState.layers) setLayers(initialState.layers);
      if (initialState.designParams) setDesignParams(initialState.designParams);
      if (initialState.inputs) setInputs(initialState.inputs);
    }
  }, []);

  // Load images for layers
  useEffect(() => {
    if (layers.length === 0) {
      setLoadedImages({});
      return;
    }

    const newImages: Record<string, HTMLImageElement> = {};
    let loaded = 0;
    const total = layers.length;

    layers.forEach((layer) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        newImages[layer.id] = img;
        loaded++;
        if (loaded === total) {
          setLoadedImages(newImages);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === total) {
          setLoadedImages(newImages);
        }
      };
      img.src = layer.imageUrl;
    });
  }, [layers]);

  // Render composite using image-ops browser executor
  const renderComposite = useCallback(async () => {
    const canvas = compositeCanvasRef.current;
    if (!canvas || layers.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    try {
      // Sort layers: first layer becomes base, rest become overlays
      const sortedLayers = [...layers].reverse(); // top layer first for rendering
      if (sortedLayers.length === 0) return;

      // Convert first layer to ImageData as base
      const baseImg = loadedImages[sortedLayers[0].id];
      if (!baseImg) return;

      const baseImageData = await imageToImageData(baseImg);

      // If only one layer, draw it directly
      if (sortedLayers.length === 1) {
        ctx.drawImage(baseImg, sortedLayers[0].x, sortedLayers[0].y,
          baseImg.width * sortedLayers[0].scale, baseImg.height * sortedLayers[0].scale);
        return;
      }

      // Build inputs for composite executor
      const executorInputs: Record<string, unknown> = {
        base: baseImageData,
      };

      // Add overlays
      const overlayLayers = sortedLayers.slice(1);
      overlayLayers.forEach((layer, index) => {
        const overlayImg = loadedImages[layer.id];
        if (overlayImg) {
          const overlayKey = index === 0 ? 'overlay' : `overlay${index}`;
          executorInputs[overlayKey] = { data: baseImageData }; // placeholder - will be updated
        }
      });

      // For now, composite overlays sequentially using image-ops
      // Note: Full image-ops integration requires transforming layer positions to overlayX/Y
      let currentResult = baseImageData;

      for (let i = 1; i < sortedLayers.length; i++) {
        const layer = sortedLayers[i];
        const overlayImg = loadedImages[layer.id];
        if (!overlayImg) continue;

        const overlayImageData = await imageToImageData(overlayImg);

        // Calculate overlay position relative to canvas
        const overlayX = Math.round(layer.x);
        const overlayY = Math.round(layer.y);

        try {
          const execResult = await compositeExecutor(
            { base: currentResult, overlay: overlayImageData },
            {
              blendMode: layer.blendMode as BlendMode,
              opacity: layer.opacity,
              canvasWidth: width,
              canvasHeight: height,
              overlayX,
              overlayY,
            },
            {} as any
          ) as { width: number; height: number; image: { data: ImageData } };

          // Draw result to canvas
          const resultCanvas = document.createElement('canvas');
          resultCanvas.width = execResult.width;
          resultCanvas.height = execResult.height;
          const resultCtx = resultCanvas.getContext('2d');
          if (resultCtx) {
            resultCtx.putImageData(execResult.image.data, 0, 0);
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(resultCanvas, 0, 0);
            currentResult = execResult.image.data;
          }
        } catch (e) {
          // Fallback: draw without image-ops if executor fails
          ctx.save();
          ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation || 'source-over';
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(overlayImg, layer.x, layer.y,
            overlayImg.width * layer.scale, overlayImg.height * layer.scale);
          ctx.restore();
        }
      }
    } catch (e) {
      console.error('Composite rendering failed:', e);
      // Fallback: simple composite without image-ops
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }
  }, [layers, loadedImages, width, height, backgroundColor]);

  // Re-render on state change (debounced for performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      renderComposite();
    }, 50);
    return () => clearTimeout(timer);
  }, [renderComposite]);

  // Trigger onChange callback (debounced)
  useEffect(() => {
    if (!onChange) return;

    const timer = setTimeout(() => {
      onChange({
        layers,
        selectedLayerId,
        designParams,
        inputs,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [layers, selectedLayerId, designParams, inputs, onChange]);

  // Mouse handlers for dragging (CSS transform for visual feedback)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, layer: LayerState) => {
      e.stopPropagation();
      selectLayer(layer.id);
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        layerX: layer.x,
        layerY: layer.y,
      };
    },
    [selectLayer]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || !selectedLayerId) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      updateLayer(selectedLayerId, {
        x: dragStartRef.current.layerX + dx,
        y: dragStartRef.current.layerY + dy,
      });
    },
    [selectedLayerId, updateLayer]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Click on canvas to deselect
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current || e.target === compositeCanvasRef.current) {
        selectLayer(null);
      }
    },
    [selectLayer]
  );

  // Keyboard handler for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerId && document.activeElement?.tagName !== 'INPUT') {
          useComposerStore.getState().removeLayer(selectedLayerId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId]);

  // Submit handler
  const handleSubmit = useCallback(() => {
    if (!onSubmit) return;

    onSubmit({
      templateId: template.id,
      inputs,
      layers,
      designParams,
    });
  }, [template, inputs, layers, designParams, onSubmit]);

  // Memoized styles
  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      width,
      height,
      backgroundColor,
      overflow: 'hidden',
      cursor: 'default',
      userSelect: 'none',
    }),
    [width, height, backgroundColor]
  );

  const compositeCanvasStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      top: 0,
      left: 0,
      width,
      height,
      pointerEvents: 'none',
    }),
    [width, height]
  );

  const layersContainerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      top: 0,
      left: 0,
      width,
      height,
    }),
    [width, height]
  );

  const getLayerStyle = (layer: LayerState, img: HTMLImageElement | undefined): React.CSSProperties => ({
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: img ? img.width * layer.scale : 100,
    height: img ? img.height * layer.scale : 100,
    transform: `rotate(${layer.rotation}deg)`,
    transformOrigin: 'center center',
    cursor: 'move',
    opacity: layer.opacity,
    outline: selectedLayerId === layer.id ? '2px solid #3b82f6' : 'none',
    outlineOffset: '2px',
  });

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Composite canvas (rendered result via image-ops) */}
      <canvas
        ref={compositeCanvasRef}
        width={width}
        height={height}
        style={compositeCanvasStyle}
      />

      {/* Interactive layer container (for visual selection feedback) */}
      <div style={layersContainerStyle}>
        {layers.map((layer) => {
          const img = loadedImages[layer.id];
          return (
            <div
              key={layer.id}
              style={getLayerStyle(layer, img)}
              onMouseDown={(e) => handleMouseDown(e, layer)}
            >
              {img && (
                <img
                  src={layer.imageUrl}
                  alt={layer.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {onSubmit && (
        <button
          onClick={handleSubmit}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          确认提交
        </button>
      )}
    </div>
  );
};

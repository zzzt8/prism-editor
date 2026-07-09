// ComposerCanvas - PS-style drag-and-drop canvas with real-time compositing
// Provides layer drag, selection, and real-time Canvas compositing

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
  BlendMode,
} from './types';

/**
 * Canvas blend mode mapping from SDK types to Canvas API
 */
const BLEND_MODE_MAP: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  'soft-light': 'soft-light',
};

/**
 * ComposerCanvas - Main component for PS-style canvas interaction
 *
 * Features:
 * - Layer drag-and-drop (position, scale, rotation)
 * - Layer selection with visual indicator
 * - Real-time Canvas compositing with blend modes
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

  // Render composite to canvas
  const renderComposite = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Composite layers from bottom to top
    layers.forEach((layer) => {
      const img = loadedImages[layer.id];
      if (!img) return;

      ctx.save();

      // Set blend mode
      ctx.globalCompositeOperation = BLEND_MODE_MAP[layer.blendMode] || 'source-over';
      ctx.globalAlpha = layer.opacity;

      // Calculate center point for transforms
      const centerX = layer.x + (img.width * layer.scale) / 2;
      const centerY = layer.y + (img.height * layer.scale) / 2;

      // Apply transforms
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scale, layer.scale);
      ctx.translate(-img.width / 2, -img.height / 2);

      // Draw image
      ctx.drawImage(img, 0, 0);

      ctx.restore();
    });
  }, [layers, loadedImages, width, height, backgroundColor]);

  // Re-render on state change
  useEffect(() => {
    renderComposite();
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

  // Mouse handlers for dragging
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
      {/* Composite canvas (rendered result) */}
      <canvas
        ref={compositeCanvasRef}
        width={width}
        height={height}
        style={compositeCanvasStyle}
      />

      {/* Interactive layer container */}
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

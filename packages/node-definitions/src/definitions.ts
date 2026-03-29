/**
 * @fileoverview Built-in node definitions
 *
 * PORT NAMING CONVENTION (see: openspec/changes/node-editor-comfyui-refactor/design.md)
 * ──────────────────────────────────────────────────────────────────────────────
 * This project follows a four-layer naming rule for port identifiers:
 *
 * Layer 1 - Port ID (programmatic identifier):
 *   - kebab-case (e.g., 'base', 'overlay', 'mask')
 *   - Used in code: ctx.requireInput('mask'), inputs['mask']
 *   - Must match exactly between NodeDefinition and Executor
 *
 * Layer 2 - Port Name (display label):
 *   - Title Case (e.g., 'Base', 'Overlay', 'Mask')
 *   - Shown in the UI on node headers and tooltips
 *
 * Layer 3 - Handle ID (React Flow connection point):
 *   - Must match port.id exactly (Layer 1)
 *   - Used for sourceHandle/targetHandle on edges
 *
 * Layer 4 - Parameter ID (user-configurable settings):
 *   - kebab-case (e.g., 'blend-mode', 'opacity')
 *   - Referenced via params['blend-mode']
 *
 * The critical rule is: Port ID (Layer 1) is the single source of truth.
 * All code must use port.id, never port.name, when accessing inputs/outputs.
 *
 * R1 Compliance: Any code that uses port.name to access input/output data
 * must be fixed to use port.id instead. This ensures compatibility with
 * future nodes where id !== name.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { NodeDefinition } from '@prism/shared-types';
import { NODE_CATEGORIES, PortDataType } from '@prism/shared-types';

export const loadImageDefinition: NodeDefinition = {
  type: 'load-image',
  category: NODE_CATEGORIES.INPUT,
  label: 'Load Image',
  description: 'Load an image from a local file (like ComfyUI Load Image)',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Loaded image data',
    },
  ],
  params: [
    {
      id: 'imageFile',
      name: 'Image File',
      type: 'image-file',
      description: 'Choose an image file from your computer',
    },
  ],
};

export const loadMaskDefinition: NodeDefinition = {
  type: 'load-mask',
  category: NODE_CATEGORIES.INPUT,
  label: 'Load Mask',
  description: 'Load a mask image from a local file',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'mask',
      name: 'Mask',
      type: 'mask',
      dataType: PortDataType.MASK,
      required: true,
      description: 'Loaded mask data',
    },
  ],
  params: [
    {
      id: 'maskFile',
      name: 'Mask File',
      type: 'image-file',
      description: 'Choose a mask file from your computer',
    },
  ],
};

export const applyMaskDefinition: NodeDefinition = {
  type: 'apply-mask',
  category: NODE_CATEGORIES.MASK,
  label: 'Apply Mask',
  description: 'Apply a mask to an image (alpha, brightness, or luminance)',
  version: '1.0.0',
  inputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Base image to mask',
    },
    {
      id: 'mask',
      name: 'Mask',
      type: 'mask',
      dataType: PortDataType.MASK,
      required: true,
      description: 'Mask source (image or generated)',
    },
  ],
  outputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Masked image',
    },
  ],
  params: [
    {
      id: 'maskType',
      name: 'Mask Type',
      type: 'select',
      default: 'alpha',
      options: [
        { label: 'Alpha Channel', value: 'alpha' },
        { label: 'Brightness', value: 'brightness' },
        { label: 'Luminance', value: 'luminance' },
      ],
    },
    {
      id: 'threshold',
      name: 'Threshold',
      type: 'number',
      default: 128,
      min: 0,
      max: 255,
      step: 1,
      description: 'Mask threshold (0-255)',
    },
    {
      id: 'invert',
      name: 'Invert Mask',
      type: 'boolean',
      default: false,
      description: 'Invert the mask before applying',
    },
  ],
};

export const compositeDefinition: NodeDefinition = {
  type: 'composite',
  category: NODE_CATEGORIES.COMPOSITE,
  label: 'Composite',
  description: 'Composite two images with blend modes',
  version: '1.0.0',
  inputs: [
    {
      id: 'base',
      name: 'Base',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Base layer',
    },
    {
      id: 'overlay',
      name: 'Overlay',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Layer to composite on top',
    },
  ],
  outputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Composited image',
    },
  ],
  params: [
    {
      id: 'blendMode',
      name: 'Blend Mode',
      type: 'select',
      default: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Multiply', value: 'multiply' },
        { label: 'Screen', value: 'screen' },
        { label: 'Overlay', value: 'overlay' },
        { label: 'Darken', value: 'darken' },
        { label: 'Lighten', value: 'lighten' },
        { label: 'Color Dodge', value: 'color-dodge' },
        { label: 'Color Burn', value: 'color-burn' },
        { label: 'Hard Light', value: 'hard-light' },
        { label: 'Soft Light', value: 'soft-light' },
        { label: 'Difference', value: 'difference' },
        { label: 'Exclusion', value: 'exclusion' },
      ],
    },
    {
      id: 'opacity',
      name: 'Opacity',
      type: 'number',
      default: 1.0,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'Overlay opacity (0-1)',
    },
  ],
};

export const transformDefinition: NodeDefinition = {
  type: 'transform',
  category: NODE_CATEGORIES.TRANSFORM,
  label: 'Transform',
  description: 'Transform image (translate, scale, rotate, crop)',
  version: '1.0.0',
  inputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Image to transform',
    },
  ],
  outputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Transformed image',
    },
  ],
  params: [
    {
      id: 'translateX',
      name: 'Translate X',
      type: 'number',
      default: 0,
      description: 'Horizontal offset in pixels',
    },
    {
      id: 'translateY',
      name: 'Translate Y',
      type: 'number',
      default: 0,
      description: 'Vertical offset in pixels',
    },
    {
      id: 'scaleX',
      name: 'Scale X',
      type: 'number',
      default: 1,
      min: 0.01,
      max: 10,
      step: 0.01,
      description: 'Horizontal scale factor',
    },
    {
      id: 'scaleY',
      name: 'Scale Y',
      type: 'number',
      default: 1,
      min: 0.01,
      max: 10,
      step: 0.01,
      description: 'Vertical scale factor',
    },
    {
      id: 'rotation',
      name: 'Rotation',
      type: 'number',
      default: 0,
      min: -360,
      max: 360,
      step: 1,
      description: 'Rotation in degrees',
    },
    {
      id: 'cropX',
      name: 'Crop X',
      type: 'number',
      default: 0,
      min: 0,
      description: 'Crop origin X',
    },
    {
      id: 'cropY',
      name: 'Crop Y',
      type: 'number',
      default: 0,
      min: 0,
      description: 'Crop origin Y',
    },
    {
      id: 'cropWidth',
      name: 'Crop Width',
      type: 'number',
      description: 'Crop region width (0 = full width)',
    },
    {
      id: 'cropHeight',
      name: 'Crop Height',
      type: 'number',
      description: 'Crop region height (0 = full height)',
    },
  ],
};

export const exportDefinition: NodeDefinition = {
  type: 'export',
  category: NODE_CATEGORIES.OUTPUT,
  label: 'Export',
  description: 'Export and preview image output',
  version: '1.0.0',
  inputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      dataType: PortDataType.IMAGE,
      required: true,
      description: 'Image to export',
    },
  ],
  outputs: [],
  params: [],
};

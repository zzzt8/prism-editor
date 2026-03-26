// Built-in node definitions

import type { NodeDefinition } from '@prism/shared-types';
import { NODE_CATEGORIES } from '@prism/shared-types';

export const loadImageDefinition: NodeDefinition = {
  type: 'load-image',
  category: NODE_CATEGORIES.INPUT,
  label: 'Load Image',
  description: 'Load an image from URL or file input',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      required: true,
      description: 'Loaded image data',
    },
  ],
  params: [
    {
      id: 'url',
      name: 'Image URL',
      type: 'string',
      required: true,
      description: 'URL of the image to load',
    },
    {
      id: 'crossOrigin',
      name: 'Cross Origin',
      type: 'select',
      default: 'anonymous',
      description: 'Cross-origin policy',
      options: [
        { label: 'Anonymous', value: 'anonymous' },
        { label: 'Use Credentials', value: 'use-credentials' },
        { label: 'None (may taint canvas)', value: 'none' },
      ],
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
      required: true,
      description: 'Base image to mask',
    },
    {
      id: 'mask',
      name: 'Mask',
      type: 'mask',
      required: true,
      description: 'Mask source (image or generated)',
    },
  ],
  outputs: [
    {
      id: 'result',
      name: 'Masked Image',
      type: 'image',
      required: true,
      description: 'Image with mask applied',
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
      required: true,
      description: 'Base layer',
    },
    {
      id: 'overlay',
      name: 'Overlay',
      type: 'image',
      required: true,
      description: 'Layer to composite on top',
    },
  ],
  outputs: [
    {
      id: 'result',
      name: 'Composite',
      type: 'image',
      required: true,
      description: 'Composited result',
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
      required: true,
      description: 'Image to transform',
    },
  ],
  outputs: [
    {
      id: 'result',
      name: 'Transformed',
      type: 'image',
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
  description: 'Export image to PNG, JPEG, or WebP format',
  version: '1.0.0',
  inputs: [
    {
      id: 'image',
      name: 'Image',
      type: 'image',
      required: true,
      description: 'Image to export',
    },
  ],
  outputs: [
    {
      id: 'result',
      name: 'Exported',
      type: 'image',
      required: true,
      description: 'Exported image result',
    },
  ],
  params: [
    {
      id: 'format',
      name: 'Format',
      type: 'select',
      default: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'JPEG', value: 'jpeg' },
        { label: 'WebP', value: 'webp' },
      ],
    },
    {
      id: 'quality',
      name: 'Quality',
      type: 'number',
      default: 0.92,
      min: 0.1,
      max: 1,
      step: 0.01,
      description: 'Output quality (0.1-1.0)',
    },
    {
      id: 'width',
      name: 'Output Width',
      type: 'number',
      description: 'Resize to this width (0 = keep original)',
    },
    {
      id: 'height',
      name: 'Output Height',
      type: 'number',
      description: 'Resize to this height (0 = keep original)',
    },
  ],
};

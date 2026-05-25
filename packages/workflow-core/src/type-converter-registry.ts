// Type Converter Registry
//
// Manages type converters that transform PipelineData from one type to another.
// Built-in converters (IMAGE→MASK, MASK→IMAGE, FILE→IMAGE) are registered on init.
// Third-party plugins can register additional converters via `register()`.

import {
  PortDataType,
  type PipelineData,
  type TypeConverterFn,
  type ImageData,
  toPipeline,
} from '@prism/shared-types';

export class TypeConverterRegistry {
  private converters = new Map<string, TypeConverterFn<unknown, unknown>>();

  /**
   * Register a type converter. If a converter for the same pair already exists,
   * the new one replaces it. Plugins can override built-in converters.
   */
  register<TFrom, TTo>(converter: TypeConverterFn<TFrom, TTo>): void {
    const key = this.makeKey(converter.from, converter.to);
    // Always allow re-registration (overwrites previous converter for this pair)
    this.converters.set(key, converter as TypeConverterFn<unknown, unknown>);
  }

  /**
   * Check whether a conversion is registered for the given type pair.
   */
  canConvert(from: PortDataType, to: PortDataType): boolean {
    if (from === to) return true; // identity conversion
    const key = this.makeKey(from, to);
    return this.converters.has(key);
  }

  /**
   * Convert data from one type to another.
   * Returns a Promise only if the converter is async, otherwise returns synchronously.
   * Returns null if no converter is registered for this type pair.
   */
  convert<TFrom, TTo>(
    data: PipelineData<TFrom>,
    to: PortDataType
  ): PipelineData<TTo> | Promise<PipelineData<TTo> | null> | null {
    if (data.type === to) return data as unknown as PipelineData<TTo>;

    const key = this.makeKey(data.type, to);
    const converter = this.converters.get(key);
    if (!converter) return null;

    const result = (converter as TypeConverterFn<TFrom, TTo>).convert(data);
    // If the converter returns a Promise, return it as-is
    // Otherwise wrap in Promise.resolve for consistent async handling
    return result instanceof Promise ? result : Promise.resolve(result);
  }

  /**
   * Get the registered converter for a type pair, or null if none.
   */
  getConverter(
    from: PortDataType,
    to: PortDataType
  ): TypeConverterFn<unknown, unknown> | null {
    if (from === to) return null;
    const key = this.makeKey(from, to);
    return this.converters.get(key) ?? null;
  }

  /**
   * List all registered converter keys (for debugging/introspection).
   */
  listConverters(): Array<{ from: PortDataType; to: PortDataType }> {
    return [...this.converters.keys()].map((key) => {
      const [from, to] = key.split('→') as [PortDataType, PortDataType];
      return { from, to };
    });
  }

  private makeKey(from: PortDataType, to: PortDataType): string {
    return `${from}→${to}`;
  }
}

/** Singleton instance shared across the application */
export const typeConverterRegistry = new TypeConverterRegistry();

// ─── Built-in Converters ───────────────────────────────────────────────────────

/**
 * IMAGE → MASK: extracts the alpha channel and produces a single-channel mask.
 * Pixels with alpha > 127 become white (255), others become black (0).
 */
function extractAlphaChannel(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const maskData = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const alpha = data[i * 4 + 3];
    maskData[i] = alpha > 127 ? 255 : 0;
  }
  return new ImageData(maskData, width, height);
}

const imageToMaskConverter: TypeConverterFn<ImageData, ImageData> = {
  from: PortDataType.IMAGE,
  to: PortDataType.MASK,
  convert(pipelineData) {
    const imageData = pipelineData.data as ImageData;
    const maskImageData = extractAlphaChannel(imageData);
    return toPipeline(maskImageData, PortDataType.MASK, {
      width: imageData.width,
      height: imageData.height,
      channels: 1,
      sourceNodeId: pipelineData.metadata.sourceNodeId,
    });
  },
};

/**
 * MASK → IMAGE: converts a single-channel grayscale mask to RGBA.
 * White pixels (255) become white RGBA, black (0) become transparent.
 */
function grayscaleToRgba(maskData: ImageData): ImageData {
  const { width, height, data } = maskData;
  const rgbaData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = data[i];
    rgbaData[i * 4 + 0] = v;     // R
    rgbaData[i * 4 + 1] = v;     // G
    rgbaData[i * 4 + 2] = v;     // B
    rgbaData[i * 4 + 3] = v;     // A
  }
  return new ImageData(rgbaData, width, height);
}

const maskToImageConverter: TypeConverterFn<ImageData, ImageData> = {
  from: PortDataType.MASK,
  to: PortDataType.IMAGE,
  convert(pipelineData) {
    const maskImageData = pipelineData.data as ImageData;
    const rgbaImageData = grayscaleToRgba(maskImageData);
    return toPipeline(rgbaImageData, PortDataType.IMAGE, {
      width: maskImageData.width,
      height: maskImageData.height,
      channels: 4,
      sourceNodeId: pipelineData.metadata.sourceNodeId,
    });
  },
};

/**
 * FILE → IMAGE: loads a File/Blob as ImageData using an off-screen canvas.
 */
async function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d context for image loading'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`Failed to load image from file: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

const fileToImageConverter: TypeConverterFn<File, ImageData> = {
  from: PortDataType.FILE,
  to: PortDataType.IMAGE,
  async convert(pipelineData) {
    const imageData = await loadImageFromFile(pipelineData.data);
    return toPipeline(imageData, PortDataType.IMAGE, {
      mimeType: pipelineData.data.type || 'image/png',
      sourceNodeId: pipelineData.metadata.sourceNodeId,
    });
  },
};

// Register built-in converters
typeConverterRegistry.register(imageToMaskConverter);
typeConverterRegistry.register(maskToImageConverter);
typeConverterRegistry.register(fileToImageConverter);

import { describe, it, expect, beforeEach } from 'vitest';
import { PortDataType, type PipelineData } from '@prism/shared-types';
import { TypeConverterRegistry, type TypeConverterFn } from '@prism/workflow-core';

// Helper: creates a minimal PipelineData object
const makePipeline = <T>(data: T, type: PortDataType) =>
  Object.freeze({ type, data, metadata: Object.freeze({}) });

describe('TypeConverterRegistry', () => {
  let registry: TypeConverterRegistry;

  beforeEach(() => {
    registry = new TypeConverterRegistry();
  });

  describe('register() and canConvert()', () => {
    it('registers a converter and canConvert returns true for the registered pair', () => {
      const converter: TypeConverterFn<string, number> = {
        from: PortDataType.STRING,
        to: PortDataType.NUMBER,
        convert: (p: PipelineData<string>) => makePipeline(Number(p.data), PortDataType.NUMBER),
      };
      registry.register(converter);
      expect(registry.canConvert(PortDataType.STRING, PortDataType.NUMBER)).toBe(true);
    });

    it('canConvert returns false for unregistered pair', () => {
      expect(registry.canConvert(PortDataType.STRING, PortDataType.BOOLEAN)).toBe(false);
    });

    it('replaces an existing converter for the same pair', () => {
      const v1: TypeConverterFn<string, number> = {
        from: PortDataType.STRING,
        to: PortDataType.NUMBER,
        convert: (p: PipelineData<string>) => makePipeline(Number(p.data), PortDataType.NUMBER),
      };
      const v2: TypeConverterFn<string, number> = {
        from: PortDataType.STRING,
        to: PortDataType.NUMBER,
        convert: (p: PipelineData<string>) => makePipeline(parseInt(String(p.data), 10), PortDataType.NUMBER),
      };
      registry.register(v1);
      registry.register(v2);
      // Both succeed — the second one just replaces the first
      expect(registry.canConvert(PortDataType.STRING, PortDataType.NUMBER)).toBe(true);
    });

    it('allows both directions of a type pair (no auto-cycle detection)', () => {
      // IMAGE→MASK and MASK→IMAGE can coexist
      registry.register({
        from: PortDataType.IMAGE,
        to: PortDataType.MASK,
        convert: (p: PipelineData<ImageData>) => makePipeline(p.data, PortDataType.MASK),
      });
      registry.register({
        from: PortDataType.MASK,
        to: PortDataType.IMAGE,
        convert: (p: PipelineData<ImageData>) => makePipeline(p.data, PortDataType.IMAGE),
      });
      expect(registry.canConvert(PortDataType.IMAGE, PortDataType.MASK)).toBe(true);
      expect(registry.canConvert(PortDataType.MASK, PortDataType.IMAGE)).toBe(true);
    });
  });

  describe('convert()', () => {
    it('returns null when no converter is registered', () => {
      const result = registry.convert(makePipeline('hello', PortDataType.STRING), PortDataType.NUMBER);
      expect(result).toBeNull();
    });

    it('converts data using the registered converter', async () => {
      const converter: TypeConverterFn<string, number> = {
        from: PortDataType.STRING,
        to: PortDataType.NUMBER,
        convert: (p: PipelineData<string>) => makePipeline(Number(p.data), PortDataType.NUMBER),
      };
      registry.register(converter);
      const input = makePipeline('42', PortDataType.STRING);
      const result = await registry.convert(input, PortDataType.NUMBER);
      expect(result).not.toBeNull();
      expect((result as ReturnType<typeof makePipeline<number>>).data).toBe(42);
      expect((result as ReturnType<typeof makePipeline<number>>).type).toBe(PortDataType.NUMBER);
    });

    it('returns the input unchanged when source type equals target type', async () => {
      const input = makePipeline('hello', PortDataType.STRING);
      const result = await registry.convert(input, PortDataType.STRING);
      expect(result).toBe(input);
    });

    it('handles async converters', async () => {
      const asyncConverter: TypeConverterFn<number, string> = {
        from: PortDataType.NUMBER,
        to: PortDataType.STRING,
        async convert(p: PipelineData<number>) {
          return makePipeline(String(p.data), PortDataType.STRING);
        },
      };
      registry.register(asyncConverter);
      const input = makePipeline(123, PortDataType.NUMBER);
      const result = await registry.convert(input, PortDataType.STRING);
      expect(result).not.toBeNull();
      expect((result as ReturnType<typeof makePipeline<string>>).data).toBe('123');
    });

    it('getConverter returns the registered converter', () => {
      const converter: TypeConverterFn<string, number> = {
        from: PortDataType.STRING,
        to: PortDataType.NUMBER,
        convert: (p: PipelineData<string>) => makePipeline(Number(p.data), PortDataType.NUMBER),
      };
      registry.register(converter);
      const found = registry.getConverter(PortDataType.STRING, PortDataType.NUMBER);
      expect(found).not.toBeNull();
    });

    it('getConverter returns null for identity conversion', () => {
      expect(registry.getConverter(PortDataType.STRING, PortDataType.STRING)).toBeNull();
    });

    it('getConverter returns null for unregistered pair', () => {
      expect(registry.getConverter(PortDataType.STRING, PortDataType.NUMBER)).toBeNull();
    });

    it('listConverters returns all registered converters', () => {
      registry.register({
        from: PortDataType.STRING,
        to: PortDataType.NUMBER,
        convert: (p: PipelineData<string>) => makePipeline(Number(p.data), PortDataType.NUMBER),
      });
      registry.register({
        from: PortDataType.NUMBER,
        to: PortDataType.STRING,
        convert: (p) => makePipeline(String(p.data), PortDataType.STRING),
      });
      const list = registry.listConverters();
      expect(list).toHaveLength(2);
      expect(list).toContainEqual({ from: PortDataType.STRING, to: PortDataType.NUMBER });
      expect(list).toContainEqual({ from: PortDataType.NUMBER, to: PortDataType.STRING });
    });
  });

  describe('built-in converters (pre-registered on module load)', () => {
    // Import the singleton that has built-ins already registered
    it('has IMAGE→MASK converter registered', async () => {
      const { typeConverterRegistry } = await import('@prism/workflow-core');
      expect(typeConverterRegistry.canConvert(PortDataType.IMAGE, PortDataType.MASK)).toBe(true);
    });

    it('has MASK→IMAGE converter registered', async () => {
      const { typeConverterRegistry } = await import('@prism/workflow-core');
      expect(typeConverterRegistry.canConvert(PortDataType.MASK, PortDataType.IMAGE)).toBe(true);
    });

    it('has FILE→IMAGE converter registered', async () => {
      const { typeConverterRegistry } = await import('@prism/workflow-core');
      expect(typeConverterRegistry.canConvert(PortDataType.FILE, PortDataType.IMAGE)).toBe(true);
    });

    it('converts IMAGE→MASK and preserves dimensions', async () => {
      const { typeConverterRegistry } = await import('@prism/workflow-core');
      // Create a minimal ImageData mock
      const mockImageData = {
        width: 100,
        height: 100,
        data: new Uint8ClampedArray(100 * 100 * 4),
        colorSpace: 'srgb' as const,
      };
      const input = Object.freeze({
        type: PortDataType.IMAGE,
        data: mockImageData as unknown as globalThis.ImageData,
        metadata: Object.freeze({}),
      });
      const result = await typeConverterRegistry.convert(input, PortDataType.MASK);
      expect(result).not.toBeNull();
      expect((result as { type: PortDataType }).type).toBe(PortDataType.MASK);
    });
  });
});

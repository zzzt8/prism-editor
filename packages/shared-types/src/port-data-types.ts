// Port Data Types - Core type system for pipeline ports
//
// Defines PortDataType enum, PipelineData wrapper, type compatibility matrix,
// and type conversion utilities used across all packages.
//
// ─── PortType vs PortDataType ─────────────────────────────────────────────
//
// `PortDataType` is the canonical type definition (defined in this file as an enum).
// `PortType` (defined in ./port-types.ts) is a string-alias convenience type that
// maps 1:1 to PortDataType values for brevity in inline contexts.
//
// Decision: keep both — PortDataType is the authoritative form used in all interface
// signatures; PortType exists as a shorthand alias for convenience in typed literals.
// Both share the same underlying string values (e.g. 'image', 'mask').
// When in doubt, use PortDataType.
//
// ─── Relationship to execution.ts CacheEntry ─────────────────────────────
//
// `CacheEntry` (defined in execution.ts) stores execution results by inputs hash.
// The `accessCount` field is a monotonically increasing LRU counter used by
// workflow-core's cache eviction — it is NOT part of the shared contract and
// should NOT be referenced outside of packages/workflow-core/src/cache.ts.

// ─── PortDataType Enum ────────────────────────────────────────────────────────

/**
 * Standard data types for pipeline port connections.
 * Used by PortDefinition to declare the type of data flowing through a port.
 */
export enum PortDataType {
  /** ImageData — standard RGBA pixel data */
  IMAGE = 'image',
  /** ImageData (single-channel) — mask / alpha / grayscale data */
  MASK = 'mask',
  /** HTMLVideoElement or video frame data */
  VIDEO = 'video',
  /** Audio buffer data */
  AUDIO = 'audio',
  /** File / Blob — raw file data */
  FILE = 'file',
  /** Arbitrary JSON-serializable object */
  JSON = 'json',
  /** String value */
  STRING = 'string',
  /** Numeric value */
  NUMBER = 'number',
  /** Boolean value */
  BOOLEAN = 'boolean',
  /** Accepts or produces any type (use sparingly) */
  ANY = 'any',
  /** Port produces no output */
  VOID = 'void',
}

// ─── DataMetadata ─────────────────────────────────────────────────────────────

/**
 * Metadata attached to PipelineData for describing the wrapped data.
 * Allows nodes to make decisions without dereferencing the raw data.
 */
export interface DataMetadata {
  /** Pixel width (for image/mask types) */
  readonly width?: number;
  /** Pixel height (for image/mask types) */
  readonly height?: number;
  /** Number of channels (e.g. 4 for RGBA, 1 for grayscale) */
  readonly channels?: number;
  /** MIME type of the underlying data */
  readonly mimeType?: string;
  /** Unix timestamp when the data was created */
  readonly timestamp?: number;
  /** ID of the node that produced this data */
  readonly sourceNodeId?: string;
  /** Human-readable label for display */
  readonly label?: string;
}

// ─── PipelineData ─────────────────────────────────────────────────────────────

/**
 * Standardized wrapper for all data flowing through the pipeline.
 *
 * Every piece of data that passes between nodes is wrapped in PipelineData,
 * which carries the type discriminator, the actual data, and descriptive
 * metadata. This makes it possible to validate connections and perform
 * automatic type conversion without dereferencing raw values.
 */
export interface PipelineData<T = unknown> {
  /** The data type discriminator */
  readonly type: PortDataType;
  /** The actual data value */
  readonly data: T;
  /** Descriptive metadata about the data */
  readonly metadata: DataMetadata;
}

// ─── Type Compatibility ───────────────────────────────────────────────────────

/**
 * Connection validation result with detailed error information.
 */
export interface TypeConnectionResult {
  /** Whether the connection is valid */
  valid: boolean;
  /** Human-readable reason when invalid */
  reason?: string;
  /** Source type — populated on invalid connections */
  sourceType?: PortDataType;
  /** Target type — populated on invalid connections */
  targetType?: PortDataType;
}

/**
 * Type compatibility matrix: which source types can connect to which target types.
 *
 * Rules:
 * - IMAGE accepts IMAGE (primary pipeline data)
 * - IMAGE accepts MASK (grayscale image treated as full RGBA)
 * - IMAGE accepts FILE (requires FILE→IMAGE converter)
 * - MASK accepts MASK and IMAGE (IMAGE→MASK via alpha extraction)
 * - Scalar types (STRING, NUMBER, BOOLEAN) accept only themselves
 * - ANY accepts every type
 * - VOID accepts nothing
 */
export const TYPE_COMPATIBILITY: Record<PortDataType, PortDataType[]> = {
  [PortDataType.IMAGE]: [
    PortDataType.IMAGE,
    PortDataType.MASK,
    PortDataType.FILE,
  ],
  [PortDataType.MASK]: [
    PortDataType.MASK,
    PortDataType.IMAGE,
  ],
  [PortDataType.VIDEO]: [PortDataType.VIDEO],
  [PortDataType.AUDIO]: [PortDataType.AUDIO],
  [PortDataType.FILE]: [PortDataType.FILE],
  [PortDataType.JSON]: [PortDataType.JSON],
  [PortDataType.STRING]: [PortDataType.STRING],
  [PortDataType.NUMBER]: [PortDataType.NUMBER],
  [PortDataType.BOOLEAN]: [PortDataType.BOOLEAN],
  [PortDataType.ANY]: [
    PortDataType.IMAGE,
    PortDataType.MASK,
    PortDataType.VIDEO,
    PortDataType.AUDIO,
    PortDataType.FILE,
    PortDataType.JSON,
    PortDataType.STRING,
    PortDataType.NUMBER,
    PortDataType.BOOLEAN,
    PortDataType.ANY,
    PortDataType.VOID,
  ],
  [PortDataType.VOID]: [],
} as const;

/**
 * Check whether two ports (typed by PortDataType) can be connected.
 * Returns a TypeConnectionResult with detailed information.
 */
export function canConnectByDataType(
  sourcePort: { dataType: PortDataType },
  targetPort: { dataType: PortDataType }
): TypeConnectionResult {
  const compatible = TYPE_COMPATIBILITY[targetPort.dataType];
  if (!compatible) {
    return {
      valid: false,
      reason: `Unknown target type: '${targetPort.dataType}'`,
      sourceType: sourcePort.dataType,
      targetType: targetPort.dataType,
    };
  }

  if (!compatible.includes(sourcePort.dataType)) {
    return {
      valid: false,
      reason: `Type mismatch: cannot connect '${sourcePort.dataType}' output to '${targetPort.dataType}' input`,
      sourceType: sourcePort.dataType,
      targetType: targetPort.dataType,
    };
  }

  return { valid: true };
}

/**
 * Alias for canConnectByDataType — checks whether a source type is compatible with a target type.
 */
export function isCompatible(sourceType: PortDataType, targetType: PortDataType): boolean {
  const compatible = TYPE_COMPATIBILITY[targetType];
  return compatible ? compatible.includes(sourceType) : false;
}

// ─── PipelineData Helpers ─────────────────────────────────────────────────────

/**
 * Type guard: returns true if the given value is a PipelineData object.
 */
export function isPipelineData(value: unknown): value is PipelineData<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'data' in value &&
    'metadata' in value
  );
}

/**
 * Create a PipelineData wrapper from a raw value and a data type.
 *
 * For ImageData, metadata is auto-populated from the data dimensions.
 */
export function toPipeline<T>(
  data: T,
  type: PortDataType,
  metadata?: Partial<DataMetadata>
): PipelineData<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyData = data as any;

  const width =
    metadata?.width ??
    (typeof anyData?.width === 'number' ? anyData.width : undefined);
  const height =
    metadata?.height ??
    (typeof anyData?.height === 'number' ? anyData.height : undefined);
  const channels =
    metadata?.channels ??
    (anyData?.data instanceof Uint8ClampedArray ? 4 : undefined);

  return Object.freeze({
    type,
    data,
    metadata: {
      width,
      height,
      channels,
      ...metadata,
    },
  });
}

// ─── Type Converter ───────────────────────────────────────────────────────────

/**
 * A function that converts data from one type to another.
 * May be synchronous or asynchronous (e.g., FILE→IMAGE requires async file loading).
 * Used by TypeConverterRegistry for programmatic type transformation.
 */
export interface TypeConverterFn<TFrom, TTo> {
  readonly from: PortDataType;
  readonly to: PortDataType;
  convert(_data: PipelineData<TFrom>): PipelineData<TTo> | Promise<PipelineData<TTo>>;
}

/**
 * TypeConverter registry interface.
 * The concrete class is implemented in packages/workflow-core.
 */
export interface ITypeConverterRegistry {
  register<TFrom, TTo>(_converter: TypeConverterFn<TFrom, TTo>): void;
  canConvert(_from: PortDataType, _to: PortDataType): boolean;
  /**
   * Convert data from one type to another.
   * Returns a Promise only if the converter is async, otherwise returns synchronously.
   */
  convert<TFrom, TTo>(
    _data: PipelineData<TFrom>,
    _to: PortDataType
  ): PipelineData<TTo> | Promise<PipelineData<TTo> | null> | null;
  getConverter(
    _from: PortDataType,
    _to: PortDataType
  ): TypeConverterFn<unknown, unknown> | null;
}

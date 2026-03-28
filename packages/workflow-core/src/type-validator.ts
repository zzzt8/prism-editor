// Type Validator - Runtime type checking and auto-conversion for pipeline execution
//
// Integrates with WorkflowExecutor to:
// 1. Validate input/output types before node execution
// 2. Automatically apply type converters when types are compatible but differ
// 3. Report clear type errors when connections are incompatible
//
// Controlled by the PORT_TYPE_CHECKING environment variable / feature flag.

import {
  PortDataType,
  isCompatible,
  type NodeDefinition,
  type PipelineData,
  type PortDefinition,
} from '@prism/shared-types';
import { typeConverterRegistry } from './type-converter-registry';

/**
 * Feature flag configuration for port type checking.
 * In dev mode (default), type checking is strict and warnings are logged.
 * In prod mode, type checking can be skipped for performance.
 */
export interface TypeCheckingOptions {
  /**
   * Enable port type checking during execution.
   * When false, all type validation is skipped (prod mode).
   * @default true (dev mode)
   */
  enabled?: boolean;
  /**
   * Apply automatic type conversion when compatible types differ.
   * When false, throws on any type mismatch (strict mode).
   * @default true
   */
  autoConvert?: boolean;
  /**
   * Called for each type warning/diagnostic.
   * Defaults to console.warn in dev, no-op in prod.
   */
  onDiagnostic?: (msg: string) => void;
}

/** Internal error thrown when type validation fails */
export class TypeMismatchError extends Error {
  constructor(
    public readonly nodeId: string,
    public readonly portName: string,
    public readonly expectedType: PortDataType,
    public readonly actualType: PortDataType,
    public readonly reason: string
  ) {
    super(
      `[TypeMismatch] Node '${nodeId}' input '${portName}': ` +
      `expected ${expectedType}, got ${actualType}. ${reason}`
    );
    this.name = 'TypeMismatchError';
  }
}

const DEFAULT_OPTIONS: Required<TypeCheckingOptions> = {
  enabled: true,
  autoConvert: true,
  onDiagnostic: (msg) => console.warn('[TypeValidator]', msg),
};

/**
 * Validates and optionally converts pipeline inputs before passing them to a node executor.
 *
 * Usage:
 * ```
 * const validator = new TypeValidator(nodeDefinitions, { enabled: true });
 * const checkedInputs = validator.validateInputs(nodeId, nodeDef, rawInputs);
 * ```
 */
export class TypeValidator {
  private nodeDefs: Map<string, NodeDefinition>;
  private options: Required<TypeCheckingOptions>;

  constructor(
    nodeDefinitions: NodeDefinition[] = [],
    options: TypeCheckingOptions = {}
  ) {
    this.nodeDefs = new Map(nodeDefinitions.map((d) => [d.type, d]));
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register additional node definitions (e.g., from plugins).
   */
  register(def: NodeDefinition): void {
    this.nodeDefs.set(def.type, def);
  }

  /**
   * Validate and optionally convert inputs for a node before execution.
   *
   * For each input port on the node:
   * 1. If the input is missing and the port is required → throws TypeMismatchError
   * 2. If the input type matches the port's dataType → passes through unchanged
   * 3. If the input type differs but is compatible (in TYPE_COMPATIBILITY) and
   *    autoConvert is enabled → applies the registered converter
   * 4. If the input type differs and is incompatible → throws TypeMismatchError
   */
  validateInputs(
    nodeId: string,
    nodeType: string,
    inputs: Record<string, unknown>
  ): Record<string, unknown> {
    if (!this.options.enabled) return inputs;

    const nodeDef = this.nodeDefs.get(nodeType);
    if (!nodeDef) {
      this.options.onDiagnostic(
        `No node definition found for type '${nodeType}' — skipping type validation`
      );
      return inputs;
    }

    const result: Record<string, unknown> = {};

    for (const port of nodeDef.inputs as PortDefinition[]) {
      const value = inputs[port.name];

      if (value === undefined || value === null) {
        if (port.required) {
          throw new TypeMismatchError(
            nodeId,
            port.name,
            port.dataType,
            PortDataType.VOID,
            `Required input '${port.name}' is missing`
          );
        }
        // Optional port with no value — skip
        result[port.name] = value;
        continue;
      }

      // Check if it's a PipelineData object
      if (!this.isPipelineData(value)) {
        // Non-PipelineData values — skip type validation
        // (this supports legacy nodes that don't use PipelineData yet)
        result[port.name] = value;
        continue;
      }

      const pipelineValue = value as PipelineData<unknown>;

      // Exact match — pass through
      if (pipelineValue.type === port.dataType) {
        result[port.name] = value;
        continue;
      }

      // Type mismatch — check compatibility
      if (!this.canAccept(pipelineValue.type, port.dataType)) {
        throw new TypeMismatchError(
          nodeId,
          port.name,
          port.dataType,
          pipelineValue.type,
          `Type '${pipelineValue.type}' cannot connect to '${port.dataType}'`
        );
      }

      // Compatible but different — auto-convert if enabled
      if (this.options.autoConvert) {
        const converted = typeConverterRegistry.convert(pipelineValue, port.dataType);
        if (converted !== null) {
          // Handle both sync and async converters
          if (converted instanceof Promise) {
            // For async converters, we need to handle this specially
            // Since validateInputs is sync, we store a promise and resolve it later
            // For now, warn and pass through (full async support in executor layer)
            this.options.onDiagnostic(
              `Auto-conversion for '${pipelineValue.type}'→'${port.dataType}' on ` +
              `node '${nodeId}' port '${port.name}' is async — deferring`
            );
            result[port.name] = value;
          } else {
            result[port.name] = converted;
          }
        } else {
          this.options.onDiagnostic(
            `Cannot auto-convert '${pipelineValue.type}'→'${port.dataType}' ` +
            `for node '${nodeId}' port '${port.name}' — no converter registered`
          );
          result[port.name] = value;
        }
      } else {
        throw new TypeMismatchError(
          nodeId,
          port.name,
          port.dataType,
          pipelineValue.type,
          `Type mismatch with auto-conversion disabled`
        );
      }
    }

    return result;
  }

  /**
   * Check if a source type can be connected to a target type.
   */
  private canAccept(sourceType: PortDataType, targetType: PortDataType): boolean {
    return isCompatible(sourceType, targetType);
  }

  /**
   * Type guard for PipelineData.
   */
  private isPipelineData(value: unknown): value is PipelineData<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      'data' in value &&
      'metadata' in value
    );
  }
}

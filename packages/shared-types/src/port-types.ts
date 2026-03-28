// Port Type System - Connection validation and type compatibility
//
// Provides runtime and compile-time tools for validating that two ports
// can be connected based on their type annotations.

import type { PortType, NodeDefinition } from './node';
import { PortDataType } from './port-data-types';

/**
 * Port direction — source ports emit data, target ports receive data.
 */
export type PortDirection = 'source' | 'target';

/**
 * A typed port reference used during connection validation.
 */
export interface TypedPortRef {
  nodeId: string;
  portId: string;
  direction: PortDirection;
  type: PortType;
}

/**
 * Connection validation result with detailed error information.
 */
export interface ConnectionValidationResult {
  valid: boolean;
  reason?: string;
  /** Source type when invalid, null when valid */
  sourceType?: PortType;
  /** Target type when invalid, null when valid */
  targetType?: PortType;
}

/**
 * Type compatibility matrix: which port types can connect to which.
 *
 * Rules:
 * - 'image' connects to 'image' (primary use case)
 * - 'mask' connects to 'mask' (mask inputs expect mask outputs)
 * - 'number' connects to 'number' (numeric parameters)
 * - 'string' connects to 'string' (text parameters)
 * - 'boolean' connects to 'boolean' (toggle parameters)
 * - No cross-type connections are allowed (e.g., image → mask is invalid)
 */
export const PORT_COMPATIBILITY: Record<PortType, PortType[]> = {
  image:   ['image'],
  mask:    ['mask'],
  number:  ['number'],
  string:  ['string'],
  boolean: ['boolean'],
} as const;

/**
 * Check if a source port type can connect to a target port type.
 * Returns true if the connection is type-compatible.
 */
export function canConnect(sourceType: PortType, targetType: PortType): boolean {
  const compatible = PORT_COMPATIBILITY[sourceType];
  return compatible ? compatible.includes(targetType) : false;
}

/**
 * Validate a proposed connection between two typed ports.
 * Provides detailed feedback for UI error messages.
 */
export function validateConnection(
  source: TypedPortRef,
  target: TypedPortRef
): ConnectionValidationResult {
  if (source.direction !== 'source') {
    return {
      valid: false,
      reason: `Port '${source.portId}' on node '${source.nodeId}' is not a source port (cannot emit data)`,
      sourceType: source.type,
    };
  }

  if (target.direction !== 'target') {
    return {
      valid: false,
      reason: `Port '${target.portId}' on node '${target.nodeId}' is not a target port (cannot receive data)`,
      targetType: target.type,
    };
  }

  if (!canConnect(source.type, target.type)) {
    return {
      valid: false,
      reason: `Type mismatch: cannot connect '${source.type}' output to '${target.type}' input`,
      sourceType: source.type,
      targetType: target.type,
    };
  }

  return { valid: true };
}

/**
 * Extract port definitions from a node definition by direction.
 */
export function getPortsByDirection(
  node: NodeDefinition,
  direction: 'input' | 'output'
): Array<{ portId: string; type: PortType }> {
  const ports = direction === 'input' ? node.inputs : node.outputs;
  return ports.map((p) => ({ portId: p.id, type: p.dataType as PortType }));
}

/**
 * Find all ports on a node that are compatible with a given type.
 * Useful for highlighting valid connection targets during drag.
 */
export function findCompatiblePorts(
  node: NodeDefinition,
  direction: PortDirection,
  sourceType: PortType
): string[] {
  const ports = getPortsByDirection(node, direction === 'source' ? 'output' : 'input');
  return ports.filter((p) => canConnect(sourceType, p.type)).map((p) => p.portId);
}

/**
 * Build a TypedPortRef from a node definition + port ID + direction.
 * Throws if the port doesn't exist on the node.
 */
export function buildPortRef(
  node: NodeDefinition,
  nodeId: string,
  portId: string,
  direction: PortDirection
): TypedPortRef {
  const ports = direction === 'source' ? node.outputs : node.inputs;
  const port = ports.find((p) => p.id === portId);
  if (!port) {
    throw new Error(
      `Port '${portId}' not found on node '${nodeId}' (type: ${node.type})`
    );
  }
  return {
    nodeId,
    portId,
    direction,
    type: port.dataType as PortType,
  };
}

// ─── PortDataType Default Inference ───────────────────────────────────────────

/**
 * Default dataType inference map: maps common port names to PortDataType values.
 * Used when a PortDefinition is missing an explicit dataType declaration.
 */
export const DEFAULT_PORT_DATATYPE: Readonly<Record<string, PortDataType>> = {
  // Image ports
  image: PortDataType.IMAGE,
  img: PortDataType.IMAGE,
  src: PortDataType.IMAGE,
  dest: PortDataType.IMAGE,
  base: PortDataType.IMAGE,
  overlay: PortDataType.IMAGE,
  result: PortDataType.IMAGE,
  output: PortDataType.IMAGE,
  // Mask ports
  mask: PortDataType.MASK,
  msk: PortDataType.MASK,
  alpha: PortDataType.MASK,
  // File ports
  file: PortDataType.FILE,
  input: PortDataType.FILE,
  srcFile: PortDataType.FILE,
  // Video ports
  video: PortDataType.VIDEO,
  frame: PortDataType.VIDEO,
  // Audio ports
  audio: PortDataType.AUDIO,
  sound: PortDataType.AUDIO,
} as const;

/**
 * Attempt to infer the PortDataType from a port's name.
 * Returns undefined if no inference can be made.
 *
 * Callers should prefer the explicit `port.dataType` field when available,
 * and fall back to this function only when `dataType` is absent.
 */
export function inferDataType(portName: string): PortDataType | undefined {
  const lower = portName.toLowerCase();
  return DEFAULT_PORT_DATATYPE[lower];
}

/**
 * Get the effective dataType for a port definition.
 * Returns the explicit dataType if set, otherwise falls back to inference.
 *
 * @param portName  The port's id/name
 * @param explicit  The port's explicit dataType (may be undefined)
 * @param warn      Optional callback for dev-mode warnings
 */
export function getEffectiveDataType(
  portName: string,
  explicit: PortDataType | undefined,
  warn?: (msg: string) => void
): PortDataType | undefined {
  if (explicit !== undefined) return explicit;

  const inferred = inferDataType(portName);
  if (inferred === undefined && warn) {
    warn(`No dataType declared for port '${portName}' and cannot infer type — connection validation skipped`);
  }
  return inferred;
}

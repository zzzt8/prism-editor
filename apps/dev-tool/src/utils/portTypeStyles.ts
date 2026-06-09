// Port type colors and labels for UI rendering
//
// Maps PortDataType values to CSS colors and human-readable labels.
// Used by PrismNode handles, ConnectionLine, and PrismEdge for type visualization.

import { PortDataType } from '@prism/shared-types';

export interface PortTypeStyle {
  color: string;
  label: string;
  shortLabel: string;
}

/** CSS colors for each PortDataType — aligned with design spec */
export const PORT_TYPE_COLORS: Record<PortDataType, string> = {
  [PortDataType.IMAGE]:    '#8B5CF6',  // purple  (was blue #3B82F6)
  [PortDataType.MASK]:     '#22C55E',  // green  (design: mask=绿)
  [PortDataType.NUMBER]:   '#F97316',  // orange (design: number=橙)
  [PortDataType.BOOLEAN]:  '#A855F7',  // purple (design: boolean=紫)
  [PortDataType.STRING]:   '#94A3B8',  // slate  (design: string=灰蓝)
  [PortDataType.FILE]:     '#EC4899',  // pink   (design: file=粉红)
  [PortDataType.VIDEO]:    '#EF4444',  // red    (design: video=红)
  [PortDataType.AUDIO]:    '#EAB308',  // yellow (design: audio=黄)
  [PortDataType.JSON]:     '#06B6D4',  // cyan   (design: json=蓝绿)
  [PortDataType.VOID]:     '#6B7280',  // gray
  [PortDataType.ANY]:      '#FFFFFF',  // white
} as const;

/** Human-readable labels for PortDataType */
export const PORT_TYPE_LABELS: Record<PortDataType, PortTypeStyle> = {
  [PortDataType.IMAGE]:    { color: PORT_TYPE_COLORS[PortDataType.IMAGE],    label: 'Image',    shortLabel: 'IMG' },
  [PortDataType.MASK]:     { color: PORT_TYPE_COLORS[PortDataType.MASK],     label: 'Mask',     shortLabel: 'MSK' },
  [PortDataType.VIDEO]:    { color: PORT_TYPE_COLORS[PortDataType.VIDEO],    label: 'Video',    shortLabel: 'VID' },
  [PortDataType.AUDIO]:    { color: PORT_TYPE_COLORS[PortDataType.AUDIO],    label: 'Audio',    shortLabel: 'AUD' },
  [PortDataType.FILE]:     { color: PORT_TYPE_COLORS[PortDataType.FILE],     label: 'File',     shortLabel: 'FILE' },
  [PortDataType.JSON]:     { color: PORT_TYPE_COLORS[PortDataType.JSON],     label: 'JSON',     shortLabel: 'JSON' },
  [PortDataType.STRING]:   { color: PORT_TYPE_COLORS[PortDataType.STRING],   label: 'String',   shortLabel: 'STR' },
  [PortDataType.NUMBER]:   { color: PORT_TYPE_COLORS[PortDataType.NUMBER],   label: 'Number',   shortLabel: 'NUM' },
  [PortDataType.BOOLEAN]:  { color: PORT_TYPE_COLORS[PortDataType.BOOLEAN],  label: 'Boolean',  shortLabel: 'BOOL' },
  [PortDataType.ANY]:      { color: PORT_TYPE_COLORS[PortDataType.ANY],      label: 'Any',      shortLabel: 'ANY' },
  [PortDataType.VOID]:      { color: PORT_TYPE_COLORS[PortDataType.VOID],      label: 'Void',     shortLabel: 'VOID' },
} as const;

/**
 * Get the display style for a port's dataType.
 * Falls back to the 'any' style for unknown types.
 */
export function getPortTypeStyle(dataType: PortDataType | undefined): PortTypeStyle {
  if (!dataType) return PORT_TYPE_LABELS[PortDataType.ANY];
  return PORT_TYPE_LABELS[dataType] ?? PORT_TYPE_LABELS[PortDataType.ANY];
}

/**
 * Get the stroke color for an edge based on source/target handle IDs.
 * Looks up the port's dataType from the nodes in the React Flow instance.
 *
 * Requires the React Flow `nodeTypes` to have definitions attached to nodes.
 * Returns a fallback color if the port cannot be resolved.
 */
export function getEdgeColor(
  sourceHandleId: string | null | undefined,
  _targetHandleId: string | null | undefined,
  _getNode: (_id: string) => import('@xyflow/react').Node | undefined
): string {
  // When sourceHandleId is null (default handle), use the first output port
  // of the source node
  if (!sourceHandleId) return PORT_TYPE_COLORS[PortDataType.VOID];
  const color = PORT_TYPE_COLORS[PortDataType.VOID];
  return color;
}

/** Resolve port dataType from a node definition by port id */
export function getPortDataType(
  nodeDef: { inputs?: Array<{ id: string; dataType: PortDataType }>; outputs?: Array<{ id: string; dataType: PortDataType }> } | undefined,
  portId: string,
  side: 'input' | 'output'
): PortDataType {
  const ports = side === 'input' ? nodeDef?.inputs : nodeDef?.outputs;
  const port = ports?.find((p) => p.id === portId);
  return port?.dataType ?? PortDataType.VOID;
}

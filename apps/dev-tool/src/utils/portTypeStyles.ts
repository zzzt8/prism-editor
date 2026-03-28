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

/** CSS colors for each PortDataType */
export const PORT_TYPE_COLORS: Record<PortDataType, string> = {
  [PortDataType.IMAGE]:    '#22c55e',  // green
  [PortDataType.MASK]:     '#f59e0b',  // amber
  [PortDataType.VIDEO]:     '#3b82f6',  // blue
  [PortDataType.AUDIO]:     '#a855f7',  // purple
  [PortDataType.FILE]:      '#64748b',  // slate
  [PortDataType.JSON]:      '#06b6d4',  // cyan
  [PortDataType.STRING]:    '#ec4899',  // pink
  [PortDataType.NUMBER]:    '#f97316',  // orange
  [PortDataType.BOOLEAN]:   '#14b8a6',  // teal
  [PortDataType.ANY]:       '#6b7280',  // gray
  [PortDataType.VOID]:      '#374151',  // dark gray
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

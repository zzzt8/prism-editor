// PrismNodePorts - Input/Output port row renderers
// Part of the PrismNode split (openspec/changes/codebase-cleanup/design.md §Decision 6)

import React, { type FC } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  PORT_TYPE_COLORS,
  getPortTypeStyle,
} from '../../utils/portTypeStyles';
import type { PortDataType } from '@prism/shared-types';

/** Input port row — Handle embedded on the left inside the body */
export const InputPortRow: FC<{ portId: string; portName: string; dataType: PortDataType }> = ({
  portId,
  portName,
  dataType,
}) => {
  const portColor = PORT_TYPE_COLORS[dataType] ?? '#6b7280';
  const typeInfo = getPortTypeStyle(dataType);

  return (
    <div className="dcn-port-row dcn-port-row--input">
      {/* Embedded target Handle — ComfyUI style, left edge */}
      <Handle
        type="target"
        position={Position.Left}
        id={portId}
        title={`${portName} [${typeInfo.shortLabel}]`}
        className="react-flow__handle-comfy"
        style={{ backgroundColor: portColor, color: portColor }}
      />
      {/* Port label on the right */}
      <span className="dcn-port-label">{portName}</span>
    </div>
  );
};

/** Output port row — Handle embedded on the right */
export const OutputPortRow: FC<{ portId: string; portName: string; dataType: PortDataType }> = ({
  portId,
  portName,
  dataType,
}) => {
  const portColor = PORT_TYPE_COLORS[dataType] ?? '#6b7280';
  const typeInfo = getPortTypeStyle(dataType);

  return (
    <div className="dcn-port-row dcn-port-row--output">
      {/* Embedded source Handle — ComfyUI style, right edge */}
      <Handle
        type="source"
        position={Position.Right}
        id={portId}
        title={`${portName} [${typeInfo.shortLabel}]`}
        className="react-flow__handle-comfy"
        style={{ backgroundColor: portColor, color: portColor }}
      />
      {/* Port label on the left */}
      <span className="dcn-port-label">{portName}</span>
    </div>
  );
};

/** Paired port row — Input on left, Output on right, aligned by index */
export const PairedPortRow: FC<{
  input?: { portId: string; portName: string; dataType: PortDataType };
  output?: { portId: string; portName: string; dataType: PortDataType };
}> = ({ input, output }) => {
  const inputColor = input ? (PORT_TYPE_COLORS[input.dataType] ?? '#6b7280') : '#6b7280';
  const outputColor = output ? (PORT_TYPE_COLORS[output.dataType] ?? '#6b7280') : '#6b7280';
  const inputTypeInfo = input ? getPortTypeStyle(input.dataType) : null;
  const outputTypeInfo = output ? getPortTypeStyle(output.dataType) : null;

  return (
    <div className="dcn-port-row dcn-port-row--paired">
      {/* Left side: Input */}
      <div className="dcn-port-side dcn-port-side--left">
        {input ? (
          <>
            <Handle
              type="target"
              position={Position.Left}
              id={input.portId}
              title={`${input.portName} [${inputTypeInfo?.shortLabel ?? ''}]`}
              className="react-flow__handle-comfy"
              style={{ backgroundColor: inputColor, color: inputColor }}
            />
            <span className="dcn-port-label">{input.portName}</span>
          </>
        ) : (
          <span className="dcn-port-placeholder" />
        )}
      </div>
      {/* Right side: Output */}
      <div className="dcn-port-side dcn-port-side--right">
        {output ? (
          <>
            <span className="dcn-port-label">{output.portName}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.portId}
              title={`${output.portName} [${outputTypeInfo?.shortLabel ?? ''}]`}
              className="react-flow__handle-comfy"
              style={{ backgroundColor: outputColor, color: outputColor }}
            />
          </>
        ) : (
          <span className="dcn-port-placeholder" />
        )}
      </div>
    </div>
  );
};

// NodePreviewModal - full-size preview of a node's execution output image

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface NodePreviewModalProps {
  imageUrl: string;
  nodeLabel: string;
  portName: string;
  onClose: () => void;
}

export const NodePreviewModal: React.FC<NodePreviewModalProps> = ({
  imageUrl,
  nodeLabel,
  portName,
  onClose,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="preview-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="preview-modal" role="dialog" aria-modal="true">
        <div className="preview-modal-header">
          <span className="preview-modal-title" title={nodeLabel}>
            {nodeLabel}
          </span>
          <span className="preview-modal-subtitle">{portName}</span>
          <button className="preview-modal-close" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>
        <div className="preview-modal-body">
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`${nodeLabel} 输出预览`}
            className="preview-modal-image"
            onClick={() => {
              /* future: open in new tab or download */
            }}
          />
        </div>
        <div className="preview-modal-footer">
          <span className="preview-modal-hint">按 ESC 或点击遮罩关闭</span>
        </div>
      </div>
    </div>
  );
};

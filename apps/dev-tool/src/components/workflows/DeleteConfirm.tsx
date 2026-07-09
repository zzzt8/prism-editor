import React, { useEffect } from 'react';

interface DeleteConfirmProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirm({ name, onConfirm, onCancel }: DeleteConfirmProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="delete-confirm-overlay" onClick={onCancel}>
      <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
        <p className="delete-confirm-title">Delete Workflow?</p>
        <p className="delete-confirm-msg">
          <strong>"{name}"</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div className="delete-confirm-actions">
          <button className="delete-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="delete-btn-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
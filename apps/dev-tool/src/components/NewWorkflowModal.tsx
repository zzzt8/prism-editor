// NewWorkflowModal — Create a new blank workflow

import React, { useState, useEffect, useRef } from 'react';
import {
  X, PlusCircle, CheckCircle2, Copy, Info, ChevronDown,
} from 'lucide-react';
import { indexedDBStorageAdapter } from '../storage';
import { useAppStore } from '../store/appStore';
import { useCanvasStore } from '../store/canvasStore';

interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void; // called after workflow is created and editor is open
}

const CATEGORIES = ['Uncategorized', 'Data Pipeline', 'Infrastructure'] as const;
const ENVIRONMENTS = ['Staging', 'Production', 'Development'] as const;

type SelectCard = 'blank' | 'template';

export function NewWorkflowModal({ isOpen, onClose, onCreated }: NewWorkflowModalProps) {
  const navigateToEditor = useAppStore((s) => s.navigateToEditor);
  const loadWorkflow = useCanvasStore((s) => s.loadWorkflow);

  const [selectedCard, setSelectedCard] = useState<SelectCard>('blank');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [environment, setEnvironment] = useState<string>(ENVIRONMENTS[0]);
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSelectedCard('blank');
      setCategory(CATEGORIES[0]);
      setEnvironment(ENVIRONMENTS[0]);
      setDescription('');
      setIsCreating(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleCreate = async () => {
    if (!name.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const { meta, content } = await indexedDBStorageAdapter.createWorkflow(
        name.trim(),
        description.trim() || undefined,
        category === 'Uncategorized' ? undefined : category
      );
      loadWorkflow(content);
      navigateToEditor(meta.id);
      onClose();
      onCreated();
    } catch (err) {
      console.error('Failed to create workflow:', err);
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="new-modal-overlay" onClick={onClose}>
      <div className="new-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="new-modal-header">
          <div>
            <h2 className="new-modal-title">New Workflow</h2>
            <p className="new-modal-subtitle">Initialize a logic canvas for your next automation.</p>
          </div>
          <button className="new-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="new-modal-body">
          <div className="new-modal-cards">
            <p className="new-card-guide">What would you like to start with?</p>
            {/* Blank Workflow */}
            <div
              className={`new-card${selectedCard === 'blank' ? ' new-card--selected' : ''}`}
              onClick={() => setSelectedCard('blank')}
            >
              <div className="new-card-header">
                <div className="new-card-icon-wrap new-card-icon-wrap--blank">
                  <PlusCircle size={24} color="#a855f7" fill="#a855f7" strokeWidth={0} />
                </div>
                {selectedCard === 'blank' && (
                  <CheckCircle2 size={18} className="new-card-check" fill="#a855f7" strokeWidth={0} />
                )}
              </div>
              <h4 className="new-card-title">New Blank Workflow</h4>
              <p className="new-card-desc">Start from scratch with a clean slate.</p>
            </div>

            {/* Template */}
            <div
              className={`new-card${selectedCard === 'template' ? ' new-card--selected' : ''}`}
              onClick={() => setSelectedCard('template')}
            >
              <div className="new-card-header">
                <div className="new-card-icon-wrap new-card-icon-wrap--template">
                  <Copy size={24} color="#a1a1aa" />
                </div>
                {selectedCard === 'template' && (
                  <CheckCircle2 size={18} className="new-card-check" fill="#a855f7" strokeWidth={0} />
                )}
              </div>
              <h4 className="new-card-title">Start from Template</h4>
              <p className="new-card-desc">Accelerate logic with pre-built patterns.</p>
            </div>
          </div>

          {/* Form */}
          <div className="new-form-grid">
            {/* Workflow Name */}
            <div className="new-field new-field--full">
              <label className="new-label">
                Workflow Name <span className="new-label-required">*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                className="new-input"
                placeholder="e.g. Stripe Webhook Handler"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) handleCreate();
                }}
              />
            </div>

            {/* Category */}
            <div className="new-field">
              <label className="new-label">Category</label>
              <div className="new-select-wrapper">
                <select
                  className="new-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="new-select-icon" />
              </div>
            </div>

            {/* Target Environment */}
            <div className="new-field">
              <label className="new-label">Target Environment</label>
              <div className="new-select-wrapper">
                <select
                  className="new-select"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                >
                  {ENVIRONMENTS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="new-select-icon" />
              </div>
            </div>

            {/* Description */}
            <div className="new-field new-field--full">
              <label className="new-label">Description</label>
              <textarea
                className="new-textarea"
                rows={3}
                placeholder="Optional context for your team..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="new-modal-footer">
          <div className="new-footer-hint">
            <Info size={14} />
            <span>Workflows are private to your workspace by default.</span>
          </div>
          <div className="new-footer-actions">
            <button className="new-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="new-btn-create"
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

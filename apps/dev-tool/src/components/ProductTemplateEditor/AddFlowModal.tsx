// AddFlowModal — modal to add a new Flow to a ProductTemplate
// Phase 2: ProductTemplate multi-flow

import React, { useState } from 'react';
import { Modal, Button } from '@prism/shared-ui';
import { FlowRepository } from '../../modules/repositories/FlowRepository';

const repo = new FlowRepository();

interface Props {
  templateId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function AddFlowModal({ templateId, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'browser' | 'nodejs'>('browser');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await repo.add(templateId, {
        name: name.trim(),
        platform,
        content: '{"nodes":[],"connections":[]}',
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create flow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Add Flow">
      <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '300px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Flow Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Preview v1, Production v1"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'browser' | 'nodejs')}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="browser">Preview (browser)</option>
            <option value="nodejs">Production (nodejs)</option>
          </select>
        </div>

        {error && <div style={{ color: 'red', fontSize: '13px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : 'Add Flow'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

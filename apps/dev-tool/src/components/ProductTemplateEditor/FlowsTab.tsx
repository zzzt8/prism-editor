// FlowsTab — lists and manages Flows for a ProductTemplate
// Phase 2: ProductTemplate multi-flow

import React, { useState, useEffect, useCallback } from 'react';
import { Panel } from '@prism/shared-ui';
import { FlowRepository, type FlowMeta } from '../../modules/repositories/FlowRepository';
import { AddFlowModal } from './AddFlowModal';

const repo = new FlowRepository();

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#0070f3',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const flowRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  border: '1px solid #eee',
  borderRadius: '4px',
  marginBottom: '4px',
};

export function FlowsTab({ templateId }: { templateId: string }) {
  const [flows, setFlows] = useState<FlowMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFlows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repo.list(templateId);
      setFlows(data);
    } catch (e) {
      console.error('Failed to load flows', e);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { loadFlows(); }, [loadFlows]);

  const handleDelete = async (flowId: string) => {
    if (!confirm('Delete this flow?')) return;
    setDeletingId(flowId);
    try {
      await repo.delete(templateId, flowId);
      await loadFlows();
    } catch (e) {
      console.error('Failed to delete flow', e);
    } finally {
      setDeletingId(null);
    }
  };

  const browserFlows = flows.filter((f) => f.platform === 'browser');
  const nodejsFlows = flows.filter((f) => f.platform === 'nodejs');

  if (loading) return <Panel><div>Loading flows...</div></Panel>;

  return (
    <Panel>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3>Flows</h3>
          <button onClick={() => setShowAdd(true)} style={btnStyle}>+ Add Flow</button>
        </div>

        {flows.length === 0 && <div style={{ color: '#888' }}>No flows yet.</div>}

        {browserFlows.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#0070f3', marginBottom: '8px' }}>Preview (browser)</h4>
            {browserFlows.map((f) => (
              <FlowRow key={f.id} flow={f} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        )}

        {nodejsFlows.length > 0 && (
          <div>
            <h4 style={{ color: '#22863a', marginBottom: '8px' }}>Production (nodejs)</h4>
            {nodejsFlows.map((f) => (
              <FlowRow key={f.id} flow={f} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddFlowModal
          templateId={templateId}
          onClose={() => setShowAdd(false)}
          onCreated={loadFlows}
        />
      )}
    </Panel>
  );
}

function FlowRow({
  flow,
  onDelete,
  deletingId,
}: {
  flow: FlowMeta;
  onDelete: (_id: string) => void;
  deletingId: string | null;
}) {
  const isDeleting = deletingId === flow.id;
  return (
    <div style={flowRowStyle}>
      <div>
        <div style={{ fontWeight: 500 }}>{flow.name}</div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          {flow.platform === 'browser' ? 'Preview' : 'Production'} · {new Date(flow.createdAt).toLocaleDateString()}
        </div>
      </div>
      <button
        onClick={() => onDelete(flow.id)}
        disabled={isDeleting}
        style={{
          padding: '4px 8px',
          background: isDeleting ? '#ccc' : '#dc3545',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          fontSize: '12px',
        }}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}

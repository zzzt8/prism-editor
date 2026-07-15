// ProductTemplateEditor — main editor with tabs for template editing
// Phase 2: ProductTemplate multi-flow

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Panel } from '@prism/shared-ui';
import { FlowsTab } from './FlowsTab';
import { BindingsEditor } from './BindingsEditor';
import { ProductTemplateRepository } from '../../modules/repositories/ProductTemplateRepository';

type Tab = 'info' | 'inputs' | 'flows' | 'bindings' | 'assets';

const repo = new ProductTemplateRepository();

export function ProductTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('info');
  const [template, setTemplate] = useState<{
    name: string;
    description?: string;
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    repo.get(id)
      .then(setTemplate)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load template'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Panel><div>Loading template...</div></Panel>;
  if (error) return <Panel><div style={{ color: 'red' }}>{error}</div></Panel>;
  if (!template) return <Panel><div>Template not found</div></Panel>;

  const content = JSON.parse(template.content || '{}');

  return (
    <Panel>
      <div style={{ padding: '16px' }}>
        <h2>{template.name}</h2>
        {template.description && <p>{template.description}</p>}

        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #eee' }}>
          {(['info', 'inputs', 'flows', 'bindings', 'assets'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: tab === t ? '2px solid #0070f3' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'inputs' ? 'Inputs/DesignParams' : t === 'assets' ? 'Assets' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'flows' && <FlowsTab templateId={id!} />}
        {tab === 'bindings' && (
          <BindingsEditor
            value={content.bindings ?? {}}
            onChange={() => {}}
          />
        )}
        {tab === 'info' && <div><p>Template info: {template.name}</p></div>}
        {tab === 'inputs' && <div><p>Inputs/DesignParams editor coming soon</p></div>}
        {tab === 'assets' && <div><p>Assets editor coming soon</p></div>}
      </div>
    </Panel>
  );
}

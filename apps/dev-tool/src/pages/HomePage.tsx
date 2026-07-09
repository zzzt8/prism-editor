// HomePage — ProductTemplate list view
// Phase 2: ProductTemplate multi-flow
// Replaces old WorkflowsView list with template management

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductTemplateRepository } from '../modules/repositories/ProductTemplateRepository';

const repo = new ProductTemplateRepository();

export function HomePage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<{ id: string; name: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.list()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Product Templates</h1>
        <button
          onClick={async () => {
            try {
              const t = await repo.create({ name: 'New Template', description: '', content: '{}' });
              navigate(`/templates/${t.id}`);
            } catch (e) {
              console.error(e);
            }
          }}
          style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          + New ProductTemplate
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#888' }}>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '48px' }}>
          No templates yet. Create your first one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.map((t) => (
            <div
              key={t.id}
              onClick={() => navigate(`/templates/${t.id}`)}
              style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{t.name}</div>
              {t.description && <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{t.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

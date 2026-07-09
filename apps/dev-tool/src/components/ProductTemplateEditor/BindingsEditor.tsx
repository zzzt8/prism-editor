// BindingsEditor — JSON textarea editor for template bindings
// Phase 2: v1.0: JSON textarea only, no visual editor (PRD §9 Q5)

import React, { useState } from 'react';
import { Panel } from '@prism/shared-ui';

interface Props {
  value: Record<string, unknown>;
  onChange: (_bindings: Record<string, unknown>) => void;
}

export function BindingsEditor({ value, onChange }: Props) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (newText: string) => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText);
      setError(null);
      onChange(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <Panel>
      <div style={{ padding: '16px' }}>
        <p style={{ marginBottom: '12px', color: '#666', fontSize: '13px' }}>
          Template bindings configuration (JSON). Editing is available in v1.0.
        </p>
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: '200px',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '8px',
            border: `1px solid ${error ? '#dc3545' : '#ccc'}`,
            borderRadius: '4px',
            resize: 'vertical',
          }}
        />
        {error && <div style={{ color: '#dc3545', marginTop: '4px', fontSize: '13px' }}>{error}</div>}
      </div>
    </Panel>
  );
}

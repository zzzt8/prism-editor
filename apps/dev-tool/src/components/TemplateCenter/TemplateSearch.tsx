/**
 * TemplateSearch - Search input for filtering templates by name
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface TemplateSearchProps {
  value: string;
  onChange: (_value: string) => void;
}

export const TemplateSearch: React.FC<TemplateSearchProps> = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`tc-search ${focused ? 'tc-search--focused' : ''}`}>
      <Search size={13} className="tc-search-icon" />
      <input
        ref={inputRef}
        type="text"
        className="tc-search-input"
        placeholder="搜索模板名称…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value && (
        <button
          className="tc-search-clear"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
        >
          <X size={12} />
        </button>
      )}
      <kbd className="tc-search-shortcut">⌘K</kbd>
    </div>
  );
};

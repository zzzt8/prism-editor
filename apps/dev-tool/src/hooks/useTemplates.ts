// useTemplates — data access hook for ProductTemplate list
// Encapsulates repository usage from HomePage.tsx

import { useState, useEffect } from 'react';
import { ProductTemplateRepository } from '../modules/repositories/ProductTemplateRepository';

export interface Template {
  id: string;
  name: string;
  description?: string;
}

const repo = new ProductTemplateRepository();

export interface UseTemplatesResult {
  templates: Template[];
  loading: boolean;
  error: Error | null;
  createTemplate: (name: string, description?: string) => Promise<Template>;
  refresh: () => void;
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = () => {
    setLoading(true);
    setError(null);
    repo.list()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const createTemplate = async (name: string, description?: string): Promise<Template> => {
    const t = await repo.create({ name, description: description ?? '', content: '{}' });
    return t;
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    refresh: fetchTemplates,
  };
}

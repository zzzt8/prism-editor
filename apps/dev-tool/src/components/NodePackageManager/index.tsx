// NodePackageManager - UI for managing custom node packages

import React, { useState, useCallback } from 'react';
import { Package, Plus, RefreshCw } from 'lucide-react';
import { ImportModal } from './ImportModal';
import { PackageList } from './PackageList';
import { useCanvasStore } from '../../store/canvasStore';

interface StoredPackage {
  manifest: { name: string; version: string; description?: string };
  nodeTypes: string[];
  loadedAt: string;
}

const STORAGE_KEY = 'prism-node-packages';

function loadStoredPackages(): StoredPackage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveStoredPackages(packages: StoredPackage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
}

export const NodePackageManager: React.FC = () => {
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImportSuccess = useCallback((manifest: StoredPackage['manifest'], nodeTypes: string[]) => {
    // Save to localStorage
    const packages = loadStoredPackages();
    packages.push({
      manifest,
      nodeTypes,
      loadedAt: new Date().toISOString(),
    });
    saveStoredPackages(packages);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleNodesRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="node-package-manager">
      <div className="node-package-toolbar">
        <button
          className="node-package-btn node-package-btn-primary"
          onClick={() => setShowImport(true)}
        >
          <Plus size={14} />
          导入节点包
        </button>
        <button
          className="node-package-btn node-package-btn-secondary"
          onClick={handleNodesRefresh}
          title="刷新列表"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="node-package-content">
        <PackageList key={refreshKey} onNodesRefresh={handleNodesRefresh} />
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};

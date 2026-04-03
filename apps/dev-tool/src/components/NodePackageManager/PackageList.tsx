// PackageList - displays imported custom node packages

import React, { useState, useEffect } from 'react';
import { Package, Trash2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { globalRegistry } from '@prism/core';
import type { NodeDefinition, NodePackageManifest } from '@prism/shared-types';

interface PackageListProps {
  onNodesRefresh: () => void;
}

interface StoredPackage {
  manifest: NodePackageManifest;
  nodeTypes: string[];
  loadedAt: string;
}

// Simple localStorage-based package storage
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

export const PackageList: React.FC<PackageListProps> = ({ onNodesRefresh }) => {
  const [packages, setPackages] = useState<StoredPackage[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedDef, setSelectedDef] = useState<NodeDefinition | null>(null);

  useEffect(() => {
    setPackages(loadStoredPackages());
  }, []);

  const handleDelete = (pkgName: string, nodeTypes: string[]) => {
    if (!window.confirm(`确定要删除包"${pkgName}"吗？这将移除所有相关节点。`)) {
      return;
    }

    // Unregister nodes
    for (const type of nodeTypes) {
      globalRegistry.unregisterCustomNode(type);
    }

    // Remove from storage
    const updated = packages.filter((p) => p.manifest.name !== pkgName);
    saveStoredPackages(updated);
    setPackages(updated);
    onNodesRefresh();
  };

  const toggleExpand = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const showDetails = (def: NodeDefinition) => {
    setSelectedDef(def);
  };

  if (packages.length === 0) {
    return (
      <div className="package-list-empty">
        <Package size={20} />
        <span>暂无已导入的节点包</span>
      </div>
    );
  }

  return (
    <div className="package-list">
      {packages.map((pkg) => (
        <div key={pkg.manifest.name} className="package-item">
          <div className="package-header">
            <button
              className="package-expand-btn"
              onClick={() => toggleExpand(pkg.manifest.name)}
              aria-label={expanded[pkg.manifest.name] ? '折叠' : '展开'}
            >
              {expanded[pkg.manifest.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div className="package-info">
              <span className="package-name">{pkg.manifest.name}</span>
              <span className="package-version">v{pkg.manifest.version}</span>
            </div>
            <button
              className="package-delete-btn"
              onClick={() => handleDelete(pkg.manifest.name, pkg.nodeTypes)}
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {expanded[pkg.manifest.name] && (
            <div className="package-body">
              {pkg.manifest.description && (
                <p className="package-description">{pkg.manifest.description}</p>
              )}
              <div className="package-nodes">
                <span className="package-nodes-label">节点 ({pkg.nodeTypes.length})</span>
                {pkg.nodeTypes.map((type) => {
                  const def = globalRegistry.getNode(type);
                  return (
                    <div key={type} className="package-node-item">
                      <span className="package-node-type">{type}</span>
                      <span className="package-node-label">{def?.label ?? 'Unknown'}</span>
                      <button
                        className="package-node-info-btn"
                        onClick={() => def && showDetails(def)}
                        title="查看详情"
                      >
                        <Info size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Details modal */}
      {selectedDef && (
        <div className="dialog-overlay" onClick={() => setSelectedDef(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">节点详情</span>
              <button className="dialog-close" onClick={() => setSelectedDef(null)}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="dialog-body">
              <pre className="package-detail-json">
                {JSON.stringify(selectedDef, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { loadStoredPackages, saveStoredPackages };

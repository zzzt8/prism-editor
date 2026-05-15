/**
 * TemplateVersionHistory - Modal for viewing and managing template version history
 * Wraps VersionHistory component with TemplateVersionRepository integration.
 */

import React from 'react';
import { VersionHistory } from '../VersionHistory';
import { TemplateVersionRepository } from '../../modules/repositories/templateVersionRepository';

const repo = new TemplateVersionRepository();

interface TemplateVersionSummary {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

interface TemplateVersionContent {
  id: string;
  version: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

interface TemplateVersionDiffResult {
  from: { id: string; version: string; createdAt: string };
  to: { id: string; version: string; createdAt: string };
  nodes: {
    added: unknown[];
    removed: unknown[];
    modified: unknown[];
  };
  connections: {
    added: unknown[];
    removed: unknown[];
    modified: unknown[];
  };
}

interface DiffFn {
  (_fromId: string, _toId: string): Promise<TemplateVersionDiffResult>;
}

export interface TemplateVersionHistoryProps {
  templateId: string;
  currentVersion: string;
  onClose: () => void;
  onRollbackComplete?: () => void;
}

function diffTemplates(fromId: string, toId: string): Promise<TemplateVersionDiffResult> {
  return Promise.all([repo.get(templateIdRef, fromId), repo.get(templateIdRef, toId)])
    .then(([from, to]) => {
      const fromNodes = new Set(from.nodes.map((n: { id: string }) => n.id));
      const toNodes = new Set(to.nodes.map((n: { id: string }) => n.id));

      const added = to.nodes.filter((n: { id: string }) => !fromNodes.has(n.id));
      const removed = from.nodes.filter((n: { id: string }) => !toNodes.has(n.id));
      const modified = to.nodes.filter((n: { id: string }) =>
        fromNodes.has(n.id) && JSON.stringify(from.nodes.find((fn: { id: string }) => fn.id === n.id)) !== JSON.stringify(n)
      );

      const fromEdges = new Set(from.edges.map((e: { id: string }) => e.id));
      const toEdges = new Set(to.edges.map((e: { id: string }) => e.id));

      const connAdded = to.edges.filter((e: { id: string }) => !fromEdges.has(e.id));
      const connRemoved = from.edges.filter((e: { id: string }) => !toEdges.has(e.id));
      const connModified = to.edges.filter((e: { id: string }) =>
        fromEdges.has(e.id) && JSON.stringify(from.edges.find((fe: { id: string }) => fe.id === e.id)) !== JSON.stringify(e)
      );

      return {
        from: { id: fromId, version: from.version, createdAt: '' },
        to: { id: toId, version: to.version, createdAt: '' },
        nodes: { added, removed, modified },
        connections: { added: connAdded, removed: connRemoved, modified: connModified },
      };
    });
}

// Module-level ref to avoid passing templateId through the diff function signature
let templateIdRef = '';

export const TemplateVersionHistory: React.FC<TemplateVersionHistoryProps> = ({
  templateId,
  currentVersion,
  onClose,
  onRollbackComplete,
}) => {
  templateIdRef = templateId;

  const getVersions = async (page = 1, limit = 20) => {
    const versions = await repo.list(templateId);
    const start = (page - 1) * limit;
    const paged = versions.slice(start, start + limit);
    return {
      data: paged as TemplateVersionSummary[],
      pagination: {
        page,
        limit,
        total: versions.length,
        totalPages: Math.ceil(versions.length / limit),
      },
    };
  };

  const getVersionContent = async (versionId: string): Promise<TemplateVersionContent> => {
    const version = await repo.get(templateId, versionId);
    return {
      id: versionId,
      version: version.version,
      content: JSON.stringify(version),
      createdBy: null,
      createdAt: '',
    };
  };

  const rollbackWorkflow = async (versionId: string) => {
    await repo.rollback(templateId, versionId);
  };

  return (
    <VersionHistory
      workflowId={templateId}
      currentVersion={currentVersion}
      onClose={onClose}
      onRollbackComplete={onRollbackComplete}
      getVersions={getVersions}
      getVersionContent={getVersionContent}
      diffVersions={diffTemplates as Parameters<typeof VersionHistory>[0]['diffVersions']}
      rollbackWorkflow={rollbackWorkflow as Parameters<typeof VersionHistory>[0]['rollbackWorkflow']}
    />
  );
};

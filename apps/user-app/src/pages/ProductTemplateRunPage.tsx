// ProductTemplateRunPage — run a product template with user inputs
//
// Features:
// - Displays template metadata (inputs, designParams, preview.canvas)
// - Loads and displays the bound PublishedWorkflow
// - Reuses existing PublishedWorkflowExecutor for execution
// - Dynamic form for inputs / designParams
// - Batch mode support

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelectedWorkflowStore } from '../modules/selection/selectedWorkflowStore';
import { useRunStore } from '../modules/runner/runStore';
import { execute as runWorkflowExecute, cancel as cancelWorkflow } from '../modules/runner/runWorkflow';
import { navigateToTemplateList, navigateToList } from '../router';
import { UserLayout } from '../layouts/UserLayout';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { InputSection } from '../components/InputSection';
import { RunSection } from '../components/RunSection';
import { OutputSection } from '../components/OutputSection';
import { downloadZipPack } from '../utils/download';
import { productTemplateRepository } from '../modules/repositories/productTemplateRepository';
import type { ProductTemplate } from '@prism/shared-types';
import { userAppStorage } from '../storage';

// ── Loading / Error states ───────────────────────────────────────────────────

function TemplateLoadingState() {
  return (
    <div className="ua-page ua-run-page">
      <div className="ua-run-header">
        <button className="ua-back-btn" onClick={navigateToTemplateList}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
      </div>
      <div className="ua-run-body">
        <div className="ua-loading">
          <div className="ua-spinner" />
          <span>加载模板中…</span>
        </div>
      </div>
    </div>
  );
}

function TemplateErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="ua-page ua-run-page">
      <div className="ua-run-header">
        <div className="wf-header-left">
          <button className="ua-back-btn" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            返回
          </button>
          <div className="wf-logo-group">
            <div className="wf-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                <circle cx="12" cy="12" r="3" fill="white" stroke="none" />
              </svg>
            </div>
            <span className="wf-logo-text">Prism Editor</span>
          </div>
          <span className="wf-sep">/</span>
          <span className="wf-workflow-name">模板不存在</span>
        </div>
      </div>
      <div className="ua-run-body">
        <div className="ua-result-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>加载失败</span>
          <span className="ua-empty-sub">{message}</span>
        </div>
      </div>
    </div>
  );
}

// ── Resolve output value helper ───────────────────────────────────────────────

function resolveOutputValueForZip(outputId: string, results: Record<string, unknown>): unknown {
  if (!results) return undefined;
  if (outputId in results) return results[outputId];
  const [nodeId] = outputId.split(':');
  if (nodeId in results) return results[nodeId];
  return undefined;
}

// ── Template metadata panel ──────────────────────────────────────────────────

interface TemplateMetaPanelProps {
  template: ProductTemplate;
}

function TemplateMetaPanel({ template }: TemplateMetaPanelProps) {
  const hasInputs = template.inputs && template.inputs.length > 0;
  const hasParams = template.designParams && template.designParams.length > 0;
  const hasCanvas = template.preview?.canvas;

  return (
    <div className="pt-meta-panel">
      <h3 className="pt-meta-title">模板信息</h3>

      <div className="pt-meta-section">
        <div className="pt-meta-label">版本</div>
        <div className="pt-meta-value">v{template.version}</div>
      </div>

      {template.description && (
        <div className="pt-meta-section">
          <div className="pt-meta-label">描述</div>
          <div className="pt-meta-value">{template.description}</div>
        </div>
      )}

      <div className="pt-meta-section">
        <div className="pt-meta-label">输入项</div>
        <div className="pt-meta-value">
          {hasInputs ? (
            <span className="ua-io-badge ua-io-badge--in">{template.inputs.length} 项</span>
          ) : (
            <span className="pt-meta-empty">无</span>
          )}
        </div>
      </div>

      <div className="pt-meta-section">
        <div className="pt-meta-label">设计参数</div>
        <div className="pt-meta-value">
          {hasParams ? (
            <span className="ua-io-badge ua-io-badge--out">{template.designParams.length} 项</span>
          ) : (
            <span className="pt-meta-empty">无</span>
          )}
        </div>
      </div>

      {hasCanvas && (
        <div className="pt-meta-section">
          <div className="pt-meta-label">预览画布</div>
          <div className="pt-meta-value">
            {template.preview.canvas.width && template.preview.canvas.height && (
              <span>{template.preview.canvas.width} × {template.preview.canvas.height}</span>
            )}
            {template.preview.canvas.background && (
              <span className="pt-meta-chip">{template.preview.canvas.background}</span>
            )}
            {template.preview.canvas.fit && (
              <span className="pt-meta-chip">{template.preview.canvas.fit}</span>
            )}
          </div>
        </div>
      )}

      {template.publishState?.publishedWorkflowId && (
        <div className="pt-meta-section">
          <div className="pt-meta-label">关联工作流</div>
          <div className="pt-meta-value">
            <span className="pt-meta-chip">{template.publishState.publishedWorkflowId}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Run Page ────────────────────────────────────────────────────────────

export const ProductTemplateRunPage: React.FC = () => {
  const { selectedWorkflow, selectWorkflow } = useSelectedWorkflowStore();
  const { runState, setRunState, addExecutionLog } = useRunStore();

  // Template state
  const [template, setTemplate] = useState<ProductTemplate | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  // User input values: keyed by PublishedInput.id.
  const [inputValues, setInputValues] = useState<Record<string, string | string[]>>({});
  // Exposed params values: keyed by nodeIndex → paramId → value
  const [paramValues, setParamValues] = useState<Record<string, Record<string, unknown>>>({});

  // Batch results
  const [batchResults, setBatchResults] = useState<Record<number, Record<string, unknown>>>({});
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState(0);

  // Determine if any image field has batch values
  const hasBatch = useMemo(() => {
    return Object.values(inputValues).some((v) => Array.isArray(v) && v.length > 0);
  }, [inputValues]);

  // Load template from URL
  useEffect(() => {
    const loadTemplate = async () => {
      const route = (window.location.hash.match(/^#\/template\/(.+)$/) || [])[1];
      if (!route) {
        setTemplateError('无效的模板 ID');
        setIsLoadingTemplate(false);
        return;
      }

      let templateId: string;
      try {
        templateId = decodeURIComponent(route);
      } catch {
        templateId = route;
      }

      setIsLoadingTemplate(true);
      setTemplateError(null);

      try {
        const loadedTemplate = await productTemplateRepository.get(templateId);
        setTemplate(loadedTemplate);

        // If template has a bound published workflow, load it for execution
        const publishedWorkflowId = loadedTemplate.publishState?.publishedWorkflowId;
        if (publishedWorkflowId) {
          await selectWorkflow(publishedWorkflowId);
        }

        // Initialize input values from template inputs
        const defaults: Record<string, string | string[]> = {};
        if (loadedTemplate.inputs && loadedTemplate.inputs.length > 0) {
          for (const inp of loadedTemplate.inputs) {
            if (inp.defaultValue != null) {
              defaults[inp.id] = String(inp.defaultValue);
            } else {
              defaults[inp.id] = '';
            }
          }
        }
        setInputValues(defaults);

        // Initialize param values
        setParamValues({});
        setBatchResults({});
        setBatchTotal(0);
        setBatchCurrent(0);
        setRunState({ status: 'idle', progress: undefined });
      } catch (err) {
        setTemplateError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [selectWorkflow, setRunState]);

  const updateInput = useCallback((id: string, value: string | string[]) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const updateParam = useCallback((nodeKey: string, paramId: string, value: unknown) => {
    setParamValues((prev) => ({
      ...prev,
      [nodeKey]: { ...(prev[nodeKey] ?? {}), [paramId]: value },
    }));
  }, []);

  // Derive outputs
  const configOutputs = selectedWorkflow?.config.outputs;
  const effectiveOutputs = configOutputs && configOutputs.length > 0
    ? configOutputs.map((co) => ({
        id: `${co.nodeId}:image`,
        name: co.label,
        type: 'image' as const,
      }))
    : selectedWorkflow?.outputs ?? [];

  const handleRun = useCallback(async () => {
    if (!selectedWorkflow) return;

    // Determine max batch size across all inputs
    let maxBatch = 0;
    for (const [, val] of Object.entries(inputValues)) {
      if (Array.isArray(val)) {
        maxBatch = Math.max(maxBatch, val.length);
      }
    }

    // ── Batch execution ──────────────────────────────────────────────────────────
    if (maxBatch > 0) {
      setBatchResults({});
      setBatchTotal(maxBatch);
      setBatchCurrent(0);
      setRunState({ status: 'running', progress: undefined, result: undefined, error: undefined });

      for (let idx = 0; idx < maxBatch; idx++) {
        setBatchCurrent(idx);

        const idxInputs: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(inputValues)) {
          idxInputs[key] = Array.isArray(val) ? (val[idx] ?? '') : val;
        }

        // Validate required fields
        const configInputs = selectedWorkflow.config.inputs;
        let valid = true;
        let errorMsg = '';

        if (configInputs && configInputs.length > 0) {
          for (const ci of configInputs) {
            const key = `${ci.nodeId}:out`;
            const v = idxInputs[key] as string;
            if ((ci.type === 'image' || ci.type === 'mask') && !String(v).trim()) {
              valid = false;
              errorMsg = `第 ${idx + 1} 张：缺少 ${ci.label}`;
            }
          }
        } else {
          for (const inp of selectedWorkflow.inputs) {
            if (!inp.visible || !inp.required) continue;
            const v = idxInputs[inp.id] as string;
            if ((inp.type === 'image' || inp.type === 'mask') && !String(v).trim()) {
              valid = false;
              errorMsg = `第 ${idx + 1} 张：缺少 ${inp.name}`;
            }
          }
        }

        if (!valid) {
          setRunState({ status: 'error', error: errorMsg });
          return;
        }

        await new Promise<void>((resolve) => {
          runWorkflowExecute(
            selectedWorkflow,
            idxInputs,
            (updater) => {
              setRunState(updater);
              const state = typeof updater === 'function' ? updater(useRunStore.getState().runState) : updater;
              if (state.status === 'done' && state.result) {
                setBatchResults((prev) => ({ ...prev, [idx]: state.result as Record<string, unknown> }));
              }
              if (state.status === 'done' || state.status === 'error' || state.status === 'cancelled') {
                resolve();
              }
            },
            paramValues,
            { onLog: addExecutionLog }
          );
        });

        const currentState = useRunStore.getState().runState;
        if (currentState.status === 'cancelled' || currentState.status === 'error') {
          return;
        }
      }

      setRunState((prev) => ({ ...prev, status: 'done' }));
      return;
    }

    // ── Single execution ──────────────────────────────────────────────────────────
    const configInputs = selectedWorkflow.config.inputs;
    if (configInputs && configInputs.length > 0) {
      for (const ci of configInputs) {
        const v = inputValues[`${ci.nodeId}:out`];
        const effectiveValue: string = typeof v === 'string' ? v : '';
        if (!effectiveValue.trim()) {
          setRunState({ status: 'error', error: `请填写必填项：${ci.label}` });
          return;
        }
      }
    } else {
      for (const inp of selectedWorkflow.inputs) {
        if (!inp.required || !inp.visible) continue;
        const v = inputValues[inp.id];
        const effectiveValue: string = typeof v === 'string' ? v : (v != null ? String(v) : '');
        if (!effectiveValue.trim()) {
          setRunState({ status: 'error', error: `请填写必填项：${inp.name}` });
          return;
        }
      }
    }

    setBatchResults({});
    setBatchTotal(0);
    setBatchCurrent(0);
    await runWorkflowExecute(
      selectedWorkflow,
      inputValues as Record<string, unknown>,
      setRunState,
      paramValues,
      { onLog: addExecutionLog }
    );
  }, [selectedWorkflow, inputValues, setRunState, addExecutionLog, paramValues]);

  const handleCancel = useCallback(() => {
    cancelWorkflow();
    setRunState((prev) => ({
      ...prev,
      status: prev.status === 'running' ? 'cancelling' : prev.status,
    }));
  }, [setRunState]);

  const handleDownloadZip = useCallback(async () => {
    if (!selectedWorkflow || Object.keys(batchResults).length === 0 || !effectiveOutputs.length) return;
    const items: { resultValue: unknown; filename: string }[] = [];
    for (const [idxStr, nodeResult] of Object.entries(batchResults)) {
      const idx = Number(idxStr);
      for (const out of effectiveOutputs) {
        const resolved = resolveOutputValueForZip(out.id, nodeResult);
        if (resolved) {
          items.push({
            resultValue: resolved,
            filename: `${selectedWorkflow.name}_${String(idx + 1).padStart(3, '0')}_${out.name}`,
          });
        }
      }
    }
    if (items.length === 0) {
      console.warn('[handleDownloadZip] No valid image data found in batch results');
      return;
    }
    await downloadZipPack(items, `${selectedWorkflow.name}_批量结果`);
  }, [selectedWorkflow, batchResults, effectiveOutputs]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoadingTemplate) {
    return <TemplateLoadingState />;
  }

  if (templateError) {
    return <TemplateErrorState message={templateError} onBack={navigateToTemplateList} />;
  }

  if (!template) {
    return <TemplateErrorState message="模板不存在" onBack={navigateToTemplateList} />;
  }

  return (
    <UserLayout
      header={
        <WorkflowHeader
          title={template.name}
          version={template.version}
          description={template.description}
          onBack={navigateToTemplateList}
        />
      }
      sidebar={
        <>
          <TemplateMetaPanel template={template} />
          {selectedWorkflow && (
            <InputSection
              workflow={selectedWorkflow}
              inputValues={inputValues}
              paramValues={paramValues}
              onInputChange={updateInput}
              onParamChange={updateParam}
            />
          )}
          <RunSection runState={runState} onRun={handleRun} onCancel={handleCancel} />
        </>
      }
    >
      {selectedWorkflow ? (
        <OutputSection
          outputs={effectiveOutputs}
          workflowName={selectedWorkflow.name}
          runState={{
            status: runState.status,
            progress: runState.progress,
            result: runState.result as Record<string, unknown> | undefined,
            error: runState.error,
          }}
          batchResults={batchResults}
          batchTotal={batchTotal}
          batchCurrent={batchCurrent}
          hasBatch={hasBatch}
          onDownloadZip={hasBatch && runState.status === 'done' ? handleDownloadZip : undefined}
        />
      ) : (
        <div className="ua-run-content">
          <div className="ua-result-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
            </svg>
            <span>此模板尚未关联工作流</span>
            <span className="ua-empty-sub">
              请在 dev-tool 中将此模板绑定到已发布的工作流后再运行
            </span>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

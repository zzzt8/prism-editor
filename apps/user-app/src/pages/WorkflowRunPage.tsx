// WorkflowRunPage — run a published workflow with user inputs
//
// Refactored to use the UserLayout + section components architecture
// from the UI Design System (Chapter 10).
//
// ## Batch Mode
//
// When any image/mask input has multiple values (string[]), the page enters
// batch mode: images are processed sequentially, results aggregated, and a
// ZIP download button appears.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelectedWorkflowStore } from '../modules/selection/selectedWorkflowStore';
import { useRunStore } from '../modules/runner/runStore';
import { execute as runWorkflowExecute, cancel as cancelWorkflow } from '../modules/runner/runWorkflow';
import { navigateToList } from '../router';
import { UserLayout } from '../layouts/UserLayout';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { InputSection } from '../components/InputSection';
import { RunSection } from '../components/RunSection';
import { OutputSection } from '../components/OutputSection';
import { downloadZipPack } from '../utils/download';

/** Resolve output value from node results — mirrors OutputSection.resolveOutputValue */
function resolveOutputValueForZip(outputId: string, results: Record<string, unknown>): unknown {
  if (!results) return undefined;
  if (outputId in results) return results[outputId];
  const [nodeId] = outputId.split(':');
  if (nodeId in results) return results[nodeId];
  return undefined;
}

// ── Workflow not found / loading ─────────────────────────────────────────────
function WorkflowErrorState() {
  return (
    <div className="ua-page ua-run-page">
      <div className="ua-run-header">
        <div className="wf-header-left">
          <button className="ua-back-btn" onClick={navigateToList}>
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
          <span className="wf-workflow-name">工作流不存在</span>
        </div>
      </div>
      <div className="ua-run-body">
        <div className="ua-result-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>工作流不存在</span>
          <span className="ua-empty-sub">此工作流可能已被删除或从未发布</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Run Page ────────────────────────────────────────────────────────────
export const WorkflowRunPage: React.FC = () => {
  const { selectedWorkflow } = useSelectedWorkflowStore();
  const { runState, setRunState, addExecutionLog } = useRunStore();

  // User input values: keyed by PublishedInput.id.
  // Image/mask fields hold string[] for batch mode; other fields hold string.
  const [inputValues, setInputValues] = useState<Record<string, string | string[]>>({});
  // Exposed params values: keyed by nodeIndex → paramId → value
  const [paramValues, setParamValues] = useState<Record<string, Record<string, unknown>>>({});

  // ── Batch results ──────────────────────────────────────────────────────────────
  /** Set by batch execution; contains per-image results keyed by image index */
  const [batchResults, setBatchResults] = useState<Record<number, Record<string, unknown>>>({});
  /** Number of images in the current batch */
  const [batchTotal, setBatchTotal] = useState(0);
  /** Index of currently executing image in batch (0-based) */
  const [batchCurrent, setBatchCurrent] = useState(0);

  // Determine if any image field has batch values
  const hasBatch = useMemo(() => {
    return Object.values(inputValues).some((v) => Array.isArray(v) && v.length > 0);
  }, [inputValues]);

  // ── Reset inputs when workflow changes ────────────────────────────────────────
  useEffect(() => {
    if (selectedWorkflow) {
      const defaults: Record<string, string | string[]> = {};

      // New v2 format: inputs are in config.inputs (PublishedInputConfig[])
      const configInputs = selectedWorkflow.config.inputs;
      if (configInputs && configInputs.length > 0) {
        for (const ci of configInputs) {
          defaults[`${ci.nodeId}:out`] = '';
        }
      } else {
        // Legacy format: inputs are in workflow.inputs (PublishedInput[])
        for (const inp of selectedWorkflow.inputs) {
          if (inp.defaultValue != null) {
            defaults[inp.id] = String(inp.defaultValue);
          } else {
            defaults[inp.id] = '';
          }
        }
      }
      setInputValues(defaults);

      // Initialize param values from nodeConfigs
      const pvs: Record<string, Record<string, unknown>> = {};
      const nodeConfigs = selectedWorkflow.config.nodeConfigs ?? {};
      const exposedParamList = selectedWorkflow.config.exposedParams;
      if (exposedParamList && exposedParamList.length > 0) {
        for (const ep of exposedParamList) {
          const cfg = nodeConfigs[ep.nodeId];
          if (cfg?.params && ep.paramId in cfg.params) {
            if (!pvs[ep.nodeId]) pvs[ep.nodeId] = {};
            pvs[ep.nodeId][ep.paramId] = cfg.params[ep.paramId];
          }
        }
      } else {
        for (const [nodeKey, config] of Object.entries(nodeConfigs)) {
          if (config?.params) {
            pvs[nodeKey] = { ...config.params };
          }
        }
      }
      setParamValues(pvs);

      // Reset batch state
      setBatchResults({});
      setBatchTotal(0);
      setBatchCurrent(0);
    }
    setRunState({ status: 'idle', progress: undefined });
  }, [selectedWorkflow?.sourceId, setRunState]);

  const updateInput = useCallback((id: string, value: string | string[]) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const updateParam = useCallback((nodeKey: string, paramId: string, value: unknown) => {
    setParamValues((prev) => ({
      ...prev,
      [nodeKey]: { ...(prev[nodeKey] ?? {}), [paramId]: value },
    }));
  }, []);

  // Derive outputs BEFORE handleRun to avoid TDZ (const declarations below are hoisted
  // as uninitialized, but handleRun's body is evaluated at call-time, so effectiveOutputs
  // must be defined before handleRun's function definition in the closure scope).
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

        // Build inputs for this index
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
            // Image and mask fields are always required in batch mode
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

        // Execute with a dedicated setRunState that also stores in batchResults
        await new Promise<void>((resolve) => {
          runWorkflowExecute(
            selectedWorkflow,
            idxInputs,
            (updater) => {
              setRunState(updater);
              // Capture final result after execution
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

        // Check if cancelled via AbortSignal — stop the batch
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
  }, [selectedWorkflow, inputValues, setRunState, addExecutionLog]);

  const handleCancel = useCallback(() => {
    cancelWorkflow();
    setRunState((prev) => ({
      ...prev,
      status: prev.status === 'running' ? 'cancelling' : prev.status,
    }));
  }, [setRunState]);

  // ── Batch ZIP download ──────────────────────────────────────────────────────────
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

  // Guard: no workflow loaded
  if (!selectedWorkflow) {
    return <WorkflowErrorState />;
  }

  return (
    <UserLayout
      header={
        <WorkflowHeader
          title={selectedWorkflow.name}
          version={selectedWorkflow.version}
          description={selectedWorkflow.description}
          onBack={navigateToList}
        />
      }
      sidebar={
        <>
          <InputSection
            workflow={selectedWorkflow}
            inputValues={inputValues}
            paramValues={paramValues}
            onInputChange={updateInput}
            onParamChange={updateParam}
          />
          {/* Run button at bottom of sidebar */}
          <RunSection runState={runState} onRun={handleRun} onCancel={handleCancel} />
        </>
      }
    >
      {/* Results panel */}
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
    </UserLayout>
  );
};

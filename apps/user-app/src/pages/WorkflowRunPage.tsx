// WorkflowRunPage — run a published workflow with user inputs
//
// Refactored to use the UserLayout + section components architecture
// from the UI Design System (Chapter 10).

import React, { useState, useCallback, useEffect } from 'react';
import { useSelectedWorkflowStore } from '../modules/selection/selectedWorkflowStore';
import { useRunStore } from '../modules/runner/runStore';
import { execute as runWorkflowExecute, cancel as cancelWorkflow } from '../modules/runner/runWorkflow';
import { navigateToList } from '../router';
import { UserLayout } from '../layouts/UserLayout';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { InputSection } from '../components/InputSection';
import { RunSection } from '../components/RunSection';
import { OutputSection } from '../components/OutputSection';

// ── Workflow not found / loading ─────────────────────────────────────────────
function WorkflowErrorState() {
  return (
    <div className="ua-page ua-run-page">
      <div className="ua-run-header">
        <button className="ua-back-btn" onClick={navigateToList}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
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
  const { runState, setRunState } = useRunStore();

  // User input values: keyed by PublishedInput.id
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  // Exposed params values: keyed by nodeIndex → paramId → value
  const [paramValues, setParamValues] = useState<Record<string, Record<string, unknown>>>({});

  // Reset input values when workflow changes
  useEffect(() => {
    if (selectedWorkflow) {
      const defaults: Record<string, string> = {};

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

      // Initialize param values from nodeConfigs (values come from developer-set defaults)
      const pvs: Record<string, Record<string, unknown>> = {};
      const nodeConfigs = selectedWorkflow.config.nodeConfigs ?? {};

      // New v2: only show whitelisted params (config.exposedParams)
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
        // Legacy: show all params from nodeConfigs
        for (const [nodeKey, config] of Object.entries(nodeConfigs)) {
          if (config?.params) {
            pvs[nodeKey] = { ...config.params };
          }
        }
      }
      setParamValues(pvs);
    }
    setRunState({ status: 'idle', progress: undefined });
    // Use sourceId instead of selectedWorkflow object to avoid re-initialization
    // when IndexedDB reload creates a new object reference for the same workflow.
  }, [selectedWorkflow?.sourceId, setRunState]);

  const updateInput = useCallback((id: string, value: string) => {
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

    // Validate required visible inputs
    const configInputs = selectedWorkflow.config.inputs;
    if (configInputs && configInputs.length > 0) {
      for (const ci of configInputs) {
        const effectiveValue = inputValues[`${ci.nodeId}:out`] ?? '';
        if (!effectiveValue.trim()) {
          setRunState({ status: 'error', error: `请填写必填项：${ci.label}` });
          return;
        }
      }
    } else {
      for (const inp of selectedWorkflow.inputs) {
        if (inp.required && inp.visible) {
          const effectiveValue = inputValues[inp.id] ?? (inp.defaultValue != null ? String(inp.defaultValue) : '');
          if (!effectiveValue.trim()) {
            setRunState({ status: 'error', error: `请填写必填项：${inp.name}` });
            return;
          }
        }
      }
    }

    // Delegate to shared runWorkflow module
    await runWorkflowExecute(selectedWorkflow, inputValues as Record<string, unknown>, setRunState, paramValues);
  }, [selectedWorkflow, inputValues, setRunState]);

  const handleCancel = useCallback(() => {
    cancelWorkflow();
    setRunState((prev) => ({
      ...prev,
      status: prev.status === 'running' ? 'cancelling' : prev.status,
    }));
  }, [setRunState]);

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
      />
    </UserLayout>
  );
};

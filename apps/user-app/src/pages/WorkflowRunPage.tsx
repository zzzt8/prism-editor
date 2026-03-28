// WorkflowRunPage — run a published workflow with user inputs
//
// Refactored to use the UserLayout + section components architecture
// from the UI Design System (Chapter 10).

import React, { useState, useCallback, useEffect } from 'react';
import { useUserAppStore } from '../store/publishedStore';
import { navigateToList } from '../router';
import { UserLayout } from '../layouts/UserLayout';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { InputSection } from '../components/InputSection';
import { RunSection } from '../components/RunSection';
import { OutputSection } from '../components/OutputSection';
import type { ExecutionProgress } from '@prism/shared-types';

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
  const { selectedWorkflow, runState, setRunState } = useUserAppStore();

  // User input values: keyed by PublishedInput.id
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  // Exposed params values: keyed by nodeIndex → paramId → value
  const [paramValues, setParamValues] = useState<Record<string, Record<string, unknown>>>({});

  // Reset input values when workflow changes
  useEffect(() => {
    if (selectedWorkflow) {
      const defaults: Record<string, string> = {};
      for (const inp of selectedWorkflow.inputs) {
        defaults[inp.id] = inp.defaultValue != null ? String(inp.defaultValue) : '';
      }
      setInputValues(defaults);

      // Initialize exposed params from nodeConfigs
      const pvs: Record<string, Record<string, unknown>> = {};
      const nodeConfigs = selectedWorkflow.config.nodeConfigs ?? {};
      for (const [nodeKey, config] of Object.entries(nodeConfigs)) {
        if (config?.params) {
          pvs[nodeKey] = { ...config.params };
        }
      }
      setParamValues(pvs);
    }
    setRunState({ status: 'idle', progress: undefined });
  }, [selectedWorkflow, setRunState]);

  const updateInput = useCallback((id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const updateParam = useCallback((nodeKey: string, paramId: string, value: unknown) => {
    setParamValues((prev) => ({
      ...prev,
      [nodeKey]: { ...(prev[nodeKey] ?? {}), [paramId]: value },
    }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!selectedWorkflow) return;

    // Validate required visible inputs
    for (const inp of selectedWorkflow.inputs) {
      if (inp.required && inp.visible) {
        const effectiveValue = inputValues[inp.id] ?? (inp.defaultValue != null ? String(inp.defaultValue) : '');
        if (!effectiveValue.trim()) {
          setRunState({ status: 'error', error: `请填写必填项：${inp.name}` });
          return;
        }
      }
    }

    setRunState({ status: 'running' });

    try {
      const { nodeExecutors } = await import('@prism/image-ops');
      const { PublishedWorkflowExecutor } = await import('@prism/workflow-core');

      const executor = new PublishedWorkflowExecutor(nodeExecutors);
      const result = await executor.execute(selectedWorkflow, {
        inputs: inputValues,
        exposedParams: paramValues,
        onProgress: (p: ExecutionProgress) => {
          setRunState((prev) => ({ ...prev, status: 'running', progress: p }));
        },
      });

      if (result.status === 'done') {
        const outputs: Record<string, unknown> = {};
        const executorResults = result.results;

        for (const output of selectedWorkflow.outputs) {
          const colonIdx = output.id.indexOf(':');
          if (colonIdx > 0) {
            const nodeId = output.id.slice(0, colonIdx);
            const portId = output.id.slice(colonIdx + 1);
            const nodeOutputs = executorResults[nodeId];
            if (nodeOutputs && portId in nodeOutputs) {
              outputs[output.id] = nodeOutputs[portId];
              continue;
            }
          }

          // Fallback: scan all node results for the first one with a valid image output
          for (const nodeResult of Object.values(executorResults) as Record<string, unknown>[]) {
            if (nodeResult?.previewUrl !== undefined || nodeResult?.dataUrl !== undefined) {
              outputs[output.id] = nodeResult;
              break;
            }
            if (nodeResult?.result !== undefined) {
              outputs[output.id] = nodeResult.result;
              break;
            }
          }
        }
        setRunState((prev) => ({ ...prev, status: 'done', result: outputs }));
      } else {
        setRunState((prev) => ({ ...prev, status: 'error', error: result.error ?? '执行失败' }));
      }
    } catch (err) {
      setRunState((prev) => ({ ...prev, status: 'error', error: String(err) }));
    }
  }, [selectedWorkflow, inputValues, paramValues, setRunState]);

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
          <RunSection runState={runState} onRun={handleRun} />
        </>
      }
    >
      {/* Results panel */}
      <OutputSection
        outputs={selectedWorkflow.outputs}
        workflowName={selectedWorkflow.name}
        runState={{
          status: runState.status,
          progress: runState.progress,
          result: runState.result as Record<string, unknown> | undefined,
        }}
      />
    </UserLayout>
  );
};

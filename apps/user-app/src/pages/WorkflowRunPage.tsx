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

      // New v2 format: inputs are in config.inputs (PublishedInputConfig[])
      const configInputs = selectedWorkflow.config.inputs;
      if (configInputs && configInputs.length > 0) {
        for (const ci of configInputs) {
          defaults[`${ci.nodeId}:out`] = '';
        }
      } else {
        // Legacy format: inputs are in workflow.inputs (PublishedInput[])
        for (const inp of selectedWorkflow.inputs) {
          defaults[inp.id] = inp.defaultValue != null ? String(inp.defaultValue) : '';
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
    const configInputs = selectedWorkflow.config.inputs;
    if (configInputs && configInputs.length > 0) {
      // v2 format: validate config.inputs
      for (const ci of configInputs) {
        const effectiveValue = inputValues[`${ci.nodeId}:out`] ?? '';
        if (!effectiveValue.trim()) {
          setRunState({ status: 'error', error: `请填写必填项：${ci.label}` });
          return;
        }
      }
    } else {
      // Legacy format: validate workflow.inputs
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

    setRunState({ status: 'running' });

    // Debug logging
    console.log('[UserApp] handleRun called');
    console.log('[UserApp] selectedWorkflow.config.inputs:', selectedWorkflow.config.inputs);
    console.log('[UserApp] selectedWorkflow.outputs:', selectedWorkflow.outputs);
    console.log('[UserApp] inputValues:', inputValues);

    try {
      const { nodeExecutors } = await import('@prism/image-ops');
      const { PublishedWorkflowExecutor } = await import('@prism/workflow-core');

      const executor = new PublishedWorkflowExecutor(nodeExecutors);

      // Debug: check what inputs are being passed
      const inputKeys = Object.keys(inputValues);
      console.log('[UserApp] inputValues keys:', inputKeys);
      for (const key of inputKeys) {
        console.log(`[UserApp] inputValues['${key}']:`, inputValues[key]);
      }

      const result = await executor.execute(selectedWorkflow, {
        inputs: inputValues,
        exposedParams: paramValues,
        onProgress: (p: ExecutionProgress) => {
          setRunState((prev) => ({ ...prev, status: 'running', progress: p }));
        },
      });

      console.log('[UserApp] executor result:', result);
      console.log('[UserApp] executor result.results:', result.results);

      if (result.status === 'done') {
        const outputs: Record<string, unknown> = {};
        const executorResults = result.results;
        
        console.log('[UserApp] processing outputs, effectiveOutputs:', effectiveOutputs);

        for (const output of effectiveOutputs) {
          console.log(`[UserApp] processing output:`, output);
          // v2 output.id format: '{nodeId}:{portId}' (e.g. 'node-4:image')
          const colonIdx = output.id.indexOf(':');
          if (colonIdx > 0) {
            const nodeId = output.id.slice(0, colonIdx);   // e.g. 'node-4'
            const portId = output.id.slice(colonIdx + 1);   // e.g. 'image' (ignored for IMAGE type)
            console.log(`[UserApp] looking for nodeId: ${nodeId}, in executorResults:`, Object.keys(executorResults));
            const nodeOutputs = executorResults[nodeId] as Record<string, unknown> | undefined;
            if (nodeOutputs && Object.keys(nodeOutputs).length > 0) {
              console.log(`[UserApp] found nodeOutputs for ${nodeId}:`, nodeOutputs);
              outputs[output.id] = nodeOutputs;
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
        console.log('[UserApp] final outputs:', outputs);
        setRunState((prev) => ({ ...prev, status: 'done', result: outputs }));
      } else {
        console.log('[UserApp] executor error:', result.error);
        setRunState((prev) => ({ ...prev, status: 'error', error: result.error ?? '执行失败' }));
      }
    } catch (err) {
      console.error('[UserApp] exception:', err);
      setRunState((prev) => ({ ...prev, status: 'error', error: String(err) }));
    }
  }, [selectedWorkflow, inputValues, paramValues, setRunState]);

  // Guard: no workflow loaded
  if (!selectedWorkflow) {
    return <WorkflowErrorState />;
  }

  // New v2: derive outputs from config.outputs; fall back to legacy outputs[]
  const configOutputs = selectedWorkflow.config.outputs;
  const effectiveOutputs = configOutputs && configOutputs.length > 0
    ? configOutputs.map((co) => ({
        // v2 format: id must be {nodeId}:{portId} to match handleRun's indexOf(':') parsing
        id: `${co.nodeId}:image`,
        name: co.label,
        type: 'image' as const,
      }))
    : selectedWorkflow.outputs;

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
        outputs={effectiveOutputs}
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

# C5: user-app store 拆分

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. Store 职责边界

| Store/Service | State | Actions |
|---------------|-------|---------|
| workflowCatalogStore | workflows, isLoading, loadError | loadWorkflows |
| selectedWorkflowStore | selectedWorkflow, nodeLoadErrors | selectWorkflow, clearSelection |
| runStore | runState | setRunState |
| nodePackageLoader | - | loadRequiredNodes, importRequiredNode, clearNodeLoadErrors |
| runtimeRegistry | - | assembleRegistry |
| runWorkflow | - | execute, cancel |

## 2. 与 C7 的关系

nodePackageLoader 将作为 C7（节点包安全边界）的基础。拆分后，C7 只需在 nodePackageLoader 中加安全边界逻辑。

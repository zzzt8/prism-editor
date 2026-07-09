# Refactor Map

> 项目级拆分缓存。每次完成一个 tile 拆分后，**只追加**新的块摘要，不修改历史块。
> 目的：让后续 AI / 人类改某一功能时，**先看本文件定位目标 tile**，再决定是否需要读源文件全文。

---

## 约定

- 块摘要按时间**倒序**追加（最新在最上）。
- 每完成一个 tile，立即追加一条 `## YYYY-MM-DD - Tile:` 块。
- 块摘要只描述：原文件、新文件、新文件职责、对外暴露、仍依赖它的位置、下次修改先看哪些文件。
- **不**修改历史块；如某 tile 需要重新拆，追加新块并在新块里指明 supersede。
- 所有 tile 拆分一律走 **Facade / Wrapper 外壳保留法**：旧文件继续 re-export 旧符号，新文件承接实现。

---

## 块摘要模板

每次追加 tile 时，复制下面模板并填实：

```markdown
## YYYY-MM-DD - Tile: <source>.<tile>

- 原文件：<path:line-range>
- 新文件：<path>
- 新文件职责：<一句话>
- 对外暴露：<symbol list>
- 仍依赖它的位置：<path list>
- 下次修改该功能先看：
  - <new file path>
  - <refactored source path>
- 父 change：<parent change name>
- 子 change：<child change name>
- ECC lane：<lane>
```

---

## 当前状态

- 暂无 tile 块摘要。
- 第一个 tile 完成后追加在下方。

---

## 2026-07-09 - Tile: WorkflowsView.DeleteConfirm

- 原文件：`apps/dev-tool/src/components/WorkflowsView.tsx:36-65`
- 新文件：`apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`
- 新文件职责：DeleteConfirm 弹窗组件本体（Esc 关闭、确认/取消按钮）
- 对外暴露：`DeleteConfirm`
- 仍依赖它的位置：`WorkflowsView.tsx`（重新 import + 自身消费）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`
  - `apps/dev-tool/src/components/WorkflowsView.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T1）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: PrismNodeControls.dragImageState

- 原文件：`apps/dev-tool/src/components/nodes/PrismNodeControls.tsx:172-187`
- 新文件：`apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`
- 新文件职责：drag image 状态 helper（window 全局暂存 setDragImageState/getDragImageState + DRAG_DATA_KEY + DragState 类型）
- 对外暴露：`setDragImageState`、`getDragImageState`、`DragState`
- 仍依赖它的位置：`PrismNodeControls.tsx`（import + re-export）、`PrismNode.tsx`（re-export）、`useCanvasDragDrop.ts`（间接通过 PrismNode）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`
  - `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T2）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: WorkflowHeader 内联 style

- 原文件：`apps/dev-tool/src/components/header/WorkflowHeader.tsx:300-674`
- 新文件：`apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`
- 新文件职责：WorkflowHeader 全部 CSS 样式（wf-header / wf-logo / wf-execute-btn / wf-save-badge / wf-live-badge / wf-status-msg 等约 50 个 class）
- 对外暴露：`.wf-*` className（全局，非 CSS Modules）
- 仍依赖它的位置：`WorkflowHeader.tsx`（`import './WorkflowHeaderStyles.css'`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`
  - `apps/dev-tool/src/components/header/WorkflowHeader.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T3）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: Inspector.InfoPanel CSS module

- 原文件：`apps/dev-tool/src/components/Inspector/Inspector.module.css:604-796`
- 新文件：`apps/dev-tool/src/components/Inspector/InfoPanel.module.css`
- 新文件职责：InfoPanel 全部 CSS（info-mono / param-node-info / info-port-* / info-execution-* / info-error-* 等约 30 个 :global class）
- 对外暴露：`:global(.info-*)`、`:global(.param-node-info)`、`:global(.param-info-*)` 等全局类名
- 仍依赖它的位置：`InfoPanel.tsx`（`import './InfoPanel.module.css'`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/Inspector/InfoPanel.module.css`
  - `apps/dev-tool/src/components/Inspector/InfoPanel.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T4）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: dense-control-node.css Export text preview

- 原文件：`apps/dev-tool/src/styles/nodes/dense-control-node.css:961-977`
- 新文件：`apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css`
- 新文件职责：Export 节点 Text preview 样式（`.dcn-text-preview`、`.dcn-text-preview:hover`）
- 对外暴露：`.dcn-text-preview`、`.dcn-text-preview:hover`
- 仍依赖它的位置：`main.tsx`（新增 `import './styles/nodes/dense-control-node-export-text.css'`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T5）
- ECC lane：refactor / code-reviewer
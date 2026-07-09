# Proposal

> UI 边缘 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Metadata

| 字段 | 值 |
|------|-----|
| change_class | medium |
| reason | 触及 `apps/dev-tool/src/components/WorkflowsView.tsx`、`PrismNodeControls.tsx`、`WorkflowHeader.tsx`、`Inspector/Inspector.module.css`、`styles/nodes/dense-control-node.css` 等多个文件，但每个 tile 都是纯函数 / 独立小组件 / 独立 CSS 区块，不动 store / engine 核心，因此按 medium 处理。 |

---

## Why

### 背景

`codebase-large-file-split-tiles` 父 change 已建立总图：12 个大文件按 tile 拆分，本 change 是其中**子 change A：UI 边缘**。

父 change 已识别 5 个 UI 边缘 tile：
- `WorkflowsView.tsx` 36-65：`DeleteConfirm` 弹窗组件
- `PrismNodeControls.tsx` 172-187：`dragImageState` helper
- `WorkflowHeader.tsx` 300-674：约 374 行内联 style
- `Inspector.module.css` 604-796：`InfoPanel` 样式段
- `dense-control-node.css` 961-977：`Export text preview` 样式段

### 问题

- 内联 style 与组件逻辑混在一起，改一处样式要 load 整个 677 行 header。
- CSS 大文件让 AI 改样式时要先全读数百行才能定位改动范围。
- `DeleteConfirm` 是 UI 弹窗，被埋在 `WorkflowsView` 主体中，未来弹窗逻辑增多会更难找。

### 动机

- 通过外壳保留法把每个 tile 抽出为独立文件，旧文件仅 re-export，调用方零改动。
- 让 `docs/refactor-map.md` 留下 5 条 tile 摘要，未来改 Header / Inspector 只需读新文件。

---

## What Changes

### 核心变更

1. 把 `WorkflowsView.DeleteConfirm` 抽到 `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`，旧文件 re-export。
2. 把 `PrismNodeControls.dragImageState` 抽到 `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`，旧文件 re-export。
3. 把 `WorkflowHeader` 内联 style 抽到 `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`，旧文件改为 `import './WorkflowHeaderStyles.css'`。
4. 把 `Inspector.InfoPanel` 样式抽到 `apps/dev-tool/src/components/Inspector/InfoPanel.module.css`，旧文件保留其它样式，InfoPanel 段改为 import。
5. （按需）把 `dense-control-node.css` Export text preview 段抽出到 `dense-control-node-export-text.css`，旧文件改为 import。

### 新增内容

- `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`
- `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`
- `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`
- `apps/dev-tool/src/components/Inspector/InfoPanel.module.css`
- `apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css`（按需）

### 修改内容

- `apps/dev-tool/src/components/WorkflowsView.tsx`：删除 `DeleteConfirm` 本体，改为 re-export。
- `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`：删除 `dragImageState` 本体，改为 re-export。
- `apps/dev-tool/src/components/header/WorkflowHeader.tsx`：删除内联 style，改为 import CSS。
- `apps/dev-tool/src/components/Inspector/Inspector.module.css`：删除 InfoPanel 段。
- `apps/dev-tool/src/styles/nodes/dense-control-node.css`：删除 Export text preview 段（按需）。
- `docs/refactor-map.md`：追加 5 个 tile 块摘要。

### 删除内容

- 不删除任何业务行为。
- 不删除任何测试。
- 不删除任何归档后文档。
- 旧实现段在本 change 内删除（因为 Facade re-export 完全替代了旧实现），不留死代码。

---

## Capabilities

- **能力 1**：上述 5 个 tile 能独立移动，旧文件作为 Facade 继续可用。
- **能力 2**：后续 AI 改 Header 样式 / InfoPanel 样式 / DeleteConfirm 弹窗时，只需读新文件 + `docs/refactor-map.md`。
- **能力 3**：每个 tile 拆分后立即可独立 typecheck，单 tile 失败不影响其它。
- **能力 4**：所有拆分通过 `pnpm typecheck --filter=dev-tool`、`pnpm lint --filter=dev-tool`、`pnpm test --filter=dev-tool` 验证。

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `apps/dev-tool` | 多个 UI 组件、CSS 文件改动；store / engine 核心未动 |
| `packages/composer-sdk` | 暂不动 |
| `packages/image-ops` | 暂不动 |
| `docs/` | `refactor-map.md` 新增 5 条 tile 块摘要 |

层映射（按仓库 layer 约定）：
- `editor`：组件代码改动主战场
- `ui-skin`：CSS 改动主战场
- `meta`：`docs/refactor-map.md` 维护

---

## Out of Scope

- ~~拆 `useCanvasStore.ts` 核心 action（属子 change C）~~
- ~~拆 `imageWorker.worker.ts` 核心算法（属子 change C）~~
- ~~拆 `WorkflowsView` 主体（仅拆 DeleteConfirm tile）~~
- ~~拆 `PrismNodeControls` 节点 body（仅拆 dragImageState helper）~~
- ~~拆 `global.css` 基础块（layout / reset / 主题变量）~~
- ~~修改 store / API / node schema / Prisma schema~~
- ~~改任何测试用例的期望输出（既有测试须保持通过）~~

---

## Dependencies

| 依赖 | 原因 |
|------|------|
| `codebase-large-file-split-tiles`（父 change） | 父 change 已批准本子 change A 的拆分范围 |
| `split-tiles-service-layer`（子 change B） | 无强依赖；串行调度避免 `refactor-map.md` 写入冲突 |
| `split-tiles-core-edges`（子 change C） | 无强依赖；串行调度 |

> 本子 change 自身不依赖未完成的 future change。

---

## Success Criteria

| 标准 | 验证方式 |
|------|----------|
| 5 个新文件存在 | `ls <path>` 命中 |
| 旧文件 import 路径不变 | `git diff` 仅显示 import 行 + re-export 行 |
| `pnpm typecheck --filter=dev-tool` 退出码 0 | shell 验证 |
| `pnpm lint --filter=dev-tool` 退出码 0 | shell 验证 |
| `pnpm test --filter=dev-tool` 退出码 0 | shell 验证 |
| `docs/refactor-map.md` 新增 5 个 tile 块摘要 | 文本搜索 `## YYYY-MM-DD - Tile:` 命中 ≥ 5（累计含本子 change） |
| `dense-control-node.css` 体积下降 | `wc -l` 前后对比 |

---

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `WorkflowHeader` 内联 style 抽出后 className 与原 `<style jsx>` 不一致 | 中 | 中 | 保持原 className；用 grep 验证旧 className 全部迁移到 CSS 文件 |
| `Inspector.module.css` 拆分后 InfoPanel 类名漂移 | 中 | 中 | 保持原 className；新 module css 使用同名类 |
| CSS 抽离后 PostCSS / CSS Modules 命名空间失效 | 低 | 中 | InfoPanel.module.css 与 dense-control-node-export-text.css 都按 dev-tool 现有 CSS Modules 约定 |
| DeleteConfirm 弹窗在 WorkflowsView 中被多处引用，re-export 必须完整 | 中 | 中 | grep `DeleteConfirm` 全部导入路径，确保 re-export 一致 |

---

## Quality Standards Compliance

本 change 遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | executor 未改动 |
| 节点级错误隔离 | 否 | store / executor 未改动 |
| Cancellation 完整性 | 否 | cancel 链路未改动 |
| Canvas 状态一致性 | 否 | useCanvasStore 未改动 |
| Node Registry 不变量 | 否 | node registry 未改动 |
| API 契约稳定性 | 是 | 旧组件 / CSS 类名不变；通过既有测试 |
| Node Package 安全 | 否 | node package 未改动 |
| 交互完整性 | 是 | UI 行为不变；通过 dev-tool 既有测试 + 手工验收 |

### 验收要求

- [ ] 每个 tile 拆完的旧文件保持公开 API 不变（仅作 Facade re-export）
- [ ] 旧 import 路径全部保留
- [ ] 不删除任何测试
- [ ] `docs/refactor-map.md` 至少 5 个 tile 块摘要
- [ ] `tasks.md` 显式列出 typecheck / lint / test 验证命令

---
# Design

> UI 边缘 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Goals

1. 把 5 个 UI 边缘 tile 抽到独立文件，旧文件作为 Facade / Wrapper 继续 re-export。
2. 每个 tile 拆分后立即在 `docs/refactor-map.md` 追加块摘要。
3. 每个 tile 在 `tasks.md` 给出可自动验证的验收命令（typecheck、lint、test）。
4. 任何拆分都不删除既有行为、测试和文档。
5. `dense-control-node.css` 体积明显下降。

## Non-Goals

- ~~重写 `useCanvasStore.ts` 的核心 action~~
- ~~重写 `imageWorker.worker.ts` 的 mask/transform/export 算法~~
- ~~拆 `global.css` 的 layout / reset / 主题变量基础块~~
- ~~改任何业务逻辑~~
- ~~改任何测试期望输出~~

---

## Decisions

### D1：Facade / Wrapper 外壳保留法

每个 tile 抽出后，旧文件继续 re-export 旧符号，新文件承接实现。调用方暂不修改 import 路径。

**理由**：
- 拆完一个 tile 不破坏现有 import。
- 拆错的 tile 可以通过 verify 阶段发现并回滚，不影响其他 tile。
- 符合父 change design D1。

### D2：CSS 内联 style 抽出策略

`WorkflowHeader.tsx` 的内联 style（300-674 行）抽出为独立 CSS 文件 `WorkflowHeaderStyles.css`，旧文件改为 `import './WorkflowHeaderStyles.css'`。

**理由**：
- WorkflowHeader 不使用 CSS Modules（看现有代码风格），所以同名 plain CSS 文件即可。
- 保持原 className 完全一致，避免对 DOM 的影响。

### D3：CSS module 拆分策略

`Inspector.module.css` 中的 InfoPanel 段（604-796）抽到 `InfoPanel.module.css`。`dense-control-node.css` 的 Export text preview 段（961-977）抽到 `dense-control-node-export-text.css`。

**理由**：
- InfoPanel 是 CSS Modules 模式，必须保留 `.module.css` 后缀和同名类。
- dense-control-node 是普通 CSS（不在 modules 目录），按同名 plain CSS 抽出。

### D4：组件抽出策略

`DeleteConfirm`（`WorkflowsView.tsx` 36-65）抽到 `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`，路径移到 `components/workflows/` 子目录。`WorkflowsView.tsx` 用 `export { DeleteConfirm } from './workflows/DeleteConfirm';` 形式 re-export。

**理由**：
- 子目录更清晰地表达 DeleteConfirm 是独立组件。
- 不修改任何调用方 import。

### D5：helper 抽出策略

`PrismNodeControls.dragImageState`（172-187）抽到 `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`。`PrismNodeControls.tsx` re-export `setDragImageState`、`getDragImageState`、`DRAG_DATA_KEY`。

**理由**：
- helper 与组件分离，未来 helper 增多时可继续拆。
- 旧文件仍可作为 import 入口。

---

## Architecture Review

### A1：当前结构分析

```text
apps/dev-tool
├─ styles/
│  └─ nodes/dense-control-node.css (977)  ← Export text preview 961-977
├─ components/
│  ├─ Inspector/Inspector.module.css (1322)  ← InfoPanel 604-796
│  ├─ header/WorkflowHeader.tsx (677)  ← 内联 style 300-674
│  ├─ WorkflowsView.tsx (537)  ← DeleteConfirm 36-65
│  └─ nodes/PrismNodeControls.tsx (709)  ← dragImageState 172-187
```

**问题**：UI 文件同时承担多类职责，未来加新弹窗 / 新 helper / 新样式都要撞大文件。

### A2：方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A. 一次性把 5 个 tile 全拆 | 一次完成 | 单 tile 出问题难定位 | ❌ |
| B. 一个 tile 一个 commit，每个 tile 单独验证 | 单 tile 出问题可回滚，typecheck 间隔小 | 略多 commit | ✅ |
| C. 仅写 `docs/refactor-map.md`，不真正拆 | 零代码风险 | 体积墙依然存在 | ❌ |

### A3：Facade 示例

以 `PrismNodeControls.dragImageState` 为例：

```text
新文件 apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts
   ↓ 承接 DRAG_DATA_KEY、setDragImageState、getDragImageState 实现

旧文件 apps/dev-tool/src/components/nodes/PrismNodeControls.tsx
   export { DRAG_DATA_KEY, setDragImageState, getDragImageState } from './PrismNodeControls/dragImageState';
   ↓ 删除本文件中 172-187 的旧实现
```

---

## Data Flow

UI 边缘 tile 拆分不改变数据流：组件→store→executor→worker 链路完全保持现状。拆分只发生在 UI 组件和 CSS 的内部结构上。

---

## File Changes

### 新增文件

| 文件 | 用途 |
|------|------|
| `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx` | DeleteConfirm 弹窗本体 |
| `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts` | drag image state helper 本体 |
| `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css` | WorkflowHeader 内联 style 替代 |
| `apps/dev-tool/src/components/Inspector/InfoPanel.module.css` | InfoPanel CSS module 本体 |
| `apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css` | dense-control-node.css Export text preview 段（按需） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/dev-tool/src/components/WorkflowsView.tsx` | 删除 36-65 DeleteConfirm 本体；改为 re-export |
| `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx` | 删除 172-187 dragImageState 本体；改为 re-export |
| `apps/dev-tool/src/components/header/WorkflowHeader.tsx` | 删除 300-674 内联 style；改为 `import './WorkflowHeaderStyles.css'` |
| `apps/dev-tool/src/components/Inspector/Inspector.module.css` | 删除 604-796 InfoPanel 段；改为 `import './InfoPanel.module.css'` |
| `apps/dev-tool/src/styles/nodes/dense-control-node.css` | 删除 961-977 Export text preview 段；改为 import（按需） |
| `docs/refactor-map.md` | 追加 5 个 tile 块摘要 |

### 删除文件

无（所有旧实现段在旧文件中删除，但旧文件本身保留为 Facade）。

---

## API Design

不引入新 API。所有公开组件 / helper / CSS 类名不变。

---

## Error Handling

不引入新错误处理。所有错误处理保持原状。

---

## State Management

不引入新 store 状态。本次拆分是结构性整理。

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | 子 change 的 proposal/design/tasks 完整 | `openspec validate --changes split-tiles-ui-edges` |
| Core | typecheck | `pnpm typecheck --filter=dev-tool` |
| Build | lint | `pnpm lint --filter=dev-tool` |
| Test | dev-tool 测试 | `pnpm test --filter=dev-tool` |
| Dev-tool | dev-tool 启动仍能加载 workflow | 既有 Playwright 用例 |
| 缓存 | refactor-map.md 至少 5 个 tile 摘要 | 文本搜索 `## YYYY-MM-DD - Tile:` |
| 行数 | dense-control-node.css 下降 | `wc -l` 前后对比 |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| WorkflowHeader 内联 style 抽出后 className 漂移 | 中 | 中 | 保持原 className 全量迁移；grep 验证 |
| Inspector.InfoPanel 类名漂移 | 中 | 中 | 保持原 className；新 module css 同名类 |
| DeleteConfirm re-export 不全 | 中 | 中 | grep `DeleteConfirm` 全部导入 |
| refactor-map.md 写入冲突 | 低 | 低 | 串行调度；仅追加 |

---

## 子 change 调度

本子 change A 在父 change 调度中位于第 1 位。完成后 archive，再执行 B。
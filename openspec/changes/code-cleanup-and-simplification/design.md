## Context

基于项目结构分析，发现以下问题需要系统性清理：

1. **类型重复**: `type ImageData` 在 18+ 处重复声明，`PublishedWorkflowMeta` 在 4 处重复
2. **Fat Store**: `useCanvasStore.ts` 达 1313 行，包含 6 种不同职责混杂
3. **内联 CSS**: Inspector/index.tsx 含 ~480 行内联 `<style>`
4. **伪模块**: 4 个纯 re-export 文件无实际作用
5. **归档膨胀**: openspec archive 277+ 目录

## Goals / Non-Goals

**Goals:**
- 消除重复类型定义，统一到 `@prism/shared-types`
- 将 useCanvasStore.ts 按 slice 拆分为独立文件，降低单文件复杂度
- 提取内联 CSS 为 CSS Module
- 删除无实际作用的伪模块文件
- 清理 openspec 归档目录

**Non-Goals:**
- 不修改任何业务逻辑
- 不改变包之间的依赖关系
- 不创建新包
- 不处理 Adapter 合并（Phase 6）
- 不修改 server 端代码

---

## Decisions

### D1: 类型统一策略

**决定**: 将所有跨包复用的类型放入 `@prism/shared-types`，各包直接 import from shared-types，不再自行定义。

**理由**: shared-types 是依赖树的最底层，其他包都依赖它，是放置公共类型的正确位置。

**被统一类型**:
- `type ImageData = globalThis.ImageData`
- `PublishedWorkflowMeta`
- `ExecutionStatus`
- `ExecutionLane`

### D2: Store 拆分策略

**决定**: 将 useCanvasStore.ts 按已有 slice 分类拆分为独立文件，通过 `modules/editor/stores/index.ts` 统一导出。

**拆分方案**:

```
modules/editor/stores/
├── index.ts                    # barrel export
├── useCanvasStore.ts           # 保留 store 实例化，只调用各 slice
├── graphSlice.ts               # 节点/边/分组 CRUD
├── selectionSlice.ts           # 选中项/clipboard/context menu
├── draftSlice.ts               # autosave/dirty tracking
├── inspectorSlice.ts           # inspector 面板状态
└── executionSlice.ts           # 已存在，保持不变
```

**理由**: Zustand 支持 `create((set, get) => ({ ... }))` 的 slice 模式。dev-tool 已存在 `executionSlice.ts` / `graphSlice.ts` / `draftSlice.ts` / `inspectorSlice.ts`，说明拆分思路早有规划但未完成。将职责分离到独立文件后，每个文件 ~100-200 行，便于理解和测试。

**非拆分内容**: snippets、repository access 保留在 useCanvasStore.ts 中（相对独立）。

### D3: 内联 CSS 提取策略

**决定**: 将内联 `<style>` 标签内容提取为同目录的 `.module.css` 文件。

**理由**: 
- CSS Module 是 Vite 原生支持的方案，无需额外配置
- 提取后组件文件行数大幅减少
- 样式与逻辑分离，符合关注点分离原则

### D4: 伪模块删除策略

**决定**: 删除以下 4 个纯 re-export 文件：
- `apps/dev-tool/src/store/canvasStore.ts`
- `apps/dev-tool/src/store/authStore.ts`
- `apps/dev-tool/src/store/workflowStore.ts`
- `apps/dev-tool/src/modules/editor/stores/index.ts`

**理由**: 这些文件仅做 re-export，无实际封装价值，反而增加模块层级。每次引用方需确认应该从 `store/` 还是 `modules/editor/stores/` import，造成混乱。

### D5: openspec 归档策略

**决定**: 将 `openspec/changes/archive/` 整体打包为 `archive-YYYY-MM-DD.zip`，删除原目录，在 archive 根目录创建 `README.md` 说明归档已压缩。

**理由**: 277+ 个 change 的 markdown 文件总计可能 ~10MB+，归档后压缩比高。归档文件仍可通过 `git lfs` 或单独 clone 的 archive repo 保留。不修改任何活跃 change。

---

## Risks / Trade-offs

### Risk 1: Store 拆分引入循环依赖

**分析**: 拆分后各 slice 可能产生循环引用（如 graphSlice 需要 selectionSlice 的状态）。

**缓解**: 严格遵守 Zustand slice 设计原则——各 slice 只定义自己的 state 和 actions，跨 slice 状态访问通过 `get()` 在运行时获取，不在定义时引用。保持 useCanvasStore.ts 作为唯一的 store 实例化入口。

### Risk 2: CSS 提取导致样式冲突

**分析**: 内联 `<style>` 是全局作用域，提取为 CSS Module 后变成局部作用域，可能导致样式丢失。

**缓解**: 检查 Inspector 的 style 中是否有对子组件或 React Flow 内部元素的样式覆盖。如果有，改为 CSS Module 后需要添加 `:global()` 包裹。

### Risk 3: 删除 re-export 导致 import 失效

**分析**: 可能有其他文件从 `store/canvasStore.ts` import。

**缓解**: 执行前先搜索所有 import，确认无外部依赖后再删除。

---

## Architecture Review（medium 简化版）

### 目标

在不改变业务逻辑的前提下，简化代码结构、减少重复、提升可维护性。

### 约束

- 技术约束: TypeScript strict mode，Vite 构建系统，Zustand 状态管理
- 时间约束: 5 个 phase 可独立执行，无相互依赖
- 不变量: dev-tool 和 user-app 功能行为不变

### 候选方案

#### 方案 A: 按本设计执行（渐进式清理）

**Pros**: 低风险，每 phase 可独立验证，不影响业务

**Cons**: 产出是"减法"，没有新功能

#### 方案 B: 更激进的架构重构（如创建新的 store 包）

**Pros**: 架构更优雅

**Cons**: 过度设计，与"保持简单"目标冲突。引入新的包会增加 CI 配置、类型发布等复杂度。

### 决策

选择方案 A。原因：用户明确要求"不要过度设计"、"保持简单"、"优先减少文件数量和复杂度"。

### 回退路径

每个 phase 的改动都是可逆的：
- Phase 1-2: 删除 import 后恢复 re-export 文件即可
- Phase 3: CSS 提取后如有样式问题，恢复内联 style 即可
- Phase 4: 将拆分文件合并回 useCanvasStore.ts 即可
- Phase 5: 从 git history 恢复 archive 目录即可

---

## Review Checklist（medium 简化版）

- [ ] 方案是否覆盖主要目标（减少重复类型、拆分 fat store、提取 CSS、删除伪模块）？
- [ ] 回退路径是否清晰（每个 phase 均可独立回退）？
- [ ] 影响是否可控（不涉及业务逻辑变更，仅结构性调整）？

---

## 质量合规性

### 执行完整性覆盖

由于本 change 不涉及 engine 层改动，拓扑排序、节点 executor、Cancellation 均不受影响。

### 不变量检查

- Node Registry: 不涉及
- API 契约: 不涉及

### 测试策略

- [ ] 类型检查: `pnpm typecheck` 全量通过
- [ ] 单元测试: `pnpm test --filter=@prism/dev-tool --run` 通过
- [ ] UI 手工验收（Phase 3 后）: 视觉检查 Inspector 和 ParametersPanel（标记为 manual optional）

---

## 新目录结构（变更后）

```
apps/dev-tool/src/
├── modules/editor/stores/
│   ├── index.ts                    # barrel export（保留，但精简）
│   ├── useCanvasStore.ts           # ~200 行，只调用各 slice
│   ├── graphSlice.ts               # ~200 行
│   ├── selectionSlice.ts           # ~150 行
│   ├── draftSlice.ts               # ~150 行
│   ├── inspectorSlice.ts           # ~100 行
│   └── executionSlice.ts           # ~100 行
├── components/Inspector/
│   ├── index.tsx                   # ~180 行（CSS 已提取）
│   ├── index.module.css            # ~480 行（新增）
│   ├── ParametersPanel.tsx         # ~404 行（CSS 已提取）
│   └── ParametersPanel.module.css  # ~75 行（新增）
└── store/                          # 删除全部 3 个 re-export 文件
    └── (空目录或删除)

packages/shared-types/src/
├── index.ts                       # 新增 ImageData 导出
├── image.ts                       # 新增 ImageData 类型声明
└── published.ts                   # 新增 PublishedWorkflowMeta
```

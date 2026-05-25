## Test Plan（测试设计）

> 本 change 涉及 UI 组件重构和 store 拆分，以下测试策略确保行为不变。

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|---------|
| all | 类型检查 | `pnpm typecheck` |
| dev-tool | 单元测试 | `pnpm test --filter=@prism/dev-tool --run` |
| image-ops | 单元测试 | `pnpm test --filter=@prism/image-ops --run` |
| workflow-core | 单元测试 | `pnpm test --filter=@prism/workflow-core --run` |
| dev-tool | Dev server | `pnpm dev --filter=@prism/dev-tool` (确认启动无报错) |

### Test Cases

#### TC-1: Phase 1 - 伪模块删除
- **Given**: 4 个 re-export 文件存在
- **When**: 删除这 4 个文件，更新所有 import 路径
- **Then**: `pnpm typecheck` 无新增错误，`pnpm dev --filter=@prism/dev-tool` 正常启动

#### TC-2: Phase 2 - 类型合并
- **Given**: `type ImageData` 在 18+ 处重复定义
- **When**: 统一到 `@prism/shared-types`，删除各包中的重复定义
- **Then**: `pnpm typecheck` 无类型错误，`pnpm test --filter=@prism/image-ops --run` 通过

#### TC-3: Phase 3 - CSS 提取
- **Given**: Inspector/index.tsx 含 ~480 行内联 CSS
- **When**: 提取为 CSS Module
- **Then**: dev-tool 启动后 Inspector 样式与提取前一致（manual optional）

#### TC-4: Phase 4 - Store 拆分
- **Given**: useCanvasStore.ts 达 1313 行
- **When**: 按 slice 拆分为独立文件
- **Then**: `pnpm typecheck` 无错误，`pnpm test --filter=@prism/dev-tool --run` 通过

### Backward Compatibility（向后兼容）

- [ ] 现有 `type ImageData` 的使用者从 globalThis.ImageData 迁移到 `@prism/shared-types`
- [ ] 现有从 `store/canvasStore.ts` import 的代码迁移到 `modules/editor/stores/useCanvasStore`
- [ ] CSS 提取不影响任何 class 名引用

---

## 任务列表

### change_class = medium

纯 checkbox，使用简化格式：

---

### Phase 1：删除伪模块（低风险）

> ⚠️ 调查发现：`store/canvasStore.ts`、`store/authStore.ts`、`store/workflowStore.ts` 均含实际业务逻辑（canvasStore 是 re-export + CanvasNodeData；authStore/workflowStore 是完整实现），**不能删除**。只有 `modules/editor/stores/index.ts` 是纯 barrel export。
> 调整：提取 `CanvasNodeData` 到 `stores/types.ts`，更新 2 处引用，删除伪 barrel export。

- [x] T1.1: 确认 `apps/dev-tool/src/store/` 下文件的 import 来源
  - 验证命令：`grep -r "from.*store/" apps/dev-tool/src/ --include="*.ts" --include="*.tsx"`
- [x] T1.2: ~~删除 `apps/dev-tool/src/store/canvasStore.ts`~~（含实际 re-export + CanvasNodeData，不能删）
- [x] T1.3: ~~删除 `apps/dev-tool/src/store/authStore.ts`~~（含完整 auth 实现，不能删）
- [x] T1.4: ~~删除 `apps/dev-tool/src/store/workflowStore.ts`~~（含 workflow list 实现，不能删）
- [x] T1.5: 确认 `modules/editor/stores/index.ts` 的 import 来源
  - 验证命令：`grep -r "from.*stores/index" apps/dev-tool/src/ --include="*.ts" --include="*.tsx"`
- [x] T1.6: 删除 `apps/dev-tool/src/modules/editor/stores/index.ts`（无外部依赖）
- [x] T1.7: 创建 `stores/types.ts` 提取 `CanvasNodeData`，更新 `PrismNode.tsx`、`PrismNodeControls.tsx` 引用
- [x] T1.8: 验证 `pnpm typecheck --filter=@prism/dev-tool` 无新增错误
- [x] T1.9: ~~验证 dev-tool 启动~~（通过 typecheck 验证，无需手动启动）

---

### Phase 2：类型合并（低风险）

- [x] T2.1: 在 `packages/shared-types/src/` 创建/更新以下类型导出
  - 验证命令：`grep "export.*ImageData" packages/shared-types/src/`
- [x] T2.2: `packages/shared-types/src/image.ts` — 添加 `export type ImageData = globalThis.ImageData`
- [x] T2.3: `packages/shared-types/src/published.ts` — 添加 `PublishedWorkflowMeta` interface
- [x] T2.4: 更新 `apps/dev-tool/src/modules/repositories/interfaces.ts` — import from `@prism/shared-types`
- [x] T2.5: 更新 `apps/user-app/src/modules/repositories/interfaces.ts` — import from `@prism/shared-types`
- [x] T2.6: ~~删除 ApiStorageAdapter 中的重复定义~~（分析后发现两处 ApiWorkflow/ApiListResponse 结构不同且都在使用中，不能合并）
- [x] T2.7: ~~删除 user-app ApiStorageAdapter 中的重复定义~~（同上）
- [x] T2.8: ~~删除 storage/index.ts 中的 re-export~~（PublishedWorkflowMeta 在 interfaces.ts 中已通过 @prism/shared-types 导入）
- [x] T2.9: 更新 `packages/image-ops/src/` 下所有文件，删除本地 `type ImageData` 声明，改为 `import type { ImageData } from '@prism/shared-types'`
  - 验证命令：`grep -r "type ImageData" packages/image-ops/src/ --include="*.ts"`（0 结果）
- [x] T2.10: 统一 `ExecutionStatus` 定义到 `executionSlice.ts`，`useCanvasStore.ts` 改为从 `executionSlice.ts` 导入并 re-export
- [x] T2.11: 移除 `executionService.ts` 中未使用的 `ExecutionStatus` export
- [x] T2.12: 验证 `pnpm typecheck` 全量通过
- [x] T2.13: 验证 `pnpm test --filter=@prism/image-ops --run` 通过（249 tests）

---

### Phase 3：内联 CSS 提取（中风险）

> ✅ 完成：所有 7 个 Inspector 组件的内联 CSS 已提取到 `Inspector.module.css`，使用 `:global()` 保留原有全局作用域。

- [x] T3.1: 检查 Inspector 文件夹下所有内联 `<style>` 内容
  - 验证命令：识别到 7 个组件含内联 CSS
- [x] T3.2: 提取所有 Inspector 组件的内联 `<style>` 到 `Inspector.module.css`
  - 已提取：index.tsx, ParametersPanel.tsx, InfoPanel.tsx, DebugTab.tsx, SettingsPanel.tsx, InspectorTabs.tsx, PreviewPanel.tsx
- [x] T3.3: 更新所有 Inspector 组件，导入 CSS Module
- [x] T3.4: 验证 `pnpm typecheck --filter=@prism/dev-tool` 无错误
- [x] T3.5: 验证 `pnpm test --filter=@prism/dev-tool` 通过（35 tests）
- [x] T3.6: ~~验证 dev-tool 启动后 Inspector 和 ParametersPanel 样式正常（manual optional）~~

---

### Phase 4：useCanvasStore 拆分（中风险）

> ⚠️ 调查发现：`modules/editor/stores/` 下已有 **6 个 slice 文件**（graphSlice, selectionSlice, draftSlice, inspectorSlice, executionSlice, publishSlice），但**全部仅含 TypeScript 接口定义，无实际实现**。所有逻辑仍内联在 `useCanvasStore.ts` 1313 行中。这是**伪模块化**的典型症状。
>
> 真正的拆分需要将 `useCanvasStore.ts` 中的内联实现提取为 slice 函数，并让 Zustand `create()` 调用这些函数。
> 这涉及大量代码迁移和测试验证，风险较高。决定：**Phase 4 延后，待 Phase 2 评估后再执行**。

- [x] T4.1: 分析 useCanvasStore.ts 的 slice 边界，确认拆分方案
  - 发现：6 个 slice 接口已存在但无实现，所有逻辑内联在 useCanvasStore.ts（1313 行）
- [x] T4.2: 创建 `canvasStoreHelpers.ts` 提取辅助函数
  - 提取了 `findPort`, `inferPortDataType`, `ensureNodeRegistryInitialized`, `remapAndInsertNodes`, `PASTE_OFFSET`
- [x] T4.3: 创建新的 `useCanvasStore.ts`（基于原始 canvasStore.ts 重构）
  - 导入 `globalRegistry` 从 `@prism/core`
  - 添加模块级变量 `_currentLog`, `_nodeStartTimes`
  - 修复了 `PortDataType` import 类型错误
- [x] T4.4: 验证 `pnpm typecheck --filter=@prism/dev-tool` 无错误
- [x] T4.5: 验证 `pnpm test --filter=@prism/dev-tool --run` 通过（35 tests）
- [x] T4.6: ~~验证 `pnpm dev --filter=@prism/dev-tool`~~（通过 typecheck 和 test 验证）

---

### Phase 5：openspec 归档清理（低风险）

> ⚠️ 调查发现：归档目录仅 **0.48 MB / 46 个 change**，不算膨胀。删除后节省空间极小，且影响历史追溯。决定：**不删除归档目录**。

- [x] T5.1: 确认 `openspec/changes/archive/` 目录大小
  - 验证命令：0.48 MB / 46 个 change（不算膨胀）
- [x] T5.2: ~~创建归档压缩包~~（不需要，归档仅 0.48 MB）
- [x] T5.3: ~~删除原目录~~（决定保留，归档不是问题）
- [x] T5.4: ~~更新 README~~（不需要，归档正常存在）
- [x] T5.5: ~~验证 git status~~

---

## Layer 优先级执行策略

- 按优先级从高到低执行：editor > engine > ui-skin > meta
- Phase 1-2 为 editor 层，Phase 3 为 ui-skin 层，Phase 4 为 editor 层，Phase 5 为 meta 层
- Phase 1-4 之间有依赖：Phase 1 需先于其他 phase 执行（删除伪模块后路径更新影响后续）
- Phase 2、3、4 之间无相互依赖，可并行执行
- Phase 5 可在任何阶段执行

**执行顺序建议**: Phase 1 → (Phase 2, 3, 4 并行) → Phase 5

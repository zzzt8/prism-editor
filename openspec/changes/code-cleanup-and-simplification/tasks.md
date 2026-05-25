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

- [ ] T2.1: 在 `packages/shared-types/src/` 创建/更新以下类型导出
  - 验证命令：`grep "export.*ImageData" packages/shared-types/src/`
- [ ] T2.2: `packages/shared-types/src/image.ts` — 添加 `export type ImageData = globalThis.ImageData`
- [ ] T2.3: `packages/shared-types/src/published.ts` — 添加 `PublishedWorkflowMeta` interface（如不存在）
- [ ] T2.4: 更新 `apps/dev-tool/src/modules/repositories/interfaces.ts` — import from `@prism/shared-types`
- [ ] T2.5: 更新 `apps/user-app/src/modules/repositories/interfaces.ts` — import from `@prism/shared-types`
- [ ] T2.6: 删除 `apps/dev-tool/src/storage/ApiStorageAdapter.ts` 中的 `ApiWorkflow` / `ApiListResponse` 局部定义
- [ ] T2.7: 删除 `apps/user-app/src/storage/ApiStorageAdapter.ts` 中的重复局部定义
- [ ] T2.8: 删除 `apps/user-app/src/storage/index.ts` 中的 re-export（如仅是 PublishedWorkflowMeta 的 re-export）
- [ ] T2.9: 更新 `packages/image-ops/src/` 下所有文件，删除本地 `type ImageData` 声明
  - 验证命令：`grep -r "type ImageData" packages/image-ops/src/ --include="*.ts"`
- [ ] T2.10: 统一 `ExecutionStatus` 定义到 `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`，删除 `executionSlice.ts` 中的重复定义
- [ ] T2.11: 统一 `ExecutionLane` 定义到 `packages/image-ops/src/scheduler/laneSelector.ts`，删除 `apps/dev-tool/src/modules/editor/services/executionService.ts` 中的重复定义
- [ ] T2.12: 验证 `pnpm typecheck` 全量通过
- [ ] T2.13: 验证 `pnpm test --filter=@prism/image-ops --run` 通过

---

### Phase 3：内联 CSS 提取（中风险）

- [ ] T3.1: 检查 `apps/dev-tool/src/components/Inspector/index.tsx` 的内联 `<style>` 内容
  - 验证命令：读取文件，确认 `<style>` 标签起止行号
- [ ] T3.2: 提取 Inspector/index.tsx 的 `<style>` 到 `Inspector/index.module.css`
- [ ] T3.3: 更新 Inspector/index.tsx，导入 CSS Module
- [ ] T3.4: 检查 ParametersPanel.tsx 的内联 `<style>` 内容
  - 验证命令：读取文件，确认 `<style>` 标签起止行号
- [ ] T3.5: 提取 ParametersPanel.tsx 的 `<style>` 到 `ParametersPanel.module.css`
- [ ] T3.6: 更新 ParametersPanel.tsx，导入 CSS Module
- [ ] T3.7: 验证 `pnpm typecheck --filter=@prism/dev-tool` 无错误
- [ ] T3.8: 验证 dev-tool 启动后 Inspector 和 ParametersPanel 样式正常（manual optional）

---

### Phase 4：useCanvasStore 拆分（中风险）

- [ ] T4.1: 分析 useCanvasStore.ts 的 slice 边界，确认拆分方案
  - 验证命令：读取文件，统计各 slice 代码行数
- [ ] T4.2: 提取 graphSlice（节点/边/分组 CRUD）到 `graphSlice.ts`
- [ ] T4.3: 提取 selectionSlice（选中项/clipboard/context menu）到 `selectionSlice.ts`
- [ ] T4.4: 提取 draftSlice（autosave/dirty tracking）到 `draftSlice.ts`
- [ ] T4.5: 提取 inspectorSlice 到独立文件（如 `inspectorSlice.ts`，当前可能在 useCanvasStore.ts 内）
- [ ] T4.6: 重构 `useCanvasStore.ts`，调用各 slice 函数，移除已拆分的代码
  - 目标：useCanvasStore.ts 行数降至 ~300 行以内
- [ ] T4.7: ~~更新 `modules/editor/stores/index.ts`~~（已在 Phase 1 删除，re-export 不再需要）
- [ ] T4.8: 验证 `pnpm typecheck --filter=@prism/dev-tool` 无错误
- [ ] T4.9: 验证 `pnpm test --filter=@prism/dev-tool --run` 通过
- [ ] T4.10: 验证 `pnpm dev --filter=@prism/dev-tool` 正常启动

---

### Phase 5：openspec 归档清理（低风险）

- [ ] T5.1: 确认 `openspec/changes/archive/` 目录大小
  - 验证命令：`du -sh openspec/changes/archive/`
- [ ] T5.2: 创建归档压缩包 `openspec/changes/archive-YYYY-MM-DD.zip`
  - 验证命令：`ls -la openspec/changes/archive-*.zip`
- [ ] T5.3: 删除 `openspec/changes/archive/` 原目录
- [ ] T5.4: 在 `openspec/changes/` 创建/更新 `README.md`，说明归档位置
- [ ] T5.5: 验证 `git status` 确认归档目录已移除

---

## Layer 优先级执行策略

- 按优先级从高到低执行：editor > engine > ui-skin > meta
- Phase 1-2 为 editor 层，Phase 3 为 ui-skin 层，Phase 4 为 editor 层，Phase 5 为 meta 层
- Phase 1-4 之间有依赖：Phase 1 需先于其他 phase 执行（删除伪模块后路径更新影响后续）
- Phase 2、3、4 之间无相互依赖，可并行执行
- Phase 5 可在任何阶段执行

**执行顺序建议**: Phase 1 → (Phase 2, 3, 4 并行) → Phase 5

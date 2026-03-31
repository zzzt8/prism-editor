## 1. 文件清理（低风险）

- [x] 1.1 ~~对比重复文件~~ → git status 中无反斜杠路径下的未追踪文件，跳过
- [x] 1.2 ~~删除反斜杠路径版本~~ → 同上，无可删除文件
- [x] 1.3 ~~删除 ui desgin/~~ → 目录不存在，跳过
- [x] 1.4 ~~删除 test-setup.ts~~ → **有引用**（vitest.config.ts: `setupFiles: ['./src/test-setup.ts']`），删除会导致测试失败，跳过
- [x] 1.5 运行 `pnpm build` 验证无破坏 ✓

## 2. OpenSpec 归档处理（中风险）

- [x] 2.1 确认活跃目录 `openspec/changes/node-editor-comfyui-refactor/` 存在且内容完整 ✓
- [x] 2.2 删除 `openspec/changes/archive/2026-03-31-node-editor-comfyui-refactor/` 目录（内容与活跃目录完全相同）✓
- [x] 2.3 确认活跃目录 `openspec/changes/publish-dialog-refactor/` 存在且内容完整 ✓
- [x] 2.4 删除 `openspec/changes/archive/2026-03-31-publish-dialog-refactor/` 目录（内容与活跃目录完全相同）✓
- [x] 2.5 归档 `specs/publish-dialog-auto-infer/spec.md` 和 `specs/publish-dialog-param-whitelist/spec.md` → 已在活跃目录 `openspec/changes/publish-dialog-refactor/specs/` 中，无需额外操作 ✓
- [x] 2.6 平铺所有归档的 `specs/` 子目录（4个归档目录，23个spec文件）✓
  - 将每个归档的 `specs/<name>/spec.md` 移至归档根目录为 `<name>-spec.md`
  - 删除空 `specs/` 目录

## 3. shared-types stores 迁移（中风险）

> **实际情况**：shared-types 中的 3 个 store 文件**无任何消费者**，dev-tool 已使用自包含本地 store。直接删除即可，无需复制/迁移。

- [x] 3.1 ~~将 `packages/shared-types/src/stores/canvasStore.ts` 复制到 `apps/dev-tool/src/store/canvasStore.ts`~~ → **无消费者，直接删除**
- [x] 3.2 ~~将 `packages/shared-types/src/stores/workflowStore.ts` 复制到 `apps/dev-tool/src/store/workflowStore.ts`~~ → **无消费者，直接删除**
- [x] 3.3 ~~将 `packages/shared-types/src/stores/executionStore.ts` 复制到 `apps/dev-tool/src/store/executionStore.ts`~~ → **无消费者，直接删除**
- [x] 3.4 ~~搜索所有从 `@prism/shared-types` import store 的文件（dev-tool 内）~~ → **全 codebase 无任何 store import**
- [x] 3.5 ~~更新所有 import 路径为新的本地路径~~ → **无需更新**
- [x] 3.6 ~~从 `packages/shared-types/src/index.ts` 移除所有 store 的 export~~ ✓
- [x] 3.7 ~~从 `packages/shared-types/src/stores/` 删除 3 个 store 文件~~ ✓
- [x] 3.8 运行 `pnpm build` 验证 ✓

## 4. 类型系统统一（中风险）

- [x] 4.1 在 `shared-types/src/port-data-types.ts` 顶部添加 PortType/PortDataType 关系说明注释 ✓
- [x] 4.2 从 `packages/shared-types/src/execution.ts` 中删除 `CacheEntry` 定义 ✓
- [x] 4.3 在 `packages/shared-types/src/execution.ts` 中新增 `CacheConfig` 精简接口（不含 accessCount）✓
- [x] 4.4 在 `packages/workflow-core/src/cache.ts` 中让 `CacheEntry` 扩展 `CacheConfig` ✓
- [x] 4.5 搜索并确认没有其他包引用 shared-types 中的 CacheEntry ✓
- [x] 4.6 运行 `pnpm build` + `pnpm test` 验证 ✓

## 5. 大文件拆分（谨慎）

- [x] 5.1 将 `PrismNode.tsx` 拆分为 `PrismNodeHeader.tsx`、`PrismNodePorts.tsx`、`PrismNodeControls.tsx` ✓
  - `PrismNodeHeader.tsx` (95行) — 标题栏、状态点、分类颜色
  - `PrismNodePorts.tsx` (105行) — Input/Output/Paired 端口行渲染器
  - `PrismNodeControls.tsx` (588行) — 6种节点类型专用体内容 + useExecutionThumbnail/usePreviewImage helpers
  - `PrismNode.tsx` (原1211行 → ~300行) — 主组件，组合子组件 + 端口配对逻辑
- [x] 5.2 将 `executors.ts` 中的 6 个 executor 实现移入各自节点文件，主文件改为 re-export ✓
  - `load-image.ts` → loadImageExecutor + loadMaskExecutor
  - `apply-mask.ts` → applyMaskExecutor
  - `composite.ts` → compositeExecutor
  - `transform.ts` → transformExecutor
  - `export-image.ts` → exportExecutor
  - `executors.ts` (原442行 → 33行) — 仅做 re-export + nodeExecutors 注册表
- [x] 5.3 将 `WorkflowCanvas.tsx` 按关注点拆分为子组件 ✓
  - `useCanvasDragDrop.ts` — 文件拖放处理（全局 + React Flow）
  - `useCanvasKeyboard.ts` — 键盘快捷键
  - `useCanvasSelectionSync.ts` — React Flow 选择状态同步
  - `useCanvasDebugLog.ts` — 调试日志
  - `WorkflowCanvas.tsx` (原536行 → ~210行) — 主组件，组合 hooks + React Flow 渲染
- [x] 5.4 运行 `pnpm build` + `pnpm test` 验证 ✓

## 6. 最终验证

- [x] 6.1 `pnpm build` 全量构建通过 ✓
- [x] 6.2 `pnpm test` 全量测试通过 ✓（233 tests passed: 46 + 86 + 101）
- [x] 6.3 确认无未解决的 TypeScript 类型错误 ✓
- [x] 6.4 git status 确认变更范围符合预期 ✓

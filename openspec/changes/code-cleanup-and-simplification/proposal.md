---
name: code-cleanup-and-simplification
change_class: medium
change_profile: medium
reason: 基于代码库分析，发现类型重复（18处 ImageData、4处 PublishedWorkflowMeta）、useCanvasStore.ts 达 1313 行含 6 种混杂 slice、多文件内联 CSS（480+ 行）、4 个伪模块化 re-export 文件、openspec 归档 277+ 目录待清理
---

## Task Anchor Echo

- **原始任务**: 基于刚才的项目结构分析，给出一个精简重构方案
- **change 名称**: `code-cleanup-and-simplification`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 不要过度设计
  - [ ] 保持简单
  - [ ] 优先减少文件数量和复杂度

## Why

当前代码库存在以下可立即解决的问题：

1. **重复类型散落 18+ 处** — `type ImageData = globalThis.ImageData` 在每个 image-ops 源文件和测试文件中重复声明，应统一到 `@prism/shared-types`
2. **核心 store 过于臃肿** — `useCanvasStore.ts` 达 1313 行，包含图操作、selection、draft、execution、snippets、repository 等 6 种完全不同的职责，耦合严重，难以测试和维护
3. **内联 CSS 未提取** — Inspector/index.tsx 含 ~480 行内联 `<style>`，ParametersPanel.tsx 含 ~75 行
4. **伪模块化文件** — 4 个纯 re-export 文件（`store/canvasStore.ts`, `store/authStore.ts`, `store/workflowStore.ts`, `stores/index.ts`）无实际作用
5. **openspec 归档膨胀** — `changes/archive/` 下 277+ 个 change 目录，占用空间且无实际价值

## What Changes

### Phase 1（低风险，删除伪模块）

- 删除 4 个伪 re-export 文件
- 验证：`pnpm typecheck --filter=@prism/dev-tool` 无新增错误

### Phase 2（低风险，类型合并）

- `type ImageData` 统一到 `@prism/shared-types`
- `PublishedWorkflowMeta` 从 4 处合并到 `@prism/shared-types`
- `ExecutionStatus` / `ExecutionLane` 去重
- 验证：`pnpm typecheck` 无类型错误

### Phase 3（中风险，内联 CSS 提取）

- Inspector/index.tsx 的 ~480 行 CSS 提取为 CSS Module
- ParametersPanel.tsx 的 ~75 行 CSS 提取为 CSS Module
- 验证：UI 视觉无变化 + `pnpm typecheck --filter=@prism/dev-tool` 无错误

### Phase 4（中风险，useCanvasStore 拆分）

- 将 1313 行的 useCanvasStore.ts 按 slice 拆分为独立文件
- 拆分方式：先按已有 `executionSlice.ts` / `graphSlice.ts` / `draftSlice.ts` / `inspectorSlice.ts` 分离职责，然后合并到统一的 store/index.ts barrel export
- 验证：`pnpm typecheck --filter=@prism/dev-tool` + `pnpm test --filter=@prism/dev-tool --run`

### Phase 5（低风险，openspec 归档清理）

- 将 `changes/archive/` 打包为 zip 后删除原始目录
- 在 archive 目录创建 `README.md` 说明归档已压缩

## Capabilities

### New Capabilities

- **统一类型声明**: `@prism/shared-types` 成为所有跨包类型的唯一来源
- **模块化 Store**: canvas store 按职责拆分为独立 slice 文件

### Modified Capabilities

- **Inspector 组件**: 从内联 style 改为 CSS Module
- **ParametersPanel 组件**: 从内联 style 改为 CSS Module

## Impact

- `@prism/shared-types`: 新增导出，破坏性：仅当其他包已自行定义相同类型时需要删除
- `apps/dev-tool/src/modules/editor/stores/`: 拆分后文件数增加，但单文件行数减少
- `apps/dev-tool/src/components/Inspector/`: CSS 提取不影响运行时行为
- `openspec/changes/archive/`: 删除 277+ 目录释放空间

## Out of Scope

- 不修改任何业务逻辑（workflow 执行、canvas 交互、API 调用）
- 不修改任何包之间的依赖关系
- 不创建新的 packages
- 不修改 server/prisma schema
- 不涉及 openspec 活跃 change 目录
- 不处理两套 `ApiStorageAdapter` / `IndexedDBStorageAdapter` 的合并（Phase 6 考虑）

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

由于本次变更仅涉及类型合并、CSS 提取、store 拆分，不涉及拓扑排序、节点级错误隔离、Cancellation、API 契约、Node Package 安全等维度，以下维度均不适用。

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | — |
| 节点级错误隔离 | 否 | — |
| Cancellation 完整性 | 否 | — |
| Canvas 状态一致性 | 部分 | store 拆分后状态机行为保持一致，通过 `pnpm test --filter=@prism/dev-tool --run` 验证 |
| Node Registry 不变量 | 否 | — |
| API 契约稳定性 | 否 | — |
| Node Package 安全 | 否 | — |
| 交互完整性 | 是 | CSS 提取后 UI 视觉检查（manual optional） |

### 验收要求

- [ ] 所有 phase 的验证命令已执行且通过
- [ ] store 拆分后 dev-tool 应用可正常启动（dev server 不报错）
- [ ] CSS 提取后 Inspector 和 ParametersPanel 样式无肉眼可见变化

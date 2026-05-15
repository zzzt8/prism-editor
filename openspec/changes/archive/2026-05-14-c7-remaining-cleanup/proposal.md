---
name: c7-remaining-cleanup
change_class: medium
change_profile: medium
reason: "整合 C5 未完成的质量合规验收 + C6 未完成的 console.log 清理工作"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c7-remaining-cleanup`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] C5 和 C6 全部未完成部分提取为新 change 后，删除 C5/C6
  - [ ] 不要给 apply 太重的指令（tasks 保持轻量）
  - → 这些约束**必须**写入 Out of Scope

## Why

C5（测试覆盖）的 6 个 code tasks 已完成，但质量合规验收（N.3~N.5）和验收清单均未勾选。C6（UX 清理）的全部 6 个 console.log 清理 tasks 和 dev-tool 验收均未实施。此外扫描发现 C6 原始 scope 未覆盖的 4 个文件也存在 console.log。

QUALITY_STANDARDS.md 更新后，N.5.1 lint 检查和 N.5.2 覆盖率门槛也需要重新确认。

## What Changes

1. **console.log 清理**（来自 C6 全部 tasks + 新发现）：
   - `workflowCatalogStore.ts`
   - `WorkflowRunPage.tsx`
   - `InputSection/index.tsx`
   - `selectedWorkflowStore.ts`（新发现）
   - `IndexedDBStorageAdapter.ts`（新发现）
   - `WorkflowListPage.tsx`（新发现）
   - `PublishDialog.tsx`（新发现）
2. **dev-tool 全局验收**：确认无残留 `console.log`
3. **质量合规验收**（N.3~N.5）：CI 内容、lint、覆盖率、交互完整性、`as any` 检查

## Capabilities

### Modified Capabilities

- **User-App Console**: 浏览器控制台无调试输出
- **CI Pipeline**: 质量合规验收完整

## Impact

- `apps/user-app/src/modules/catalog/workflowCatalogStore.ts`
- `apps/user-app/src/modules/selection/selectedWorkflowStore.ts`
- `apps/user-app/src/storage/IndexedDBStorageAdapter.ts`
- `apps/user-app/src/pages/WorkflowListPage.tsx`
- `apps/user-app/src/pages/WorkflowRunPage.tsx`
- `apps/user-app/src/components/InputSection/index.tsx`
- `apps/dev-tool/src/components/header/PublishDialog.tsx`
- `.github/workflows/ci.yml`
- 所有包的 `vitest.config.ts`

## Out of Scope

- `console.warn` / `console.error`（有效错误输出，保留）
- 完整版本历史/对比/回滚实现
- MAX_ATTEMPTS 可配置（已移至 C3）
- 新增测试文件（本 change 只清理，不增加测试覆盖）
- `pnpm lint` 修复（本 change 不做，仅检查）
- CI 覆盖率门槛调整（本 change 不做，仅验证）

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | — |
| 节点级错误隔离 | 否 | — |
| Cancellation 完整性 | 否 | — |
| Canvas 状态一致性 | 否 | — |
| Node Registry 不变量 | 否 | — |
| API 契约稳定性 | 否 | — |
| Node Package 安全 | 否 | — |
| 交互完整性 | 是 | 手工验收 |

### 验收要求

- [ ] 本需求已覆盖所有涉及的质量检查维度
- [ ] 无 `onClick={() => {}}` 占位交互（C6 T4 已有实现）
- [ ] 所有 console.log 清理完毕

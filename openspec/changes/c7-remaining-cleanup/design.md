## Context

C5 的 code tasks（T1~T6）已全部完成，但质量合规验收未做。C6 的全 task（T1~T6）均未实施，且扫描发现原始 scope 未覆盖的 4 个文件也存在 console.log 输出。

## Goals / Non-Goals

**Goals:**
- 清除所有 `console.log` 调试输出（apps/ 目录）
- 完成 C5 的质量合规验收（N.3~N.5）
- 完成 C6 的交互完整性验收

**Non-Goals:**
- 不修复 lint 错误（仅检查）
- 不调整 CI 覆盖率门槛
- 不新增测试文件
- 不实现版本历史功能
- 不修改 `console.warn` / `console.error`

## Decisions

### 1: console.log 清除范围

只删除 `console.log`，保留 `console.warn` 和 `console.error`。涉及 7 个文件：
- `apps/user-app/src/modules/catalog/workflowCatalogStore.ts`
- `apps/user-app/src/modules/selection/selectedWorkflowStore.ts`
- `apps/user-app/src/storage/IndexedDBStorageAdapter.ts`
- `apps/user-app/src/pages/WorkflowListPage.tsx`
- `apps/user-app/src/pages/WorkflowRunPage.tsx`
- `apps/user-app/src/components/InputSection/index.tsx`
- `apps/dev-tool/src/components/header/PublishDialog.tsx`

验收：`grep -r "console\.log" apps/` 无输出。

### 2: 质量合规验收策略

选择性应用 QUALITY_STANDARDS.md 模板：
- **N.3**：CI 内容验证（仅验证，不改文件）
- **N.4**：交互完整性（C6 T4 已完成 alert 实现）
- **N.5**：lint 检查 + `as any` 检查（仅检查，不修复）

### 3: App.tsx 版本按钮状态确认

C6 T4 要求三个版本按钮改为 alert，但 grep 结果显示当前代码库中无 `alert('` 模式。需在 apply 阶段确认 App.tsx 当前状态后决定是改 alert 还是删除按钮。

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 误删有效 console 输出 | 低 | 调试信息丢失 | 只删 `console.log`，保留 warn/error |
| lint 检查失败 | 高 | CI 可能不通过 | 仅记录结果，不修复，由 owner 决定 |
| App.tsx 按钮状态不一致 | 低 | T4 无法验收 | 运行时确认，必要时改为 alert 或删除按钮 |

---

## Architecture Review（简化版，medium）

### 目标

清除调试代码 + 完成质量合规验收。

### 约束

- 不改 lint 错误
- 不新增测试
- 不改 CI 配置

### 决策

直接执行 console.log 清除 + 选择性合规验收。无需候选方案对比。

### 回退方案

`git checkout` 对应文件。

---

## Review Checklist（简化版，medium）

- [ ] 方案是否覆盖主要目标？
- [ ] 回退路径是否清晰？
- [ ] 影响是否可控（仅删除调试代码，无业务逻辑变更）？

---

## 质量合规性

本设计遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 执行完整性覆盖

- 拓扑排序：不涉及
- 节点级错误隔离：不涉及
- Cancellation 链路：不涉及

### 不变量检查

- Node Registry：不涉及
- API 契约：不涉及

### 测试策略

- [ ] 单元测试：无需（本 change 只清理代码，无新逻辑）
- [ ] 集成测试：无需
- [ ] 手工验收：console.log 清理验证 + 交互完整性验证

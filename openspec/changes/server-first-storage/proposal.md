---
name: server-first-storage
change_class: high
change_profile: high
reason: "彻底解决 IndexedDB 单机存储导致的跨设备数据丢失和发布流程断裂问题，需要同时改动 backend / editor / runtime 三层"
---

## Task Anchor Echo

- **原始任务**: 解决 IndexedDB 导致的存储边界问题，让 server 成为唯一事实来源，user-app 不再依赖导入 JSON
- **change 名称**: `server-first-storage`
- **change 名称是否服务于原始任务**: 是

## Why

当前 Prism Editor 的存储架构存在严重问题：

1. **dev-tool 草稿以 IndexedDB 为主源**: Save 操作写入 IndexedDB，不写 server。换设备或清浏览器数据后所有草稿丢失。
2. **已发布工作流发布后不生效**: dev-tool 发布时写 IndexedDB (`prism-editor-published`)，user-app 读取 server API 列表，两个存储完全隔离。开发者发布后，用户看不到，必须手动导出 JSON 再导入。
3. **API 设计不完整**: `GET /api/published/:id` 只返回 metadata（id、name、publishedBy 等），不返回 `content` 字段，导致 user-app 的 `selectWorkflow` 不得不重新拉取整个列表来找一条记录。
4. **user-app rename/delete 是空操作**: UI 上有删除和重命名按钮，但 server API 不支持，调用后无任何效果。

这些问题在单人开发场景下不明显，但在团队协作或多设备使用时是阻断性问题。

## What Changes

1. **dev-tool 存储层重构**: `activeStorageAdapter` 从 `IndexedDBStorageAdapter` 切换为 `ApiStorageAdapter`，Save/New/Publish 操作全部走 server。IndexedDB 降为 autosave 崩溃恢复缓存。
2. **user-app 详情加载优化**: `selectWorkflow` 不再拉取整个列表，改为直接调用 `GET /api/published/:id` 获取完整 content。
3. **server API 补充**: `GET /api/published/:id` 增加返回 `content` 字段；新增 `PATCH /api/published/:id` 支持重命名。
4. **user-app UI 简化**: 删除 Import 按钮、Ctrl+V 粘贴导入逻辑，使 UI 与实际能力对齐。

## Capabilities

### New Capabilities

- **workflow-server-sync**: dev-tool 的工作流草稿实时同步到 server，换设备后仍可访问。格式：`<name>`: dev-tool Save 后自动持久化到 server，IndexedDB 作为本地缓存。

### Modified Capabilities

- **published-workflow-execution**: user-app 的工作流详情加载从"列表拉取 → 遍历查找"简化为"直接查询"。对用户无感知，但显著减少网络请求量。
- **workflow-management**: user-app 获得 rename/delete 能力（通过新增的 PATCH/DELETE 端点）。

## Impact

- **backend**: `server/src/routes/published.ts` — 新增 PATCH 端点，GET 端点增加 content 返回
- **editor**: `apps/dev-tool/src/storage/index.ts` — `activeStorageAdapter` 切换为 `ApiStorageAdapter`
- **editor**: `apps/dev-tool/src/modules/repositories/workflowRepository.ts` — 现有实现复用
- **runtime**: `apps/user-app/src/store/workflowCatalogStore.ts` — `selectWorkflow` 重写
- **runtime**: `apps/user-app/src/pages/WorkflowListPage.tsx` — 删除 Import/粘贴逻辑
- **runtime**: `apps/user-app/src/pages/WorkflowRunPage.tsx` — rename/delete 按钮绑定 API

## Out of Scope

- node package manifest 的 localStorage 缓存保持不变（合理且正确）
- dev-tool 的 autosave 逻辑保持不变（仍走 IndexedDB）
- server 的 Prisma schema 保持不变（`PublishedWorkflow` 已有 `content` 字段）
- snippet（画布片段）存储保持 IndexedDB（个人数据，不需要 server 同步）
- template 存储保持 IndexedDB（个人数据，不需要 server 同步）

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

<!-- 按实际涉及的维度勾选并填写 -->

|| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | — |
| 节点级错误隔离 | 否 | — |
| Cancellation 完整性 | 否 | — |
| Canvas 状态一致性 | 是 | 代码审查 + 手工验收 |
| Node Registry 不变量 | 否 | — |
| API 契约稳定性 | 是 | API 测试 + 向后兼容验证 |
| Node Package 安全 | 否 | — |
| 交互完整性 | 是 | 手工验收 |

### 验收要求

- [ ] dev-tool Save 后 server 有对应记录（可通过 API 验证）
- [ ] user-app 打开工作流详情时 network 只发起 1 次请求（不是 2 次）
- [ ] user-app rename 后列表名称更新
- [ ] user-app delete 后列表消失
- [ ] `pnpm build:dev-tool` 通过
- [ ] `pnpm build:user-app` 通过
- [ ] `pnpm --filter=@prism/server build` 通过

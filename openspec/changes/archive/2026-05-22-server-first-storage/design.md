## Context

当前 storage 架构存在根本性问题：dev-tool 以 IndexedDB 为主源，user-app 从 server API 读取，两套存储没有同步机制。这导致发布流程断裂、跨设备数据丢失、详情加载效率低下。

## Goals / Non-Goals

**Goals:**
- dev-tool 的 Save/New 操作持久化到 server，成为唯一事实来源
- user-app 工作流详情加载直接查询（1 次请求），不依赖列表拉取
- user-app 支持 rename 和 delete 操作
- IndexedDB 在 dev-tool 中降为 autosave 崩溃恢复缓存，不作为主存储
- 删除 user-app 中误导性的 Import UI（server-first 后不再需要）

**Non-Goals:**
- 不改变 node package manifest 的 localStorage 缓存策略
- 不改变 autosave 逻辑（dev-tool 仍用 autosaveService）
- 不修改 Prisma schema（`content` 字段已存在）
- 不涉及 snippet 和 template 的 server 同步（属于个人数据）
- 不实现 offline-first（那是未来方向的讨论范畴）

## Decisions

### D1: dev-tool 使用 ApiStorageAdapter 作为主存储

**决策**: 将 `storage/index.ts` 中的 `activeStorageAdapter` 从 `IndexedDBStorageAdapter` 切换为 `ApiStorageAdapter`。

**理由**: 
- server 已完整实现所有 CRUD 操作（`POST /api/workflows`, `PUT /api/workflows/:id`, `DELETE /api/workflows/:id`, `GET /api/workflows`）
- IndexedDB 中的现有数据通过 migrate-from-localStorage 逻辑已处理过
- 开发者身份由 JWT 保证，可直接使用 auth-required 的工作流端点
- autosave 仍使用 IndexedDB（写本地缓存），不影响 autosave 体验

**取舍**: dev-tool 在无网络时无法保存。但这在开发阶段是可以接受的约束——dev-tool 本质是开发工具，网络可用性有保障。生产环境的 offline-first 是独立话题。

### D2: IndexedDB 作为 autosave 缓存保留

**决策**: 不删除 IndexedDB 写入路径，而是将 autosave 目标从"主存储"降为"崩溃恢复缓存"。

**理由**:
- autosave 的价值在于防止意外关闭标签页导致的工作丢失
- 改为纯 server 保存后，autosave 5min 触发时仍写入 IndexedDB
- 若 server 不可达，autosave 失败不阻断用户操作（autosave 本就是"尽力而为"）
- 崩溃恢复流程：用户重开页面时，检测 IndexedDB 有新数据但 server 无对应记录，提示用户恢复

**取舍**: 本方案不实现完整的冲突解决。若 server 保存成功但 IndexedDB 写入失败（概率极低），IndexedDB 中会是旧数据。重启后用户会看到"你有一份未同步的草稿"提示，可以选择恢复或丢弃。

### D3: user-app 详情加载走专用端点

**决策**: `selectWorkflow` 从 `GET /api/published?limit=100` 改为 `GET /api/published/:id`。

**理由**:
- 当前端点返回的 metadata 包含 `content`（通过 `workflow.content` 关联），只需扩展即可
- 避免重新获取 100 条记录的列表（即使只取第一条）
- 端点幂等，语义清晰

**取舍**: 需要 server 端支持返回完整 content（当前不返回）。这不是问题，是本次改动的一部分。

### D4: user-app 删除 Import 功能

**决策**: 移除 Import 按钮和 Ctrl+V 粘贴导入逻辑。

**理由**:
- server-first 后，所有已发布工作流都从 server 展示
- Import 功能在 server-first 模式下是误导性的：用户以为导入了数据，实际上 server 已经有了
- 导入 JSON 只用于分享场景（导出 JSON → 分享文件 → 对方导入），而不是"获取已发布工作流"的方式

**取舍**: 如果 developer 没有发布，user 无法通过 Import 获取（Import 走的是 `IndexedDB`，不是 server）。这与 server-first 架构一致。

### D5: user-app rename/delete 通过 PATCH/DELETE 实现

**决策**: 新增 `PATCH /api/published/:id` 支持重命名，新增 `DELETE /api/published/:id`（已存在，验证实现）支持删除。

**理由**:
- 当前 server 只有 GET /published（列表和详情）和 POST /published（发布），无修改能力
- rename 只需要更新 `Workflow.name`（PublishedWorkflow 不直接存储 name）
- delete 需要验证 ownership（只有发布者或 admin 可删除）

**取舍**: 没有实现批量删除、批量重命名等高级功能。MVP 阶段单条操作够用。

## Risks / Trade-offs

### R1: dev-tool 无网络时无法保存

**风险等级**: Medium

dev-tool 切换到 server-first 后，在断网环境下 Save 操作会失败。当前没有 offline indicator。

**缓解**: autosave 仍在本地写入 IndexedDB，网络恢复后下次 Save 会同步。添加网络状态 indicator 提示用户。

### R2: IndexedDB 缓存与 server 数据不一致

**风险等级**: Low

autosave 和 Save 并行写 IndexedDB 和 server，理论上可能出现短暂不一致。

**缓解**: Save 是同步的（先 server 再 IndexedDB），autosave 是 5min 后的异步操作。如果 autosave 的 IndexedDB 数据比 server 新，用户重启后会收到"发现未同步草稿"的提示。

### R3: 现有 IndexedDB 数据迁移

**风险等级**: Low

dev-tool 中已有大量草稿存在 IndexedDB，切换主存储后这些数据需要能够访问。

**缓解**: `ApiStorageAdapter.load(id)` 在 server 返回 404 时，不报错而是提示用户"该草稿尚未同步到服务器"。用户可选择导出 JSON。

### R4: JWT 过期导致保存失败

**风险等级**: Medium

Save 操作需要 auth，JWT 过期后请求会 401。

**缓解**: 在 `ApiStorageAdapter` 的 save/load 方法中捕获 401，提示用户重新登录。或者实现 token 自动刷新（`refreshToken` 机制已存在）。

---

## Architecture Review

### 目标

将 dev-tool 和 user-app 的存储策略统一为 server-first：
- dev-tool: Save 操作写 server，IndexedDB 作为 autosave 崩溃缓存
- user-app: 所有数据从 server 获取，删除误导性的 Import UI

### 约束

- 技术约束: server API 已有 `PUT /api/workflows/:id`，只需扩展 `GET /api/published/:id` 返回 content
- 时间约束: 纯后端改动不影响 workflow-core
- 不变量: 已发布的工作流 JSON 格式不变（向后兼容）

### 候选方案

#### 方案 A: 双写 + IndexedDB 优先（当前状态）

```
Save → IndexedDB (主) + server (可选)
Load ← IndexedDB
```

**Pros**: 完全离线可用
**Cons**: 跨设备不同步，发布流程断裂

#### 方案 B: 双写 + server 优先（本次采用）

```
Save → server (主) → IndexedDB (缓存)
Load ← server → IndexedDB (fallback)
```

**Pros**: 跨设备同步，架构清晰
**Cons**: 无网络时无法保存（但 autosave 本地保底）

#### 方案 C: 纯 server（激进）

```
Save → server
Load ← server
IndexedDB → 完全删除
```

**Pros**: 最简洁
**Cons**: 无网络时无法保存，且 autosave 价值丧失（无本地缓存）

### 决策

选择方案 B：server 为主，IndexedDB 为缓存。这在可用性和数据一致性之间取得平衡。

### 回滚方案

若 server-first 迁移后出现问题（JWT 过期频繁、网络不稳定），可通过环境变量回退到 IndexedDB-first：

```ts
const primaryStorage = process.env.STORAGE_STRATEGY === 'indexeddb' 
  ? indexedDbAdapter 
  : apiAdapter;
```

---

## Review Checklist

### 完整版（high）

- [x] 方案是否覆盖 proposal 中所有 goal？
- [x] 是否存在更简单的替代方案？ — 方案 C（纯 server）更简单但牺牲 autosave 价值，方案 B 平衡性更好
- [x] 最坏情况回退路径是什么？ — IndexedDB 缓存保底，环境变量可回退
- [x] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED？ — 无
- [x] Layer 间是否有隐式依赖？ — 无，backend → editor → runtime 是单向依赖链

### 简化版（medium）

N/A（本次是 high）

### 轻量版（low）

N/A（本次是 high）

---

## 质量合规性

本设计遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序：不涉及
- 节点级错误隔离：不涉及
- Cancellation 链路：不涉及

### 不变量检查

- Node Registry：不涉及
- API 契约：涉及。`GET /api/published/:id` 扩展返回 content（向后兼容），新增 `PATCH /api/published/:id`（不影响现有端点）

### 测试策略

- [ ] 单元测试：ApiStorageAdapter 方法测试
- [ ] API 集成测试：验证 PATCH/DELETE 端点
- [ ] 手工验收：dev-tool Save 走 server、user-app 详情加载走单端点

---

## 质量合规性

### 执行完整性覆盖

- 拓扑排序：不涉及（engine 层无改动）
- 节点级错误隔离：不涉及
- Cancellation 链路：不涉及

### 不变量检查

- Node Registry：不变
- API 契约：`GET /api/published/:id` 返回格式扩展（新增 `content` 字段），向后兼容

### 测试策略

- [ ] API 端点测试：验证 PATCH 返回 200 + content 字段存在
- [ ] 手工验收：dev-tool Save 后 `GET /api/workflows/:id` 有记录
- [ ] 手工验收：user-app 打开详情时 Network tab 只有 1 次请求

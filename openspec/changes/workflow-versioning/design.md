## Context

服务端存储（`backend-storage-migration`）已实现工作流 CRUD，但没有版本历史。每次保存直接覆盖数据库中的内容，无法追踪修改。

用户需求：
- 保存前一个版本，出问题时能回滚
- 多人协作时能看到"谁在什么时间改了什么"
- 发布前能对比版本差异

## Goals / Non-Goals

**Goals:**
- 每次保存自动创建版本快照
- 支持查看版本历史列表
- 支持回滚到任意历史版本
- 支持两个版本的差异对比

**Non-Goals:**
- 不实现多人实时协作编辑
- 不实现分支/合并
- 不实现评论/审批流程
- 不实现自动版本号（手动指定版本号）

## Decisions

### 决策 1: 版本存储策略

**选择**: 每次 `save()` 创建新版本，旧版本全部保留

**理由**:
- 简单：不需要 diff-based 存储
- 可靠：任何版本都可恢复
- 符合 Prisma 的追加写入模式

**版本数据模型**:
```prisma
model WorkflowVersion {
  id          String   @id @default(cuid())
  workflowId  String
  workflow    Workflow @relation(...)
  version     String   // 语义化版本，如 "1.0.0"
  content     String   // 完整 workflow JSON
  createdAt   DateTime @default(now())
  createdBy   String?
}
```

**替代方案**:
- Diff-based 存储：节省空间但实现复杂，恢复需要重放
- 限制版本数量：不符合用户需求

---

### 决策 2: 版本比较算法

**选择**: 使用 `json-diff` 或自定义递归对比

**理由**:
- Workflow JSON 结构已知（nodes, connections, meta）
- 可以精确指出哪个节点/连线变了
- 前端可以高亮显示

**工具文档**:
- json-diff: https://github.com/andreyvit/json-diff
- deep-diff: https://github.com/flitbit/diff

---

### 决策 3: 回滚策略

**选择**: 回滚创建新版本（不删除历史）

**理由**:
- 保留所有历史，可追溯
- 实现简单
- 回滚本身也是一种修改，应该被记录

---

### 决策 4: 自动版本号

**选择**: 不自动生成版本号，用户手动指定

**理由**:
- 自动版本号语义不清（patch vs minor vs major）
- 用户更清楚什么算"大版本"
- 简化实现

---

## API Design

| Method | Path | Description |
|---|---|---|
| GET | `/api/workflows/:id/versions` | 列表版本历史 |
| GET | `/api/workflows/:id/versions/:versionId` | 获取特定版本内容 |
| POST | `/api/workflows/:id/rollback` | 回滚到指定版本 |
| GET | `/api/workflows/:id/diff` | 对比两个版本 |

## Project Structure

```
server/
├── src/routes/
│   └── versions.ts        # 新增
apps/dev-tool/
├── src/components/
│   └── VersionHistory/    # 新增：版本历史面板
│       ├── VersionList.tsx
│       ├── VersionDiff.tsx
│       └── RollbackConfirm.tsx
```

## Migration Plan

### Phase 1: 服务端版本存储 (Week 1)
1. 添加 `WorkflowVersion` model 到 Prisma schema
2. 修改 `save()` 路由：每次保存创建新版本
3. 实现版本列表 API
4. 测试版本创建

### Phase 2: 版本回滚 (Week 2)
1. 实现回滚 API
2. 前端版本历史面板 UI
3. 回滚确认对话框
4. 测试回滚流程

### Phase 3: 版本对比 (Week 2)
1. 实现 diff API
2. 前端 diff 展示（高亮变化）
3. 测试 diff 准确性

## Risks / Trade-offs

[Risk] 版本过多导致数据库膨胀
→ Mitigation: 设置最大版本数限制（如 100 个），超出时自动合并旧版本

[Risk] 大型 workflow JSON 多次存储
→ Mitigation: 考虑使用 PostgreSQL JSONB + diff；或设置合理存储限制

## Open Questions

1. **是否限制最大版本数？** 建议 100 个，超出后提示用户或自动归档。
2. **是否支持导出特定版本？** 后续可加。
3. **版本历史是否占用存储配额？** 后续需要设计存储计费。

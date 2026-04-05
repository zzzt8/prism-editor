# C6: 版本号归服务端

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. 版本号生成规则

**服务端生成语义化版本**：
- `major.minor.patch` 格式
- minor + 1，patch = 0（默认递增 minor）
- 可指定 major 递增

**前端只提交**：
```typescript
{
  content: WorkflowJSON,
  baseRevision: string // 当前版本 ID，用于冲突检测
}
```

## 2. API 契约变更

```typescript
// POST /api/workflows/:id/versions
interface CreateVersionRequest {
  content: string; // Workflow JSON
  baseRevision?: string;
}

// Response
interface CreateVersionResponse {
  version: WorkflowVersion;
  workflow: Workflow; // 更新后的 workflow
}
```

## 3. 回滚契约

```typescript
// POST /api/workflows/:id/rollback
interface RollbackRequest {
  versionId: string;
}
```

返回新的 WorkflowVersion + 更新后的 Workflow。

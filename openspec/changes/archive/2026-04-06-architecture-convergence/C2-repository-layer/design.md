# C2: Repository 层引入

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. Repository 接口定义

### 1.1 IWorkflowRepository

```typescript
export interface IWorkflowRepository {
  // CRUD
  list(): Promise<WorkflowMeta[]>;
  get(id: string): Promise<Workflow>;
  save(workflow: Workflow): Promise<void>;
  delete(id: string): Promise<void>;
  // 迁移阶段保留
  exists(id: string): Promise<boolean>;
}
```

### 1.2 IVersionRepository

```typescript
export interface IVersionRepository {
  list(workflowId: string): Promise<WorkflowVersion[]>;
  get(workflowId: string, versionId: string): Promise<WorkflowVersion>;
  create(workflowId: string, content: Workflow): Promise<WorkflowVersion>;
  rollback(workflowId: string, versionId: string): Promise<Workflow>;
}
```

### 1.3 IPublishRepository

```typescript
export interface IPublishRepository {
  publish(workflowId: string, published: PublishedWorkflow): Promise<void>;
  unpublish(workflowId: string): Promise<void>;
  getPublished(sourceId: string): Promise<PublishedWorkflow | null>;
  listPublished(): Promise<PublishedWorkflowMeta[]>;
}
```

## 2. 实现策略

### Phase 1（无行为改变迁移）

```typescript
// apps/dev-tool/src/modules/repositories/workflowRepository.ts
export class WorkflowRepository implements IWorkflowRepository {
  constructor(private adapter: StorageAdapter = activeStorageAdapter) {}
  
  async save(workflow: Workflow): Promise<void> {
    await this.adapter.save(workflow);
  }
}
```

Repository 内部包现有 `activeStorageAdapter` / `indexedDBStorageAdapter`，对外接口不变。

### Phase 2（切换 API）

```typescript
// 只需替换构造函数的 adapter
export class WorkflowRepository implements IWorkflowRepository {
  constructor(private adapter: StorageAdapter = activeStorageAdapter) {}
  // adapter 实现换成 ApiStorageAdapter 即可
}
```

## 3. 禁止事项

- **禁止**在 store 中直接调用 storage adapter
- **禁止**在 repository 中处理 UI 状态（如 isDirty）

## 4. 异常处理

| 场景 | 处理 |
|------|------|
| workflow 不存在 | 抛 NotFoundError |
| save 失败 | 捕获后 set({ error })，不抛到 UI 顶层 |

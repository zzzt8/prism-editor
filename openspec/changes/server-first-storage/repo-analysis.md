## 影响层（Impact Map）

|| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| backend | `server/src/routes/published.ts` | 新增 PATCH 端点，扩展 GET 端点返回 content |
| editor | `apps/dev-tool/src/storage/index.ts`, `IndexedDBStorageAdapter.ts`, `ApiStorageAdapter.ts`, `workflowRepository.ts` | 主存储从 IndexedDB 切换为 API-first |
| runtime | `apps/user-app/src/store/workflowCatalogStore.ts`, `storage/index.ts`, `WorkflowRunPage.tsx` | 详情加载绕过列表拉取，直接调用 API |
| ui-skin | `apps/user-app/src/pages/WorkflowListPage.tsx` | 删除 Import 按钮和相关逻辑 |
| engine | (无直接改动) | — |

## 相关目录

```
affected/
├── server/src/routes/
│   └── published.ts              # 新增 PATCH，重写 GET 返回 content
├── apps/dev-tool/src/
│   ├── storage/
│   │   ├── index.ts              # 改为始终使用 ApiStorageAdapter
│   │   ├── IndexedDBStorageAdapter.ts  # 降为 autosave 缓存
│   │   └── ApiStorageAdapter.ts  # 补全缺失方法
│   └── modules/repositories/
│       └── workflowRepository.ts # 指向 adapter
├── apps/user-app/src/
│   ├── store/
│   │   └── workflowCatalogStore.ts  # selectWorkflow 改为直接调用 API
│   ├── storage/
│   │   └── index.ts              # 删除 ApiStorageAdapter 引用（如有）
│   ├── pages/
│   │   ├── WorkflowListPage.tsx  # 删除 Import 按钮和 Ctrl+V
│   │   └── WorkflowRunPage.tsx   # 重命名/删除按钮绑定 API
│   └── modules/repositories/
│       └── publishedWorkflowRepository.ts
└── packages/
    └── shared-ui/src/            # 无改动
```

## 关键模块

### 模块 1: `dev-tool/storage` 存储适配层

- **位置**: `apps/dev-tool/src/storage/`
- **职责**: 为 canvasStore 提供统一的数据持久化接口，屏蔽底层存储差异
- **数据流**:

  ```
  Before (dev-mode):
    canvasStore → activeStorageAdapter(IndexedDB) → IndexedDB
    autosaveService → indexedDbAdapter → IndexedDB
  
  After (dev-mode):
    canvasStore → activeStorageAdapter(ApiStorageAdapter) → server
    autosaveService → indexedDbAdapter → IndexedDB (仅崩溃恢复缓存)
  ```

- **调用链**: `useCanvasStore.saveWorkflow()` → `workflowRepository.save()` → `adapter.save()` → `PUT /api/workflows/:id`

### 模块 2: `user-app/store/workflowCatalogStore` 工作流目录 Store

- **位置**: `apps/user-app/src/store/workflowCatalogStore.ts`
- **职责**: 管理已发布工作流列表的加载、选择、删除和重命名
- **数据流**:

  ```
  Before:
    App.tsx hash 变化 → selectWorkflow(id)
    → fetch(GET /api/published?limit=100) → 遍历找 id
  
  After:
    App.tsx hash 变化 → selectWorkflow(id)
    → fetch(GET /api/published/:id) → 直接拿到完整 content
  ```

- **调用链**: `selectWorkflow(sourceId)` → `fetch(GET /api/published/:id)` → `loadRequiredNodes()` → canvasStore

### 模块 3: `server/routes/published` 已发布工作流路由

- **位置**: `server/src/routes/published.ts`
- **职责**: 公开已发布工作流的 CRUD 操作
- **调用链**: Fastify plugin → Prisma ORM → SQLite

### 模块 4: `user-app/pages/WorkflowListPage` 工作流列表页

- **位置**: `apps/user-app/src/pages/WorkflowListPage.tsx`
- **职责**: 展示工作流列表，提供搜索、排序、删除、重命名、导入功能
- **问题**: Import 按钮在 server-first 模式下不再有意义；Ctrl+V 粘贴导入也应删除

## 复用点

- 现有 `ApiStorageAdapter` (`apps/dev-tool/src/storage/ApiStorageAdapter.ts`) 已有 `save()`, `load()`, `list()` 实现，可复用
- 现有 `workflowCatalogStore.ts` 的 server fetch 逻辑可复用（只需修改 `selectWorkflow`）
- 现有 `PublishedWorkflowRepository` 的 API 调用逻辑可参考
- user-app 的 `API_BASE` 常量和 `fetchWithAuth()` 工具已存在

## 现有问题

1. **跨设备数据丢失**: dev-tool 草稿和版本历史全在 IndexedDB，换设备清零
2. **发布不生效**: dev-tool 发布后写 IndexedDB，user-app 无法感知（除非手动导入 JSON）
3. **无 content 的 API**: `GET /api/published/:id` 只返回 metadata，user-app 无法直接用于执行
4. **重命名/删除无效**: user-app 的 rename/delete 是 no-op，UI 有按钮但无功能
5. **重复拉取**: 详情加载重新获取整个列表（100条），而专用端点存在但只返回 metadata

## Impact Summary

本次 change 影响：

- **新增依赖**: 无新增外部依赖，使用现有 API 层
- **破坏性变更**: dev-tool 从 IndexedDB 切换到 server-first；user-app 删除 Import 功能
- **向后兼容**: 已有 `published.content` 字段未被使用，扩展返回格式不影响现有 API

## 数据流变化

```
[Before] — dev-tool Save 流程
┌──────────────────────────────────────────────────────────────┐
│ canvasStore.saveWorkflow()                                   │
│   → workflowRepository.save()                                │
│     → activeStorageAdapter.save() [=== IndexedDB ===]        │
│       → IndexedDB.openDB() → tx → store.put()               │
└──────────────────────────────────────────────────────────────┘

[After] — dev-tool Save 流程
┌──────────────────────────────────────────────────────────────┐
│ canvasStore.saveWorkflow()                                   │
│   → workflowRepository.save()                                │
│     → activeStorageAdapter.save() [=== API ===]              │
│       → PUT /api/workflows/:id { content: JSON, meta }     │
│     → indexedDbAdapter.save() [=== 本地缓存 ===]             │
│       (写入 IndexedDB，但不再作为主源)                       │
└──────────────────────────────────────────────────────────────┘

[Before] — user-app 详情加载
┌──────────────────────────────────────────────────────────────┐
│ App.tsx → selectWorkflow(id)                                 │
│   → fetch(GET /api/published?limit=100)  ← 拉取整个列表     │
│     → response.data[]                                         │
│       → find(wf => wf.workflowId === id || wf.id === id)   │
│         → parse JSON content                                 │
│           → loadRequiredNodes()                              │
│             → setState(selectedWorkflow)                     │
└──────────────────────────────────────────────────────────────┘

[After] — user-app 详情加载
┌──────────────────────────────────────────────────────────────┐
│ App.tsx → selectWorkflow(id)                                 │
│   → fetch(GET /api/published/:id)  ← 直接查单个             │
│     → response.content                                        │
│       → parse JSON                                           │
│         → loadRequiredNodes()                                │
│           → setState(selectedWorkflow)                       │
└──────────────────────────────────────────────────────────────┘
```

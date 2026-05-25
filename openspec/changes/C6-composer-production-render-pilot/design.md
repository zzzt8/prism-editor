# design: composer-production-render-pilot

## Goals

1. server 新增 SKU 级别生产渲染端点
2. workflow-core 支持 Node.js 执行模式
3. 最小前端集成（渲染结果预览入口）

## Non-Goals

- 完整 Composer SDK
- 异步渲染任务队列
- 素材管理（轻量/高清分离）
- 嵌入业务项目的接入文档

---

## Decisions

### D1: workflow-core 如何支持 Node.js 执行

**Decision**: 在 workflow-core 新增 `executeNodejs(workflow, inputs, params)` 函数，内部调用 `WorkflowExecutorNodeJs`。

**Rationale**: 保持 workflow-core 与执行环境解耦。Node.js 执行模式作为另一个实现，不影响现有的 browser 执行模式。

---

### D2: 渲染端点设计

```
POST /api/sku/:id/render
Body: {
  userParams: Record<string, unknown>,   // SKU inputSchema 对应的用户填入值
  workflowIds?: string[]                 // 可选：指定执行哪些 workflow，默认执行全部 backend
}
Response: {
  files: { name: string; url: string; mimeType: string; size: number }[],
  renderedAt: string
}
```

**Rationale**: SKU 级别的端点设计，接收用户参数，执行该 SKU 关联的所有 backend workflow，返回文件列表。URL 可为 OSS URL 或 server 本地文件路径。

---

### D3: 生产文件存储

**Decision**: 文件存储在 server 本地 `server/assets/renders/` 目录，URL 通过 `/api/assets/renders/:filename` 提供访问。

**Rationale**: 最简可行方案。后续可通过迁移到 OSS 获得更好的扩展性，本 change 专注渲染逻辑闭环。

---

### D4: WorkflowExecutorNodeJs 设计

```ts
// 复用现有 nodeExecutors registry，但使用 nodejs 端 executor
import { nodeExecutors as nodeJsExecutors } from '@prism/image-ops/nodejs';

const executor = new WorkflowExecutorNodeJs(nodeJsExecutors);
const result = await executor.execute(workflow, inputs, params);
```

**Rationale**: nodejs executor 通过 conditional exports 对外暴露，workflow-core 通过导入它来构建 Node.js executor 实例。

---

## Review Checklist

- [ ] `POST /api/sku/:id/render` 端点正常工作
- [ ] 渲染结果与前端 preview 一致（像素级 diff）
- [ ] `npm run typecheck --workspace=@prism/workflow-core` 无错误
- [ ] `npm run typecheck --workspace=@prism/server` 无错误
- [ ] 生产文件正确写入 `server/assets/renders/`
- [ ] dev-tool 或 user-app 可访问渲染结果

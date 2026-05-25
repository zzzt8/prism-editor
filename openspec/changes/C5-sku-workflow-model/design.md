# design: sku-workflow-model

## Goals

1. 定义 SKU 类型（packages/shared-types/src/sku.ts）
2. Prisma schema 新增 SKU model 和关联表
3. server 新增 SKU CRUD API

## Non-Goals

- SKU 管理 UI
- SKU 与 workflow 的联动逻辑
- 生产渲染接口

---

## Decisions

### D1: SKU 关联方式（N:M vs 1:N）

**Decision**: N:M（通过 `SKUWorkflow` 连接表）。

**Rationale**: 一个 SKU 关联多条 Workflow，一条 Workflow 也可能被多个 SKU 复用（将来可能有跨品类的 workflow 片段）。连接表提供最大灵活性。

---

### D2: inputSchema 和 outputSpec 的存储格式

**Decision**: 存储为 JSON 字段（Prisma `Json` 类型），TypeScript 类型定义为强类型接口。

```prisma
model SKU {
  inputSchema  String  @default("{}") // JSON
  outputSpec   String  @default("{}") // JSON
}
```

```ts
// packages/shared-types/src/sku.ts
export interface SKUInputSchema {
  fields: SKUInputField[];
}
export interface SKUInputField {
  id: string;
  label: string;
  type: 'string' | 'number' | 'select' | 'color' | 'image';
  options?: { label: string; value: unknown }[];
  default?: unknown;
}
```

**Rationale**: JSON 字段提供最大灵活性，允许品类搭建者自定义参数结构。TypeScript 接口用于 consumer 端的类型安全。

---

### D3: SKU API 设计

| Method | Path | 描述 |
|--------|------|------|
| POST | /api/skus | 创建 SKU |
| GET | /api/skus | 列表 SKU |
| GET | /api/skus/:id | 获取 SKU（含关联的 workflows） |
| PUT | /api/skus/:id | 更新 SKU |
| DELETE | /api/skus/:id | 删除 SKU |
| POST | /api/skus/:id/workflows | 关联 workflow |
| DELETE | /api/skus/:id/workflows/:workflowId | 解除关联 |

---

## Review Checklist

- [ ] `prisma generate` 成功
- [ ] `npm run typecheck --workspace=@prism/shared-types` 无错误
- [ ] `npm run typecheck --workspace=@prism/server` 无错误
- [ ] SKU CRUD 路由单元测试通过
- [ ] Prisma migration 生成成功

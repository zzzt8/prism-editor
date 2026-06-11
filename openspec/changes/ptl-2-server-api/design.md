# Design: ptl-2-server-api

## Goals

- server 端提供 ProductTemplate 的 CRUD 能力
- 保持和现有 `/published` API 风格一致（Fastify + Prisma）
- dev-tool 的 repository 改造为 server-first，不破坏本地 IndexedDB fallback

## Non-Goals

- 不实现 production flow 执行
- 不实现模板版本化

---

## Decisions

### 1. Prisma model 用 `content` JSON 列存储完整 ProductTemplate

和 `PublishedWorkflow` 一样，把完整的 JSON 存为 `content` 字段，避免 schema 膨胀。

### 2. server API 路由用 Fastify plugin 模式

参照 `server/src/routes/published.ts`，新增 `server/src/routes/product-template.ts`。

### 3. dev-tool repository 改为 server-first

```
请求顺序：
1. 尝试 GET /product-templates（server）
2. 成功 → 使用 server 数据
3. 失败（网络错误） → fallback 到 IndexedDB
```

这样离线场景仍然可用，联网后自动同步。

---

## Review Checklist

- [ ] Prisma model 是否避免与 Workflow / PublishedWorkflow 的模糊 ownership
- [ ] API 是否提供完整 CRUD
- [ ] 认证中间件是否正确应用到写操作
- [ ] dev-tool fallback 逻辑是否完整

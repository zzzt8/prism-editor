# design: nodejs-executor-sharp-pilot

## Goals

1. sharp 引入 `packages/image-ops/`，不进入 browser bundle
2. 实现 `composite`、`crop`、`export` 的 nodejs executor
3. server 新增最小渲染端点

## Non-Goals

- 其他节点的 nodejs executor
- workflow-core 调度接入
- 异步任务队列

---

## Decisions

### D1: sharp 如何引入（不污染 browser bundle）

**Decision**: 通过 webpack `externals` 配置，将 `sharp` 标记为 external。image-ops 的 Node.js 端入口文件（`nodejs/index.ts`）独立于 browser 入口（`index.ts`）。

```ts
// packages/image-ops/package.json 的 conditional exports
"exports": {
  ".": {
    "browser": "./src/index.ts",
    "node": "./src/nodejs/index.ts"
  }
}
```

**Rationale**: webpack 的 conditional exports 和 externals 配合，确保 sharp 和 Node.js 特有代码不会被打入 browser bundle。

---

### D2: Node.js executor 如何调用 core

**Decision**: nodejs executor 调用 `core/composite-math.ts` 的 `compositeImages` 纯函数。I/O 层用 sharp（Buffer ↔ ImageData 转换）。

```
sharp Buffer
  └─ sharp.raw() → Uint8Array → ImageData
       └─ compositeImages(base, overlay, opts) → ImageData
            └─ new Uint8Array(ImageData.data) → sharp.fromBuffer() → output Buffer
```

**Rationale**: core 层不变，I/O 层差异化。composite math 在 Node.js 端直接复用。

---

### D3: server 渲染端点设计

**Decision**:
```
POST /api/render/composite
Body: { baseBuffer: string(base64), overlayBuffer: string(base64), params: CompositeParams }
Response: { resultBuffer: string(base64), width: number, height: number }
```

**Rationale**: 最小可行端点，足够验证 composite nodejs executor 的端到端通路。Change 6 会扩展为 SKU 级别。

---

## Review Checklist

- [ ] `npm run typecheck --workspace=@prism/image-ops` 无错误
- [ ] `npm run typecheck --workspace=@prism/server` 无错误
- [ ] sharp 不在 dev-tool 的 browser bundle 中（通过 webpack bundle analyzer 验证）
- [ ] `/api/render/composite` 端点返回正确 base64 图像
- [ ] nodejs executor 像素结果与 browser executor 一致（像素级 diff 测试）

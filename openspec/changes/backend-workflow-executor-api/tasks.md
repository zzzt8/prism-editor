# Tasks

## 1. Node.js 执行器实现

### 1.1 LoadImage Executor (sharp)

```yaml
id: backend-executor-load-image
layer: packages/image-ops
verify: typecheck
```

- [x] 创建 `packages/image-ops/src/nodejs/load-image-executor.ts`
- [x] 实现：从 Buffer 加载图像，返回 `{ data: ImageData, width, height }`
- [x] 复用 `load-image.ts` 的图像解码逻辑
- [x] 验收：`pnpm typecheck` 通过

### 1.2 LoadMask Executor (sharp)

```yaml
id: backend-executor-load-mask
layer: packages/image-ops
verify: typecheck
```

- [x] 创建 `packages/image-ops/src/nodejs/load-mask-executor.ts`
- [x] 实现：从 Buffer 加载蒙版，提取 alpha/brightness/luminance
- [x] 复用 `load-mask.ts` 的逻辑
- [x] 验收：`pnpm typecheck` 通过

### 1.3 ApplyMask Executor (sharp)

```yaml
id: backend-executor-apply-mask
layer: packages/image-ops
verify: typecheck
```

- [x] 创建 `packages/image-ops/src/nodejs/apply-mask-executor.ts`
- [x] 实现 sharp 版本：使用 sharp 的 `composite` + 蒙版处理
- [x] 复用 `apply-mask.ts` 的 `applyAlphaMask` 等纯函数
- [x] 验收：`pnpm test packages/image-ops` 通过

### 1.4 Transform Executor (sharp)

```yaml
id: backend-executor-transform
layer: packages/image-ops
verify: typecheck
```

- [x] 创建 `packages/image-ops/src/nodejs/transform-executor.ts`
- [x] 实现：裁剪、缩放、旋转
- [x] 复用 `transform.ts` 的尺寸计算逻辑
- [x] 验收：`pnpm typecheck` 通过

### 1.5 更新 nodejs/index.ts

```yaml
id: backend-executor-index
layer: packages/image-ops
verify: typecheck
```

- [x] 在 `nodejs/index.ts` 中导出新增的 executor
- [x] 验收：`pnpm typecheck` 通过

---

## 2. Server API 端点

### 2.1 POST /api/render/workflow

```yaml
id: server-render-workflow
layer: server
verify: integration-test
```

- [x] 安装 `@fastify/multipart`
- [x] 创建 `server/src/routes/render.ts`
- [x] 实现端点：接收 workflow JSON + 图像文件，执行，返回结果
- [x] 错误处理：节点执行失败返回 400 + 错误信息
- [ ] 验收：curl 测试返回正确图像

```bash
# 测试命令
curl -X POST http://localhost:3001/api/render/workflow \
  -F "workflow=@workflow.json" \
  -F "images=@test.png" \
  -o output.png
```

### 2.2 POST /api/render/batch

```yaml
id: server-render-batch
layer: server
verify: integration-test
```

- [x] 实现批量处理：循环执行工作流
- [x] 使用 `archiver` 生成 ZIP
- [x] 限制批量大小：最多 100 张/批
- [ ] 验收：curl 测试返回 ZIP

```bash
# 测试命令
curl -X POST http://localhost:3001/api/render/batch \
  -F "workflow=@workflow.json" \
  -F "images=@test1.png" \
  -F "images=@test2.png" \
  -o results.zip
```

### 2.3 注册路由

```yaml
id: server-register-routes
layer: server
verify: typecheck
```

- [x] 在 `server/src/app.ts` 中注册新路由
- [x] 验收：`pnpm typecheck` 通过

---

## 3. 集成测试

### 3.1 像素一致性测试

```yaml
id: integration-pixel-test
layer: packages/image-ops
verify: test
```

- [ ] 对比前端 Canvas executor 和后端 sharp executor 的输出
- [ ] 使用 sample images 验证像素级一致性（允许误差 ±1）
- [ ] 验收：`pnpm test packages/image-ops` 通过

### 3.2 端到端测试

```yaml
id: integration-e2e-test
layer: server
verify: test
```

- [ ] 测试完整流程：上传图像 → 执行工作流 → 验证输出
- [ ] 测试 composite、apply-mask 等核心节点
- [ ] 验收：`pnpm test server` 通过

---

## 4. 文档

### 4.1 API 文档

```yaml
id: docs-api
layer: docs
verify: manual
```

- [ ] 更新 `server/README.md`，添加 `/api/render/*` 端点说明
- [ ] 添加使用示例

---

## 验收标准

1. `pnpm typecheck` 无错误
2. `pnpm test` 所有测试通过
3. API 端点可正常调用（手动 curl 测试）
4. 像素级一致性验证通过

# tasks: composer-production-render-pilot

---

- [x] **Task 1: workflow-core 新增 `WorkflowExecutorNodeJs` 类**

  ```yaml
  opsx-meta:
    id: task-1
    layer: pkg.workflow-core
    verify: |
      npm run typecheck --workspace=@prism/workflow-core
  ```

  - 在 `packages/workflow-core/src/` 新增 `executor-nodejs.ts`
  - 创建 `WorkflowExecutorNodeJs`，内部导入 `@prism/image-ops/nodejs`
  - 复用现有拓扑排序和执行逻辑，仅替换 executor
  - 验收：`npm run typecheck --workspace=@prism/workflow-core`

---

- [x] **Task 2: server 新增 `/api/sku/:id/render` 端点**

  ```yaml
  opsx-meta:
    id: task-2
    layer: app.server
    verify: |
      npm run typecheck --workspace=@prism/server
  ```

  - 在 `server/src/routes/` 新增 `sku-render.ts`
  - `POST /api/sku/:id/render`：接收 `{ userParams, workflowIds? }`
  - 根据 workflowIds 获取关联的 backend workflow，执行 `WorkflowExecutorNodeJs`
  - **assetId 解析**：server 根据 workflow 中的 `assetId` 字段查询对应的 production asset（高清素材）用于渲染
  - 验收：`npm run typecheck --workspace=@prism/server`

---

- [ ] **Task 3: 生产文件存储**

  ```yaml
  opsx-meta:
    id: task-3
    layer: app.server
    verify: |
      npm run typecheck --workspace=@prism/server
  ```

  - 文件写入 `server/assets/renders/:uuid.:format`
  - 返回 `{ files: [{ name, url, mimeType, size }] }`
  - 验收：`npm run typecheck --workspace=@prism/server`

---

- [ ] **Task 4: 端到端渲染测试**

  ```yaml
  opsx-meta:
    id: task-4
    layer: app.server
    verify: |
      npm run test --workspace=@prism/server -- --run --testPathPattern=sku-render
  ```

  - 创建测试 SKU，关联 backend workflow
  - 传入用户参数，调用 `/api/sku/:id/render`
  - 验证返回的 file.url 可访问且内容正确
  - 验收：`npm run test --workspace=@prism/server -- --run --testPathPattern=sku-render`

---

- [ ] **Task 5: 前端渲染结果预览入口（最小 UI）**

  ```yaml
  opsx-meta:
    id: task-5
    layer: app.dev-tool
    verify: |
      npm run typecheck --workspace=@prism/dev-tool
  ```

  - 在 dev-tool 的 Backend Workflow 编辑器中，在"预览"按钮旁增加"渲染生产图"按钮
  - 点击后调用 `/api/sku/:id/render`，展示返回的图片
  - 这是最小 UI 占位，不做完整 SDK
  - 验收：`npm run typecheck --workspace=@prism/dev-tool`

---

- [ ] **Task 6: 完整 typecheck 验证**

  ```yaml
  opsx-meta:
    id: task-6
    layer: pkg.workflow-core
    verify: |
      npm run typecheck --workspace=@prism/workflow-core && npm run typecheck --workspace=@prism/server && npm run typecheck --workspace=@prism/dev-tool
  ```

  - 验收：`npm run typecheck --workspace=@prism/workflow-core && npm run typecheck --workspace=@prism/server && npm run typecheck --workspace=@prism/dev-tool`

---

- [ ] **Task 7: 像素级一致性验证**

  ```yaml
  opsx-meta:
    id: task-7
    layer: pkg.image-ops
    verify: |
      npm run test -- packages/image-ops/src/nodejs/composite-executor.test.ts
  ```

  - 对比前端 preview 图像和后端生产图像（相同输入参数）
  - 像素级 diff 应为 0（高清素材下允许少量 rounding diff）
  - 验收：diff 测试通过

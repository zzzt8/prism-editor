# proposal: composer-production-render-pilot

**change_class: high**

reason: 在 server 实现完整的生产渲染闭环，接收 SKU 配置和用户参数，执行后端 Workflow，返回生产文件或下载链接。涉及 server 路由、workflow-core 接入 nodejs executor、以及文件存储。

---

## Why

所有前置 change 已就绪：
- Change 1：core 算法层 ✅
- Change 2：节点平台标记 ✅
- Change 3：dev-tool 平台选择 ✅
- Change 4：nodejs executor ✅
- Change 5：SKU 数据模型 ✅

Change 6 将这些串起来，实现 Composer Platform 的生产渲染闭环。

---

## What Changes

1. server 新增 `POST /api/sku/:id/render`：接收 `{ userParams: Record<string, unknown>, workflowIds: string[] }`，执行关联的后端 Workflow，返回生产文件
2. workflow-core 接入 nodejs executor：创建 `WorkflowExecutorNodeJs` 类，调用 `packages/image-ops/nodejs/` 的 executor
3. 生产文件存储：上传到 OSS 或保存在 server 本地，返回下载 URL
4. 最小前端集成：在 dev-tool 的 Backend Workflow 编辑器添加"渲染生产图"按钮，调用 `/api/sku/:id/render` 并展示结果

### Integration Protocol（最小 runtime contract）

本 change 定义和验证以下最小 integration protocol：

```
前端 / 业务项目
  │  POST /api/skus/:id
  │  ← SKU config + inputSchema + outputSpec
  │
  │  POST /api/skus/:id/render
  │  Body: { userParams: {...}, workflowIds: [...] }
  │  ← { files: [{ name, url, mimeType, size }] }
  │
  └─ 后端
       WorkflowExecutorNodeJs
         └─ image-ops/nodejs executors (composite, crop, export)
              └─ sharp (production rendering)
```

前端或业务项目通过 `/api/skus/:id/render` 触发生产渲染，传入用户参数，执行关联的 backend workflow，返回生产文件列表。

### Integration Protocol 职责划分

- **前端 / 业务项目**：加载 SKU config、渲染用户输入表单、提交 `userParams`、展示返回结果
- **server**：接收参数、执行 backend workflow、返回文件
- **assetId 解析**：server 根据 workflow 中的 `assetId` 字段查询对应的 production asset（高清素材），用于后端渲染（C5 的 assetId 语义在此处落地）

### Composer SDK 延期至后续 phase

**Composer SDK（npm package / Web Component / iframe embed）不在本 change 范围内。**

当前 change 验证的是 runtime contract（HTTP 接口 + 执行逻辑）。SDK 形态在 runtime contract 验证稳定后再定义，避免过早扩大范围。

未来 SDK 所需能力（React component、Web Component、iframe embed）依赖：
- `/api/skus/:id/render` 接口稳定
- `SKUInputSchema` 的用户输入表单渲染
- `/api/skus/:id` 返回的 workflow config 结构稳定
- 返回文件 URL 的可访问性

以上验证完毕后，可开后续 change 定义正式 SDK 包。

---

## Capabilities

- 选定一个 SKU，传入用户参数（如尺寸、底色），触发后端生产渲染
- 后端执行该 SKU 关联的所有 Backend Production Workflow
- 返回生产文件（PNG/JPEG）或打包 zip 的下载链接
- 可通过 user-app 触发渲染，或通过 API 直接调用

---

## Impact

| layer | 影响 |
|-------|------|
| `server` | 新增 `/api/sku/:id/render` 端点；`WorkflowExecutorNodeJs` |
| `packages/workflow-core` | 新增 Node.js 执行模式 |
| `packages/image-ops` | 无改动 |
| `apps/dev-tool` / `apps/user-app` | 最小 UI 占位（渲染结果预览） |

---

## Out of Scope

- 完整的 Composer SDK（React component / Web Component / iframe embed / npm package）
- 嵌入到业务项目的接入文档
- SKU 素材管理（轻量/高清素材分离、OSS 存储、审核流程）
- 渲染任务队列（当前为同步执行）
- SDK 形态定义（后续 phase，根据 runtime contract 验证结果再开 change）

# proposal: sku-workflow-model

**change_class: high**

reason: 在 `packages/shared-types/` 新增 `SKU` 类型定义，并在 `server/prisma/schema.prisma` 新增 `SKU` 数据模型，触及共享类型包和数据库 schema。

---

## Why

SKU（品类）是 Composer Platform 的核心上层容器。一个 SKU 可关联多条独立 Workflow（前端预览 Workflow + 后端生产 Workflow），它们之间无串联关系，共同构成一个品类的完整图像合成流水线。

SKU 数据模型是 Change 6（生产渲染）的先决条件。

---

## What Changes

1. `packages/shared-types/src/sku.ts`（新增）：定义 `SKU`、`SKUInputSchema`、`SKUOutputSpec` 类型
2. `server/prisma/schema.prisma`：
   - 新增 `SKU` model（id, name, description, inputSchema JSON, outputSpec JSON, createdAt, updatedAt）
   - 新增 `SKUWorkflow` 关联表（SKU.id ↔ Workflow.id，支持 N:M）
   - `Workflow` model 新增 `skuId?` 字段（可选关联）
3. `server/src/routes/sku.ts`（新增）：CRUD API（POST/GET/PUT/DELETE /api/skus）
4. `packages/shared-types/src/index.ts` 导出新增 `sku.ts`

SKU 的 `inputSchema` 定义用户可填的品类参数（如尺寸、底色、文字内容）。SKU 的 `outputSpec` 定义生产文件规范（如输出格式、文件名模板）。

### 素材引用语义（assetId 解析）

SKU 的 `inputSchema` 字段中会引用 `assetId`（或 `assetKey`），用于关联品类配置中的固定素材。

同一份 `assetId` 在不同 runtime 下解析到不同精度素材：
- **browser preview runtime** → `assetId` → preview asset（轻量压缩图，保证交互流畅）
- **nodejs production runtime** → `assetId` → production asset（高清原始素材，用于最终生产）

这是 Composer Platform 的核心原则：**同一套结构化配置 + 同一份 assetId → 不同 runtime 自动解析到对应精度素材**。

C5 只定义 assetId 引用语义，不实现素材上传、压缩、高清版本管理、OSS 存储、审核等能力。这些在后续 asset management change 中处理。

### Input Schema 的 image 类型

`SKUInputSchema` 的字段类型包含：

```
SKUInputField.type = 'string' | 'number' | 'select' | 'color' | 'boolean' | 'image'
```

`image` 类型用于终端用户在运行时上传素材输入，与 SKU 配置内的固定素材引用不同：

| 类型 | 用途 | 生命周期 |
|------|------|---------|
| SKU asset（`assetId` 引用）| 品类配置里固定引用的素材 | 配置时确定，运行时读取 |
| `image` input field | 终端用户运行时上传的素材 | 运行时生成，session 有效 |

`image` input field 的 schema 约束字段包括：
- `accept`：允许的文件格式（如 `['image/png', 'image/jpeg']`）
- `maxSizeMB`：最大文件大小（MB）
- `aspectRatio`：期望宽高比（如 `'16:9'`）
- `minWidth` / `minHeight`：最小尺寸限制
- `multiple`：是否允许多文件上传

实际上传、存储、assetId 生成由后续 server/asset change 处理，C5 只定义 schema 和约束。

---

## Capabilities

- 创建/读取/更新/删除 SKU
- SKU 与 Workflow 关联（一个 SKU 可关联多条 Workflow）
- SKU 有自己的输入参数 schema（供 user-app 渲染时展示表单）
- SKU 有输出规范 schema（供生产渲染时确定文件格式）

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/shared-types` | 新增 sku.ts，导出 SKU 类型 |
| `server/prisma` | 新增 SKU model 和关联表 |
| `server` | 新增 SKU CRUD 路由 |
| `apps/dev-tool` | 无直接改动（SKU 管理 UI 在后续 change） |

---

## Out of Scope

- dev-tool SKU 管理 UI
- 生产渲染接口（Change 6）
- 前端预览 Workflow 与后端生产 Workflow 的关联逻辑（仅建模型，不实现联动）
- 素材上传、压缩、高清版本管理、OSS 存储、审核（后续 asset management change）
- 实际上传、存储、runtime assetId 生成（后续 server/asset change）
- `image` input 类型的实际上传处理（后续 server/asset change）

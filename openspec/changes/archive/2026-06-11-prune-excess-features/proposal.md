change_class: high

reason: 核心产品方向重新聚焦，移除漂移功能层，涉及多包大规模代码删除与架构简化。

---

## Why

项目的原始需求是一个**图像合成编排工具**：用可视化节点图替代硬编码，实现不同品类/合成方式的灵活组合。核心价值只有两件事：

1. **合成引擎** — 节点串联的图像处理（Canvas 实时 or 端到端后端）
2. **编排方式** — 可视化节点图代替写死代码

在开发过程中，项目引入了大量 ERP/平台化概念（SKU、ProductTemplate、TemplateMarketplace、多用户发布订阅等），导致：

- 代码膨胀 3x+，维护成本陡增
- 产品边界模糊，核心用户困惑
- 多个功能模块从未真正使用，形成死代码
- 架构过度设计（OSS、Version History、自定义节点市场等）

当前所有探索扫描已完成，产品方向已与用户确认一致。现在是动手清理的正确时机。

---

## What Changes

### 删除的功能模块

**前端（`apps/dev-tool/`）**

| 模块 | 路径 | 删除原因 |
|------|------|----------|
| SKU 全部 | `routes/skus/` + `components/SKU*` + `stores/skuStore*` + `ProductTemplate*` | ERP 概念，与图像合成无关 |
| TemplateCenter / TemplateManager / SnippetFragment | `components/Template*` + `store/template*` | 如果只是预设节点，下拉菜单足够，不需要商店包装 |
| [独立] NodePackageManager | `components/NodePackageManager/` | 与 NodePanel 内的 ImportModal 功能重复 |
| Version History UI | `components/VersionHistory/` | 开发者功能，普通用户不需要 |
| 死 stores | `store/appStore.ts`、`store/workflowStore.ts` | 变量全部未消费 |
| Grid view 死按钮 | `WorkflowsView.tsx` 中的 viewMode 状态 | 注释写着"等 grid view 实现"，永久死 UI |
| ParamsSection | `components/params/ParamsSection.tsx` | 从未被任何组件 import |
| indexedDbUserAppStorage | `storage/indexedDbUserAppStorage.ts` | 无人引用的 stub |

**服务端（`server/src/`）**

| 模块 | 路径 | 删除原因 |
|------|------|----------|
| SKU 全部 | `routes/sku.ts` + `routes/sku-render.ts` + `schemas/sku.ts` + `schemas/sku-render.ts` + `routes/skus/` | 与图像合成核心无关 |
| ProductTemplate 全部 | `routes/product-template.ts` + `schemas/product-template.ts` | 同上 |
| NodePackage | `routes/nodes.ts` + `schemas/node-package.ts` + `services/oss.ts` | 现阶段不需要开放自定义节点注册 |
| Version History API | `routes/versions.ts` | 前端已删，API 无需保留 |
| render composite | `routes/render.ts` | 无认证 DoS 攻击面，与 Canvas 实时合成功能重叠 |
| 迁移脚本 | `scripts/migrate*.ts` | 一次性脚本，已使用完毕 |
| 死 adapter | `storage/indexedDbUserAppStorage.ts` | 无引用 |

**共享包**

| 模块 | 路径 | 删除原因 |
|------|------|----------|
| SnippetFragment types | `packages/shared-types/src/snippet*` | 无任何消费者 |
| indexedDbUserAppStorage | `packages/shared-types/src/storage/indexedDbUserAppStorage.ts` | 无引用 |

---

## Capabilities

删除后系统保留的核心能力：

- **Canvas 实时预览** — React Flow 画布 + Canvas API 图像合成，实时反馈
- **节点执行引擎** — Web Worker 隔离执行，内置节点定义
- **预设节点模板** — 数据库中存储预设节点配置，作为下拉选项（替代 TemplateCenter）
- **后端合成** — 大图处理 endpoint（只做图，不做版本/文件管理）
- **用户认证** — 保留 JWT 基础（未来按需精简）
- **Workflow CRUD** — 基础的工作流增删改查

---

## Impact

### Breaking Changes

- 所有 SKU、ProductTemplate、NodePackage 的 API 调用全部失效（前端已无消费者）
- 已发布的 SKU/ProductTemplate 数据仍在 DB 中（需迁移脚本清理）
- `apps/user-app/` 可能依赖被删除的 API（需同步审查）

### 收益

- 代码量减少约 30-40%（估计 2000+ 行死代码移除）
- 包体积 / 构建时间降低
- 维护复杂度下降，新开发者上手成本降低
- 产品边界清晰，核心功能聚焦

### 风险

- 如果 `apps/user-app/` 依赖被删 API，需同步清理
- 如果未来需要 SKU/ProductTemplate 功能，需完整重构（无后悔药）
- 数据库中残留的 SKU/ProductTemplate 数据需要清理脚本

---

## Out of Scope

- 不做功能重写，只做删除和简化
- 不重构现有的 Canvas / 执行引擎核心逻辑
- 不改变节点定义格式（保持现有 NodeDefinition schema）
- 不做 user-app 的重新设计（只同步删除其对被删 API 的依赖）
- 不做数据库 Schema 迁移（Prisma schema 中的 SKU/ProductTemplate 模型暂保留，Schema 清理另开 change）
- 不做 OSS 功能（如果未来需要，重新实现比激活现有死代码更可靠）
- 不做权限体系重新设计

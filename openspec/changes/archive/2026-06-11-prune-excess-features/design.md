---

## Goals

- 删除所有偏离核心图像合成需求的代码，恢复"Less is More"产品边界
- 将产品聚焦于：Canvas 实时合成 + 节点编排 + 可选后端大图处理
- 消除所有死代码、无人消费 stores、孤立组件
- 降低认知负荷和维护成本

---

## Non-Goals

- 不做功能重写或架构重构
- 不改变节点定义格式或执行引擎核心
- 不设计新的权限模型
- 不激活任何"已实现但未使用"的特性（OSS 等）

---

## Decisions

### D1: 只删不做 — 避免边删边重构

**Decision:** 本 change 只执行删除操作，不在删除过程中重构剩余代码。

**Rationale:** 在重构的同时删除会导致改动面过大，难以回滚和 review。删除干净后，下一个 change 再做剩余代码的清理（如合并重复 stores、优化 adapter 层）。

**Alternatives Considered:**
- *边删边重构* — 改动面 3x，无法区分删除破坏和重构破坏，PR review 困难
- *仅标记废弃*（不删除）— 代码库仍臃肿，死代码会持续干扰搜索和新人理解

### D2: Prisma Schema 暂不删除 SKU/ProductTemplate 模型

**Decision:** 数据库 schema 中的模型定义本次不删除。

**Rationale:**
- Prisma migration 涉及数据风险，需单独评估是否需要数据迁移脚本
- schema 中的模型定义不影响运行时代码，可后续单独处理
- `server/src/routes/skus/` 等已删，Prisma Client 不会再生成这些表的 query 方法

**Alternatives Considered:**
- *同步删除 schema* — 强制 `prisma migrate dev`，有数据丢失风险；且涉及 `npx prisma migrate dev`，可能与本地 DB 冲突

### D3: user-app 同步审查，不独立建 change

**Decision:** user-app 中对被删 API 的调用同步清理，不另开 change。

**Rationale:** user-app 很小，依赖关系清晰（只有 SKU Render 调用），同 change 内处理效率更高。

### D4: 预设节点模板用 DB 存储替代 TemplateCenter

**Decision:** 删除 TemplateCenter 后，品类预设直接存为数据库中的 Workflow 记录，通过工作流列表下拉选择。

**Rationale:**
- 用户实际需求是"选一个品类，自动加载一组预连节点"
- 这本质上是"一个 Workflow"，不需要额外的 Template 抽象层
- 现有 `Workflow` 模型 + `WorkflowVersion` 足够承载，无需 ProductTemplate

**Alternatives Considered:**
- *硬编码预设* — 不够灵活，修改预设需要重新部署
- *保留 TemplateCenter 但简化* — TemplateCenter 的复杂度来自"商店/搜索/标签/版本"，这些都没必要；如果只是预设下拉，则不需要独立 UI

### D5: NodePackage / Marketplace 全删

**Decision:** 自定义节点包系统全部删除。

**Rationale:**
- 当前节点定义全部内置，不需要"节点市场"
- 开放注册节点涉及安全沙箱、版本管理、依赖解析等工程复杂度
- 如果未来需要，通过 npm 包分发 + 编译时导入更可靠

**Alternatives Considered:**
- *保留 NodePackage API 但前端不暴露* — 死代码，保留只会让未来更困惑

### D6: Version History UI + API 全删

**Decision:** 删除 `components/VersionHistory/` 和 `routes/versions.ts`。

**Rationale:**
- 版本回滚是开发者功能，不是用户核心需求
- 合成结果本身就是可导出的图片/JSON，不依赖版本历史
- 如有需要，做一个简化的"最近保存"快照即可，不需要完整的 diff 系统

### D7: OSS 服务全删

**Decision:** 删除 `server/src/services/oss.ts`，不保留任何 S3/R2 集成代码。

**Rationale:**
- 当前 `nodes.ts` 硬编码 `storageType: 'database'`，OSS 分支从未激活
- 死代码会误导未来的架构决策
- 如果未来需要云存储，从头实现比激活死代码更可控

### D8: render/composite 端点删除

**Decision:** 删除 `POST /api/render/composite`。

**Rationale:**
- 无认证，是 DoS 攻击面
- 与 Canvas 实时合成功能完全重叠
- 返回 RGBA 原始像素数据的 API 设计不合理（客户端拿到后还需手动转图片）

---

## Architecture Review Checklist

### 入口点审查
- [ ] `apps/dev-tool/src/App.tsx` — 路由是否还有指向被删组件的路径？
- [ ] `server/src/app.ts` — `registerRoutes` 中是否还有被删 routes 文件的引用？
- [ ] `apps/user-app/` — 对被删 API 的调用是否全部清除？

### Store 审查
- [ ] `useAppStore` / `useWorkflowStore` / `useSkuStore` / `useProductTemplateStore` / `useTemplateStore` — 是否还有 consumers？
- [ ] 删除 store 后，对应的 Zustand provider/import 是否清理？

### Import 审查
- [ ] `components/VersionHistory/` — 删除后无任何 import
- [ ] `components/TemplateCenter/` — 删除后无任何 import
- [ ] `components/TemplateManager/` — 删除后无任何 import
- [ ] `components/SKU*` — 删除后无任何 import
- [ ] `components/NodePackageManager/`（独立目录）— 删除后无任何 import
- [ ] `routes/skus/` — 删除后无任何 import
- [ ] `routes/product-template.ts` — 删除后无任何 import
- [ ] `routes/nodes.ts` — 删除后无任何 import
- [ ] `routes/versions.ts` — 删除后无任何 import
- [ ] `routes/render.ts` — 删除后无任何 import

### 数据库层
- [ ] Prisma schema 中的 `SKU`, `SKUWorkflow`, `PublishedWorkflow`, `ProductTemplate`, `NodePackage` 模型暂保留，不做 migration
- [ ] `server/src/db/client.ts` 中 Prisma client 生成不再包含被删模型的 query 方法（下次 `prisma generate` 自动生效）

### 迁移脚本
- [ ] `scripts/migrate*.ts` — 确认是一次性脚本，已使用完毕，可安全删除

### 类型定义
- [ ] `packages/shared-types/src/snippet*` — 无消费者，可删
- [ ] `packages/shared-types/src/storage/indexedDbUserAppStorage.ts` — 无消费者，可删

### 测试文件
- [ ] `routes/skus.test.ts` — 删除
- [ ] `routes/sku-render.test.ts` — 删除
- [ ] `nodes.test.ts` — 删除
- [ ] `src/routes/nodes.test.ts` — 删除
- [ ] `utils/nodeCache.test.ts` — 如 `nodeCache` 是 NodePackage 相关，也删除

### 构建验证
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 无新增错误
- [ ] `pnpm test` 全部通过（不运行已删文件的测试）

---

## Formal Review Checklist（全员）

- [ ] 产品：删除后的核心功能路径（打开编辑器 → 加载预设 → 拖入图片 → 实时预览 → 导出）仍然完整
- [ ] 工程：所有被删模块在 CI 中不再被执行
- [ ] 安全：SKU Render 等有权限检查的端点删除后，无功能降级导致越权风险
- [ ] 数据：DB 中的 SKU/ProductTemplate 数据（如果有）本次不影响，下次 schema 清理时处理
- [ ] 用户：user-app 如果有消费者，确认其功能路径不受影响

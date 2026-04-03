## 1. Prisma Schema 添加节点包模型

> 工具文档：Prisma Schema

- [x] 1.1 修改 `server/prisma/schema.prisma` — 添加 `NodePackage` model
- [x] 1.2 添加字段：`name`, `description`, `category`, `latestVersion`, `latestManifest`, `storageType`, `ossKey`, `authorId`
- [x] 1.3 添加 `NodePackageVersion` model：`packageId`, `version`, `manifest`, `storageType`, `ossKey`
- [x] 1.4 运行 `npx prisma migrate dev --name add_node_packages`
- [x] 1.5 验证：`npx prisma studio` 显示新表

## 2. 节点包上传 API

> 工具文档：Zod validation

- [x] 2.1 创建 `server/src/schemas/node-package.ts` — Zod schemas
- [x] 2.2 定义 `uploadNodePackageSchema`：
  - `name`: 字符串，唯一
  - `description`: 可选
  - `category`: 可选，默认 "custom"
  - `manifest`: JSON object (NodePackageManifest)
  - `version`: 语义化版本
- [x] 2.3 创建 `server/src/routes/nodes.ts`
- [x] 2.4 实现 `POST /api/nodes`：
  - 验证 manifest 格式
  - 存储到数据库
  - 返回创建的 NodePackage
- [x] 2.5 验证：上传节点包成功

## 3. 节点包列表 API

> 工具文档：Prisma FindMany · Pagination

- [x] 3.1 实现 `GET /api/nodes`
- [x] 3.2 支持查询参数：`category`, `search`, `sort`, `page`, `limit`
- [x] 3.3 `search` 模糊匹配 `name` 或 `description`
- [x] 3.4 `sort`: `newest` (default) / `name`
- [x] 3.5 返回分页结果：`{ data: [...], total, page, limit }`
- [x] 3.6 验证：curl 测试列表、分页、搜索

## 4. 节点包详情 API

> 工具文档：Prisma FindUnique

- [x] 4.1 实现 `GET /api/nodes/:id`
- [x] 4.2 返回完整 NodePackage（包含 latestManifest）
- [x] 4.3 如果不存在返回 404
- [x] 4.4 验证：获取节点包详情

## 5. 节点包更新 API

> 工具文档：Prisma Update

- [x] 5.1 实现 `PUT /api/nodes/:id`
- [x] 5.2 验证发布者身份（`authorId === request.user.id`）
- [x] 5.3 更新 manifest 和版本信息
- [x] 5.4 创建新的 `NodePackageVersion` 记录
- [x] 5.5 验证：更新后版本历史多一条

## 6. 节点包删除 API

> 工具文档：Prisma Delete

- [x] 6.1 实现 `DELETE /api/nodes/:id`
- [x] 6.2 验证发布者身份
- [x] 6.3 删除 NodePackage 及所有 NodePackageVersion
- [x] 6.4 验证：删除后列表不显示

## 7. 节点包版本历史 API

> 工具文档：Prisma FindMany

- [x] 7.1 实现 `GET /api/nodes/:id/versions`
- [x] 7.2 返回该节点包的所有版本（不含完整 manifest，按时间倒序）
- [x] 7.3 验证：获取版本列表

## 8. 节点包下载 API

> 工具文档：Response headers

- [x] 8.1 实现 `GET /api/nodes/:id/download`
- [x] 8.2 返回完整 NodePackageManifest JSON
- [x] 8.3 设置 `Content-Type: application/json`
- [x] 8.4 设置 `Content-Disposition: attachment; filename="{name}.json"`
- [x] 8.5 验证：下载后是有效的节点包 JSON

## 9. OSS 集成（可选）

> 工具文档：Cloudflare R2 / AWS S3 SDK

> **状态**: 骨架已实现，凭证就绪后可启用（参考 `.env.example`）
- [x] 9.1 添加 R2/S3 SDK 依赖（`@aws-sdk/client-s3`）
- [x] 9.2 实现 `server/src/services/oss.ts` — 上传/下载函数
- [ ] 9.3 修改上传逻辑：大于 1MB 存 OSS（凭证就绪后启用）
- [ ] 9.4 修改下载逻辑：从 OSS 获取或返回数据库 JSON（凭证就绪后启用）
- [ ] 9.5 验证：大文件上传到 OSS，下载正常（凭证就绪后验证）

## 10. 前端市场浏览 UI（可选）

> 工具文档：React UI

> **状态**: 已实现 ✓
- [x] 10.1 创建 `apps/dev-tool/src/components/NodeMarketplace/MarketplaceList.tsx`
- [x] 10.2 实现搜索、分类筛选、分页
- [x] 10.3 创建 `NodeDetail.tsx` — 节点包详情和安装按钮（已集成在 MarketplaceList 中）
- [x] 10.4 连接到 NodePanel（"Browse Market" 按钮）
- [x] 10.5 验证：浏览市场，安装节点包到本地

## 11. 端到端测试

> 工具文档：Vitest + Fastify inject
- [x] 11.1 上传节点包 → 列表显示（18 tests passing）
- [x] 11.2 搜索节点包 → 结果正确（18 tests passing）
- [x] 11.3 更新节点包 → 版本历史增加（18 tests passing）
- [x] 11.4 删除节点包 → 列表不再显示（18 tests passing）
- [x] 11.5 下载节点包 → JSON 有效（18 tests passing）

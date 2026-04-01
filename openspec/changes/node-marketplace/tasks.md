## 1. Prisma Schema 添加节点包模型

> 工具文档：Prisma Schema

- [ ] 1.1 修改 `server/prisma/schema.prisma` — 添加 `NodePackage` model
- [ ] 1.2 添加字段：`name`, `description`, `category`, `latestVersion`, `latestManifest`, `storageType`, `ossKey`, `authorId`
- [ ] 1.3 添加 `NodePackageVersion` model：`packageId`, `version`, `manifest`, `storageType`, `ossKey`
- [ ] 1.4 运行 `npx prisma migrate dev --name add_node_packages`
- [ ] 1.5 验证：`npx prisma studio` 显示新表

## 2. 节点包上传 API

> 工具文档：Zod validation

- [ ] 2.1 创建 `server/src/schemas/node-package.ts` — Zod schemas
- [ ] 2.2 定义 `uploadNodePackageSchema`：
  - `name`: 字符串，唯一
  - `description`: 可选
  - `category`: 可选，默认 "custom"
  - `manifest`: JSON object (NodePackageManifest)
  - `version`: 语义化版本
- [ ] 2.3 创建 `server/src/routes/nodes.ts`
- [ ] 2.4 实现 `POST /api/nodes`：
  - 验证 manifest 格式
  - 存储到数据库
  - 返回创建的 NodePackage
- [ ] 2.5 验证：上传节点包成功

## 3. 节点包列表 API

> 工具文档：Prisma FindMany · Pagination

- [ ] 3.1 实现 `GET /api/nodes`
- [ ] 3.2 支持查询参数：`category`, `search`, `sort`, `page`, `limit`
- [ ] 3.3 `search` 模糊匹配 `name` 或 `description`
- [ ] 3.4 `sort`: `newest` (default) / `name`
- [ ] 3.5 返回分页结果：`{ data: [...], total, page, limit }`
- [ ] 3.6 验证：curl 测试列表、分页、搜索

## 4. 节点包详情 API

> 工具文档：Prisma FindUnique

- [ ] 4.1 实现 `GET /api/nodes/:id`
- [ ] 4.2 返回完整 NodePackage（包含 latestManifest）
- [ ] 4.3 如果不存在返回 404
- [ ] 4.4 验证：获取节点包详情

## 5. 节点包更新 API

> 工具文档：Prisma Update

- [ ] 5.1 实现 `PUT /api/nodes/:id`
- [ ] 5.2 验证发布者身份（`authorId === request.user.id`）
- [ ] 5.3 更新 manifest 和版本信息
- [ ] 5.4 创建新的 `NodePackageVersion` 记录
- [ ] 5.5 验证：更新后版本历史多一条

## 6. 节点包删除 API

> 工具文档：Prisma Delete

- [ ] 6.1 实现 `DELETE /api/nodes/:id`
- [ ] 6.2 验证发布者身份
- [ ] 6.3 删除 NodePackage 及所有 NodePackageVersion
- [ ] 6.4 验证：删除后列表不显示

## 7. 节点包版本历史 API

> 工具文档：Prisma FindMany

- [ ] 7.1 实现 `GET /api/nodes/:id/versions`
- [ ] 7.2 返回该节点包的所有版本（不含完整 manifest，按时间倒序）
- [ ] 7.3 验证：获取版本列表

## 8. 节点包下载 API

> 工具文档：Response headers

- [ ] 8.1 实现 `GET /api/nodes/:id/download`
- [ ] 8.2 返回完整 NodePackageManifest JSON
- [ ] 8.3 设置 `Content-Type: application/json`
- [ ] 8.4 设置 `Content-Disposition: attachment; filename="{name}.json"`
- [ ] 8.5 验证：下载后是有效的节点包 JSON

## 9. OSS 集成（可选）

> 工具文档：Cloudflare R2 / AWS S3 SDK

- [ ] 9.1 添加 R2/S3 SDK 依赖
- [ ] 9.2 实现 `server/src/services/oss.ts` — 上传/下载函数
- [ ] 9.3 修改上传逻辑：大于 1MB 存 OSS
- [ ] 9.4 修改下载逻辑：从 OSS 获取或返回数据库 JSON
- [ ] 9.5 验证：大文件上传到 OSS，下载正常

## 10. 前端市场浏览 UI（可选）

> 工具文档：React UI

- [ ] 10.1 创建 `apps/dev-tool/src/components/NodeMarketplace/MarketplaceList.tsx`
- [ ] 10.2 实现搜索、分类筛选、分页
- [ ] 10.3 创建 `NodeDetail.tsx` — 节点包详情和安装按钮
- [ ] 10.4 连接到 NodePanel 或主菜单
- [ ] 10.5 验证：浏览市场，安装节点包到本地

## 11. 端到端测试

- [ ] 11.1 上传节点包 → 列表显示
- [ ] 11.2 搜索节点包 → 结果正确
- [ ] 11.3 更新节点包 → 版本历史增加
- [ ] 11.4 删除节点包 → 列表不再显示
- [ ] 11.5 下载节点包 → JSON 有效

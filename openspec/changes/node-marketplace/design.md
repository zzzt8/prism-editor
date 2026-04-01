## Context

`custom-node-architecture` 提案已实现节点包的本地导入和管理，但没有分发机制。开发者只能通过文件分享节点包，无法：
- 在平台上发现其他开发者的节点
- 获取节点包的更新
- 信任节点包的来源

节点市场是开发者生态的核心基础设施。

## Goals / Non-Goals

**Goals:**
- 开发者可以上传节点包到平台
- 其他开发者可以搜索和浏览节点包
- 节点包可以版本化管理
- User App 可以从市场直接安装节点包

**Non-Goals:**
- 不实现付费/交易功能
- 不实现评分/评论系统
- 不实现官方认证/审核
- 不实现节点包依赖解析

## Decisions

### 决策 1: 节点包存储位置

**选择**: 数据库 + OSS 的混合模式

**理由**:
- 小型节点包（< 1MB）：直接存数据库 JSON
- 大型节点包 / executor bundle：存 OSS，返回 URL
- 简单实现，足够初期使用

**工具文档**:
- Cloudflare R2: https://developers.cloudflare.com/r2/
- AWS S3: https://aws.amazon.com/s3/
- 替代：本地文件系统 + Nginx static serving（简单但不适合生产）

---

### 决策 2: 节点包发现 API

**选择**: RESTful API 列表查询

**理由**:
- 简单：标准 REST 模式
- 支持分页、搜索、排序
- 未来可扩展为 GraphQL

**查询参数**:
- `category`: 按分类筛选
- `search`: 按名称/描述搜索
- `sort`: 排序（newest / popular / name）
- `page` / `limit`: 分页

---

### 决策 3: 节点包版本管理

**选择**: 语义化版本（SemVer）+ 上传时指定

**理由**:
- 业界标准
- 便于用户理解更新
- 支持 `^1.0.0` 范围匹配

**工具文档**:
- SemVer: https://semver.org/

---

### 决策 4: 节点包与用户关联

**选择**: 节点包关联发布者 userId

**理由**:
- 便于追溯来源
- 未来可添加"我的节点包"筛选
- 支持删除/更新

---

## API Design

| Method | Path | Description |
|---|---|---|
| GET | `/api/nodes` | 列表节点包（支持分页、搜索、分类） |
| GET | `/api/nodes/:id` | 节点包详情 |
| POST | `/api/nodes` | 上传节点包（需认证） |
| PUT | `/api/nodes/:id` | 更新节点包（仅发布者） |
| DELETE | `/api/nodes/:id` | 删除节点包（仅发布者） |
| GET | `/api/nodes/:id/versions` | 节点包版本历史 |
| GET | `/api/nodes/:id/download` | 下载节点包 |

## Data Model

```prisma
model NodePackage {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  category    String   @default("custom")

  // 最新版本
  latestVersion  String
  latestManifest String  // JSON

  // 存储
  storageType    String   @default("database")  // "database" | "oss"
  ossKey         String?  // S3/R2 key

  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model NodePackageVersion {
  id          String   @id @default(cuid())
  packageId   String
  package     NodePackage @relation(...)

  version     String
  manifest    String   // JSON
  storageType String   @default("database")
  ossKey     String?

  createdAt   DateTime @default(now())
}
```

## Project Structure

```
server/
├── src/routes/
│   └── nodes.ts         # 新增
├── src/services/
│   └── oss.ts           # 新增：OSS 上传/下载
apps/dev-tool/
├── src/components/
│   └── NodeMarketplace/ # 可选：浏览市场入口
│       ├── MarketplaceList.tsx
│       └── NodeDetail.tsx
```

## Migration Plan

### Phase 1: 基础市场 API (Week 1)
1. 添加 NodePackage/NodePackageVersion model
2. 实现上传 API（存数据库 JSON）
3. 实现列表 API（支持分页、搜索）
4. 实现详情 API

### Phase 2: OSS 集成 (Week 2)
1. 集成 Cloudflare R2（或 S3）
2. 大型包上传到 OSS
3. 下载 API 返回 OSS URL 或直接代理

### Phase 3: 版本管理 (Week 2)
1. 实现版本历史 API
2. 实现更新节点包（上船新版本）
3. 测试版本覆盖

### Phase 4: Dev Tool 集成（可选）(Week 3)
1. 添加"浏览市场"入口
2. 一键安装到本地
3. 更新通知

## Risks / Trade-offs

[Risk] 恶意节点包
→ Mitigation: 初期信任认证用户；后续添加内容审核

[Risk] 节点包版权问题
→ Mitigation: 添加 license 字段；用户需同意条款

[Risk] OSS 成本
→ Mitigation: 设置包大小限制（如 10MB）；按需扩展

## Open Questions

1. **是否需要节点包审核？** 初期不加，后续可添加管理员审核流程。
2. **是否支持节点包依赖？** 初期不加，后续可添加 `dependencies` 字段。
3. **节点包是否支持私有？** 初期全部公开，后续可添加 visibility 字段。
4. **安装节点包是否需要 Token？** 认证用户可安装，未认证只读。

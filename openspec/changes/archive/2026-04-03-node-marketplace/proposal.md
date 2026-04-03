## Why

当前自定义节点只能通过文件导入，没有发现、分发、评分机制。这阻碍了开发者生态的形成：
1. 开发者创建的节点无法被其他开发者发现
2. 无法建立信任机制（评分/评论）
3. 无版本管理（节点更新后用户不知道）

本提案在服务端骨架和节点包架构基础上，实现节点市场功能。

## What Changes

### 节点包存储与分发
- 支持上传节点包到服务端
- 支持通过 API 发现和下载节点包
- 支持节点包版本管理

### 节点发现
- 列表查询（支持分类、搜索、排序）
- 详情查看（包含定义预览、作者信息）

### 未来扩展（不在本提案范围）
- 评分/评论
- 官方认证
- 付费节点

## Capabilities

### New Capabilities
- `node-package-storage`: 节点包的服务端存储和版本管理
- `node-discovery`: 节点包的发现和列表查询

### Modified Capabilities
- *(无)* — 本提案扩展 backend-api 和 node-package-format，不改变现有行为

## Impact

- **新增文件**：`server/src/routes/nodes.ts`
- **新增 API**：`GET /api/nodes`, `POST /api/nodes`, `GET /api/nodes/:id`
- **存储**：节点包 JSON 存储在数据库或 OSS
- **前端改动**：可选 — Dev Tool 添加"浏览市场"入口

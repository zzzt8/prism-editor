## Goals

1. 后端能执行完整图像合成工作流
2. 复用已有的 `WorkflowExecutorNodeJs` + `nodeExecutors` 架构
3. 支持大图处理（sharp）和批量操作
4. API 设计简洁，与前端执行器保持接口一致

---

## Non-Goals

- 不做实时预览（前端 Canvas 职责）
- 不做工作流编辑（dev-tool 职责）
- 不做复杂文件管理（简单本地存储或 S3）
- 不做权限体系重新设计

---

## Decisions

### 1. API 设计：REST + multipart

**选择**：使用 `multipart/form-data` 上传图像，`application/json` 传工作流配置

**理由**：
- 图像文件通过 multipart 上传更直观
- 工作流定义 JSON 可直接复用前端格式
- Fastify 有成熟的 `@fastify/multipart` 支持

**备选方案对比**：
| 方案 | 优点 | 缺点 |
|------|------|------|
| multipart + JSON | 直观、成熟 | 图像大时传输量略大 |
| base64 内嵌 | 单请求、无需文件解析 | JSON 体积膨胀 33%，解析慢 |
| 分开 API | 图像、配置解耦 | 调用复杂（先上传图像拿 URL，再传配置） |

### 2. 执行器复用策略

**选择**：直接复用 `nodeExecutors` 对象，动态注册到 `WorkflowExecutorNodeJs`

```typescript
// server/routes/render.ts
import { WorkflowExecutorNodeJs } from '@prism/workflow-core';
import { nodeExecutors } from '@prism/image-ops/nodejs';

const executor = new WorkflowExecutorNodeJs({ nodeExecutors });
```

**理由**：
- 已有框架可直接使用，无需重写调度逻辑
- sharp executor 与前端 Canvas executor 接口一致
- 后续扩展新节点只需在 `nodejs/` 目录添加

### 3. 大图处理策略

**选择**：sharp 直接处理，设置合理的内存限制

```typescript
// sharp 选项
sharp(input)
  .limitInputPixels(false) // 允许大图
  .concurrency(1) // 限制并发，节省内存
```

**理由**：
- sharp 本身支持大图（通过 `limitInputPixels(false)`）
- 单图处理无需并发控制
- 批量时通过任务队列限流

### 4. 批量处理设计

**选择**：同步处理，ZIP 返回

**理由**：
- 实现简单，无需状态管理
- 图像数量可控（限制 100 张/批）
- 用户体验完整（一次请求拿到所有结果）

**备选**：
| 方案 | 适合场景 |
|------|---------|
| 同步 ZIP | 小批量（<100张）、即时结果 |
| 异步任务队列 | 大批量、需要通知 |
| WebSocket 流式 | 实时预览（不需要） |

---

## Architecture Review

### 流程图

```
Client                    Server                      Packages
  │                         │                            │
  │  POST /render/workflow  │                            │
  │  ─────────────────────► │                            │
  │  multipart/form-data:    │                            │
  │    workflow: JSON        │                            │
  │    images: [file...]     │                            │
  │                         │                            │
  │                         │  1. 解析 workflow JSON      │
  │                         │  2. 解析图像 files          │
  │                         │  3. 加载到 Buffer           │
  │                         │                            │
  │                         │  WorkflowExecutorNodeJs    │
  │                         │  ────────────────────────► │
  │                         │        nodeExecutors      │
  │                         │  ◄──────────────────────── │
  │                         │        ImageData          │
  │                         │                            │
  │  200 OK (image/png)     │                            │
  │  ◄───────────────────── │                            │
  │                         │                            │
```

### 批量处理流程

```
Client                    Server                      Packages
  │                         │                            │
  │  POST /render/batch     │                            │
  │  multipart/form-data:    │                            │
  │    workflow: JSON       │                            │
  │    images: [file...]    │                            │
  │                         │                            │
  │                         │  for each image:           │
  │                         │    execute workflow        │
  │                         │  ZIP all results           │
  │                         │                            │
  │  200 OK (application/zip)                            │
  │  ◄───────────────────── │                            │
```

---

## 简化评审清单

- [ ] API 输入输出格式与前端执行器一致
- [ ] sharp executor 与前端 Canvas executor 结果一致（像素级）
- [ ] 大图处理不会 OOM
- [ ] 批量限制合理（100 张/批）
- [ ] 错误信息包含节点 ID，方便定位
- [ ] 类型检查通过（`pnpm typecheck`）
- [ ] 现有测试通过（`pnpm test`）

---

## TODO

- [ ] 实现 `load-image-executor.ts` (sharp)
- [ ] 实现 `load-mask-executor.ts` (sharp)
- [ ] 实现 `apply-mask-executor.ts` (sharp)
- [ ] 实现 `transform-executor.ts` (sharp)
- [ ] 新增 `POST /api/render/workflow` 端点
- [ ] 新增 `POST /api/render/batch` 端点
- [ ] 集成测试（端到端验证像素一致性）

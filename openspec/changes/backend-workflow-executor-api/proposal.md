change_class: high

reason: 将后端工作流执行器接入 Fastify API，打通 server → workflow 执行 → 返回图片的完整链路，使 server 能处理图像合成请求，支持大图处理和批量操作。

---

## Why

当前状态：
- `packages/image-ops/nodejs/` 已实现 sharp 执行器框架（composite、crop、export 试点）
- `packages/workflow-core/` 已有 `WorkflowExecutorNodeJs` 类
- server 只有 CRUD API，工作流执行器**未接入**

目标：
- 后端 server 能接收图像合成请求
- 复用已有工作流定义和执行器
- 支持大图处理（sharp）和批量操作

---

## What Changes

1. **新增 API 端点**
   - `POST /api/render/workflow` — 接收 workflow JSON + 输入图像，执行并返回结果
   - `POST /api/render/batch` — 批量处理多张图像，ZIP 下载

2. **复用现有组件**
   - `WorkflowExecutorNodeJs` from `@prism/workflow-core`
   - `nodeExecutors` from `@prism/image-ops/nodejs`
   - 已有 sharp 实现的 composite、crop、export 节点

3. **新增 Node.js 执行器**
   - `apply-mask-executor.ts` — sharp 重实现（替代 Canvas）
   - `transform-executor.ts` — sharp 缩放/旋转
   - `load-image-executor.ts` — 从 Buffer 加载图像
   - `load-mask-executor.ts` — 加载蒙版

4. **图像 I/O 层**
   - 支持 multipart/form-data 上传图像
   - 返回 image/png 或 image/jpeg

---

## Capabilities

- 后端执行完整工作流：LoadImage → ApplyMask → Composite → Export
- 支持大图（4K+）处理，sharp 内存优化
- 批量处理：传入多张图像，执行相同工作流，ZIP 返回结果
- 错误处理：节点执行失败返回具体错误信息

---

## Impact

| layer | 影响 |
|-------|------|
| `server` | 新增 `/api/render/*` 端点 |
| `packages/image-ops` | 完成剩余节点的 sharp 实现 |
| `packages/workflow-core` | 无改动 |
| `apps/dev-tool` | 无改动 |
| `apps/user-app` | 无改动 |

### Breaking Changes
- 无（纯新增 API）

### 风险
- sharp 内存占用需监控（大图处理）
- 工作流执行时间可能较长，需 timeout 控制

---

## Out of Scope

- 不做实时预览（那是前端 Canvas 的职责）
- 不做工作流版本管理（已有 CRUD 足够）
- 不做 OSS 集成（文件存储走本地或 S3）
- 不做权限体系重新设计
- 不做工作流编辑器（那是 dev-tool 的职责）

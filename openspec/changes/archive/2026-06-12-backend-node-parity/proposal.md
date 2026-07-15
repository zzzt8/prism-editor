# proposal: backend-node-parity

**change_class: medium**

reason: 前端有 7 个节点定义（load-image, load-mask, apply-mask, composite, transform, export, empty-input），后端仅有 3 个执行器（composite, crop/export）。需要对齐前后端节点覆盖，让前端工作流能完整迁移到后端执行。

---

## Why

用户期望：
- 前端做轻量化实时合成预览
- 后端处理大图，最终输出

当前问题：
- 前端 7 个节点，后端 3 个执行器
- 前端定义的节点 `platforms: ['browser']`，无法在后端工作流中使用
- 用户无法把前端验证好的工作流无缝迁移到后端执行

---

## What Changes

1. **新增后端执行器**（`packages/image-ops/src/nodejs/`）
   - `load-image-executor.ts` — 支持 URL/FilePath/Buffer 输入
   - `load-mask-executor.ts` — 复用 load-image，输出类型为 mask
   - `apply-mask-executor.ts` — alpha/brightness/luminance mask
   - `transform-executor.ts` — 合并现有 crop 功能，支持 translate/scale/rotate
   - `empty-input-executor.ts` — 生成空白画布

2. **更新 nodejs/index.ts** — 导出新执行器

3. **更新节点定义**（可选）
   - `platforms` 从 `['browser']` 改为 `['both']` 或保持现状让运行时决定

---

## Capabilities

- 前端验证的工作流可直接迁移到后端执行
- 后端支持完整图片处理 pipeline（输入 → 遮罩 → 变换 → 合成 → 输出）
- 大图处理利用 sharp 的流式 API，内存友好

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/image-ops` | 新增 5 个 Node.js 执行器 |
| `packages/workflow-core` | 已有 Node.js executor 框架，无改动 |
| `packages/node-definitions` | 可选：调整 platforms 字段 |

---

## Out of Scope

- AI/生成类节点（用户明确排除）
- WebSocket 流式预览
- 用户画布（user-app 拖拽交互）

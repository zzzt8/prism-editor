# proposal: nodejs-executor-sharp-pilot

**change_class: high**

reason: 引入 sharp 作为生产级图像处理库，在 `packages/image-ops/` 新增 nodejs executor 目录，实现首个后端 executor 试点，触及 image-ops 包的核心架构。

---

## Why

Change 1 已将 `composite` 的核心算法抽至 `core/`。Change 2/3 已建立平台标记机制。现在需要实现首个 nodejs executor，验证"同一 core 算法 + 不同 I/O 层"方案在 Node.js 环境下可行。

试点节点：`composite`，并作为补充实现 `crop`（裁切）和 `export`（输出 Buffer）——这三个节点足够验证完整的前端到后端的 pipeline 替换。

---

## What Changes

1. 在 `packages/image-ops/` 新增 `nodejs/` 目录
2. 引入 `sharp` 作为 image-ops 的 Node.js 专属依赖（通过 npm peer dep 或 conditional export）
3. 实现 `nodejs/composite-executor.ts`：调用 `core/composite-math.ts` + sharp Buffer I/O
4. 实现 `nodejs/crop-executor.ts`：sharp 裁切操作
5. 实现 `nodejs/export-executor.ts`：sharp 输出 PNG/JPEG Buffer
6. server 新增 `POST /api/render/composite` 最小端点，接收 workflow JSON，执行 nodejs executor，返回二进制图像
7. 确保 `sharp` **不进入 browser bundle**（通过 webpack externals / conditional import）

---

## Capabilities

- 后端可执行 composite 节点：传入 base/overlay ImageData → 返回 composite 结果
- 后端可执行 crop 节点：传入图像 Buffer → 返回裁切后 Buffer
- 后端可执行 export 节点：传入 ImageData → 返回 PNG/JPEG Buffer
- server 端可返回二进制图像给调用方

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/image-ops` | 新增 `nodejs/` 目录和 sharp 依赖 |
| `server` | 新增 `/api/render/composite` 端点 |
| `packages/workflow-core` | 无改动 |
| `apps/dev-tool` | 无改动 |

---

## Out of Scope

- 拆分其他节点（apply-mask、transform、load-image）
- SKU 模型（Change 5）
- 生产渲染完整流程（Change 6）
- nodejs executor 接入 workflow-core 调度（后续 change）

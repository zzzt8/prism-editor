# proposal: image-ops-runtime-core-foundation

**change_class: high**

reason: 新增 `packages/image-ops/src/core/` 目录层并重构 executor 接口边界，触及跨包公开 API 表面，为后续 nodejs executor 试点建立目录和调用约定。

---

## Why

Composer Platform 的技术核心是"同一套节点定义驱动前端预览和后端生产渲染"。当前 `packages/image-ops/` 的 executor 实现全部绑定浏览器 Canvas API，无法在 Node.js 执行。

方案 C（定义统一 + core/browser/nodejs 分层）要求将节点的核心计算逻辑抽成纯函数，置于 `core/` 目录。browser executor 和未来的 nodejs executor 都调用这些纯函数，只在 I/O 层差异化。

首个试点选 `composite` 节点：其 blend math（10 种 blend mode + Porter-Duff Source-Over）是完整、严谨、可独立验证的纯算法，适合作为 core 抽离的样本。

---

## What Changes

在 `packages/image-ops/src/` 下新增 `core/` 目录，将 composite 节点的核心计算逻辑独立为纯函数集合：

```
packages/image-ops/src/
├── core/
│   ├── blend-modes.ts       ← 纯函数：10 种 blend mode 像素运算
│   ├── porter-duff.ts       ← 纯函数：Source-Over compositing
│   ├── alpha-format.ts      ← 纯函数：premultiplied/straight 检测与转换
│   └── composite-math.ts    ← 纯函数：compositeImages（组合以上所有）
└── [existing files unchanged]
```

`composite.ts` 改造为两层：
- **core 层**（新，`core/composite-math.ts`）：`compositeImages(base, overlay, options) → ImageData`，无任何浏览器 API 依赖
- **executor 层**（改，`composite.ts`）：调用 core 层 + 处理 workflow context、preview 生成、IRO 封装

---

## Capabilities

- core 层的 `compositeImages` 纯函数可在 Node.js 环境中调用（传入 `ImageData`-compatible 对象）
- 现有 browser executor 行为**完全不变**：preview 生成、Web Worker 调度、IRO 输出格式均保持一致
- core 层包含完整的像素级 JS 实现，适用于 Node.js 无 Canvas API 的场景
- 未来 nodejs executor 只需引入 `core/composite-math.ts`，无需重写 blend math

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/image-ops` | 新增 `core/` 目录；`composite.ts` 重构但行为不变；新增 `src/core/index.ts` 导出 |
| `packages/workflow-core` | 无直接影响 |
| `apps/dev-tool` | 无直接影响 |
| `apps/user-app` | 无直接影响 |
| `server` | 无直接影响 |

nodejs executor 的实际引入在 Change 4，不在本 change 范围内。

---

## Out of Scope

- nodejs executor 目录或文件（Change 4）
- sharp 或任何 Node.js 图像库引入（Change 4）
- `NodeDefinition.platforms` 字段（Change 2）
- dev-tool NewWorkflowModal Radio UI（Change 3）
- SKU / Prisma 数据模型（Change 5）
- 后端生产渲染接口（Change 6）
- 拆分其他节点（apply-mask、transform、load-image、export）

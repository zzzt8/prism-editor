# proposal: fix-e2e-test-imports

**change_class: medium**

reason: 修复 20 个 e2e 测试失败。C1 重构 image-ops core 层后，published-executor.e2e.test.ts 的导入路径未同步更新，导致 `applyMask`、`compositeImages`、`exportImage` 导入失败。

---

## Why

C1（image-ops-runtime-core-foundation）重构了 `packages/image-ops/src/` 目录结构：
- 将 `applyMask`、`compositeImages`、`exportImage` 等函数移入 `src/core/` 子目录
- 同时保持根目录的导出作为 browser executor 的 wrapper

但 `packages/workflow-core/src/published-executor.e2e.test.ts` 仍使用旧导入路径：
```ts
import { applyMask, compositeImages, exportImage } from '@prism/image-ops';
```

这导致 20 个 e2e 测试全部返回 `'error'` 而非 `'done'`。

---

## What Changes

1. **修正 `published-executor.e2e.test.ts` 的导入路径**：

   使用子路径导入绕过 package exports 路由问题：
   - `applyMask` → 从 `@prism/image-ops/apply-mask` 导入（子路径，不受 `node` 字段路由影响）
   - `compositeImages` → 从 `@prism/image-ops/composite` 导入（子路径）
   - `exportImage` → 从 `@prism/image-ops/export-image` 导入（子路径）

2. **验证测试导入路径**：
   - 检查其他 test 文件是否也存在类似问题
   - 确保 `canvas-polyfill` 在 Node.js 环境下正确加载

---

## Capabilities

- 所有 20 个失败的 e2e 测试恢复通过
- 测试套件可正确验证：
  - LoadImage → Export 管道
  - LoadImage → ApplyMask → Composite 管道
  - 各种 blend mode 正确性
  - 图像尺寸调整和格式导出（JPEG/WebP）

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/workflow-core` | 修复 test 导入，不改逻辑 |
| `packages/image-ops` | 无变更 |
| `apps/dev-tool` | 无影响 |
| `apps/user-app` | 无影响 |
| `server` | 无影响 |

---

## Out of Scope

- 不修改 image-ops 的导出结构
- 不修改任何运行时逻辑
- 不修复其他测试文件（除非发现类似问题）
- 不添加新功能

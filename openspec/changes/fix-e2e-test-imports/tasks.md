# tasks: fix-e2e-test-imports

## Task Anchor

- **原始任务**：修复 e2e 测试导入问题，恢复 20 个测试通过
- **追加内容**：无
- **追加内容判定**：无
- **是否改变任务主题**：否

---

## Quality Checklist

- [x] 导入路径使用子路径（`@prism/image-ops/apply-mask`）而非主入口（`@prism/image-ops`）
- [x] 类型从 `canvas.ImageData` 正确转换为测试所需的 `ImageData` 类型
- [x] 测试中的 `mkImage()` helper 使用 `canvas.ImageData` 构造，兼容 `@prism/shared-types` ImageData
- [x] 所有 20 个失败测试恢复通过

---

## Implementation Tasks

- [x] **Task 1: Fix imports in published-executor.e2e.test.ts** ✅
  - layer: `packages/workflow-core`
  - verify: `npm run test --workspace=@prism/workflow-core`

  修改 `packages/workflow-core/src/published-executor.e2e.test.ts` 的导入，使用子路径绕过 package exports 路由问题：
  - `applyMask` → `@prism/image-ops/apply-mask`
  - `compositeImages` → `@prism/image-ops/composite`
  - `exportImage` → `@prism/image-ops/export-image`

  同步在 `image-ops/package.json` 添加子路径 exports，使 TypeScript 能正确解析。

  验收：113 个测试全部通过 ✅

- [x] **Task 2: Verify test setup globals are correctly loaded** ✅
  - layer: `packages/workflow-core`
  - verify: `npm run test --workspace=@prism/workflow-core -- --reporter=verbose`

  确认 `vitest.config.ts` 中的 `setupFiles: ['../image-ops/src/test-setup.ts']` 正确加载 canvas polyfill。

  验收：测试运行时无 `ReferenceError: ImageData is not defined` 错误 ✅

# tasks: fix-e2e-test-imports

## Task Anchor

- **原始任务**：修复 e2e 测试导入问题，恢复 20 个测试通过
- **追加内容**：无
- **追加内容判定**：无
- **是否改变任务主题**：否

---

## Quality Checklist

- [ ] 导入路径使用子路径（`@prism/image-ops/apply-mask`）而非主入口（`@prism/image-ops`）
- [ ] 类型从 `canvas.ImageData` 正确转换为测试所需的 `ImageData` 类型
- [ ] 测试中的 `mkImage()` helper 使用 `canvas.ImageData` 构造，兼容 `@prism/shared-types` ImageData
- [ ] 所有 20 个失败测试恢复通过

---

## Implementation Tasks

- [ ] **Task 1: Fix imports in published-executor.e2e.test.ts**
  - layer: `packages/workflow-core`
  - verify: `npm run test --workspace=@prism/workflow-core`

  修改 `packages/workflow-core/src/published-executor.e2e.test.ts` 的导入：

  ```diff
  - import { applyMask, compositeImages, exportImage } from '@prism/image-ops';
  + import { applyMask } from '@prism/image-ops/apply-mask';
  + import { compositeImages } from '@prism/image-ops/composite';
  + import { exportImage } from '@prism/image-ops/export-image';
  ```

  验收：
  - 所有导入函数在测试文件中可正常访问
  - 测试中使用的 `canvas.ImageData` 类型与导入的函数参数类型兼容
  - 运行 `npm run test --workspace=@prism/workflow-core` 确认 20 个失败测试恢复通过

- [ ] **Task 2: Verify test setup globals are correctly loaded**
  - layer: `packages/workflow-core`
  - verify: `npm run test --workspace=@prism/workflow-core -- --reporter=verbose`

  确认 `vitest.config.ts` 中的 `setupFiles: ['../image-ops/src/test-setup.ts']` 正确加载 canvas polyfill，使 `globalThis.ImageData` 指向 `canvas.ImageData`。

  验收：
  - 测试运行时无 `ReferenceError: ImageData is not defined` 错误
  - `canvas-polyfill` 正确模拟浏览器环境

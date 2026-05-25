# tasks: nodejs-executor-sharp-pilot

---

- [x] **Task 1: sharp 引入 image-ops（不进入 browser bundle）**

  ```yaml
  opsx-meta:
    id: task-1
    layer: pkg.image-ops
    verify: |
      npm run typecheck --workspace=@prism/image-ops
  ```

  - 在 `packages/image-ops/` 安装 `sharp`
  - 在 `packages/image-ops/package.json` 配置 conditional exports：`browser` 指向 `src/index.ts`（不含 sharp），`node` 指向 `src/nodejs/index.ts`
  - 在 webpack/vite 配置中将 `sharp` 标记为 external
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

---

- [x] **Task 2: 创建 `nodejs/` 目录骨架**

  ```yaml
  opsx-meta:
    id: task-2
    layer: pkg.image-ops
    verify: |
      Test-Path "packages/image-ops/src/nodejs/index.ts"
  ```

  - 创建 `packages/image-ops/src/nodejs/` 目录
  - 创建 `packages/image-ops/src/nodejs/index.ts`，导出所有 nodejs executor
  - 验收：`Test-Path "packages/image-ops/src/nodejs/index.ts"`

---

- [x] **Task 3: sharp ↔ ImageData 转换工具函数**

  ```yaml
  opsx-meta:
    id: task-3
    layer: pkg.image-ops
    verify: |
      npm run typecheck --workspace=@prism/image-ops
  ```

  - 在 `packages/image-ops/src/nodejs/` 新建 `sharp-utils.ts`
  - 实现 `sharpToImageData(sharpInstance) → ImageData`：将 sharp 原始像素转为 ImageData
  - 实现 `imageDataToSharp(imageData: ImageData) → sharp`：将 ImageData 转为 sharp 实例
  - 纯 Node.js 环境代码，不含任何 browser API
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

---

- [x] **Task 4: nodejs composite executor**

  ```yaml
  opsx-meta:
    id: task-4
    layer: pkg.image-ops
    verify: |
      npm run typecheck --workspace=@prism/image-ops
  ```

  - 创建 `packages/image-ops/src/nodejs/composite-executor.ts`
  - 调用 `core/composite-math.ts` 的 `compositeImages` 纯函数（Change 1）
  - I/O 层：sharp Buffer → ImageData → compositeImages → ImageData → sharp Buffer
  - 导出符合 `NodeExecutor` 接口的 `compositeExecutor`
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

---

- [x] **Task 5: nodejs crop executor**

  ```yaml
  opsx-meta:
    id: task-5
    layer: pkg.image-ops
    verify: |
      npm run typecheck --workspace=@prism/image-ops
  ```

  - 创建 `packages/image-ops/src/nodejs/crop-executor.ts`
  - 使用 sharp 的 `extract` API 实现裁切
  - 导出符合 `NodeExecutor` 接口的 `cropExecutor`
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

---

- [x] **Task 6: nodejs export executor**

  ```yaml
  opsx-meta:
    id: task-6
    layer: pkg.image-ops
    verify: |
      npm run typecheck --workspace=@prism/image-ops
  ```

  - 创建 `packages/image-ops/src/nodejs/export-executor.ts`
  - 接收 ImageData，输出 PNG/JPEG Buffer
  - 导出符合 `NodeExecutor` 接口的 `exportExecutor`
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

---

- [x] **Task 7: nodejs/index.ts 统一导出**

  ```yaml
  opsx-meta:
    id: task-7
    layer: pkg.image-ops
    verify: |
      npm run typecheck --workspace=@prism/image-ops
  ```

  - `packages/image-ops/src/nodejs/index.ts` 导出 compositeExecutor、cropExecutor、exportExecutor
  - 导出 nodeExecutors map：`{ composite: compositeExecutor, crop: cropExecutor, export: exportExecutor }`
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

---

- [x] **Task 8: server 新增 `/api/render/composite` 端点**

  ```yaml
  opsx-meta:
    id: task-8
    layer: app.server
    verify: |
      npm run typecheck --workspace=@prism/server
  ```

  - 在 `server/src/` 新增渲染路由
  - `POST /api/render/composite`：接收 base64 图像，执行 composite，返回 base64 结果
  - 验收：`npm run typecheck --workspace=@prism/server`

---

- [x] **Task 9: nodejs executor 像素级 diff 测试**

  ```yaml
  opsx-meta:
    id: task-9
    layer: pkg.image-ops
    verify: |
      npm run test -- packages/image-ops/src/nodejs/composite-executor.test.ts
  ```

  - 复用 `composite.test.ts` 的测试用例，将 browser executor 替换为 nodejs executor
  - 验证像素级 diff 为 0
  - 验收：`npm run test -- packages/image-ops/src/nodejs/composite-executor.test.ts`

---

- [x] **Task 10: sharp 不进入 browser bundle 验证**

  ```yaml
  opsx-meta:
    id: task-10
    layer: app.dev-tool
    verify: |
      npm run build --workspace=@prism/dev-tool 2>&1 | Select-String -Pattern "sharp" -NotMatch
  ```

  - 构建 dev-tool bundle，通过 webpack bundle analyzer 或 grep 验证 sharp 不在其中
  - 验收：构建成功且 bundle 中无 sharp

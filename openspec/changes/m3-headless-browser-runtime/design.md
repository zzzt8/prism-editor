# Design: M3 — Headless Browser Runtime

## Goals

1. **创建可独立构建的 `@prism/browser-runtime` 包**：组合现有 `workflow-core` 和 browser executors，提供无 UI 执行能力
2. **定义干净的宿主 IO 边界**：AssetResolver（输入） + OutputSink（输出），不混在一个接口中
3. **添加 `@prism/image-ops/browser` 干净导入路径**：仅导出 browser executors，不泄漏 Sharp/nodejs
4. **建立 Chromium test host**：复用 M0 基础设施，验证 10 项独立运行条件
5. **引入 package boundary gates**：自动门禁，禁止 browser bundle 包含违禁依赖

## Non-Goals

- ~~修改 Dev Tool 或 Composer SDK 调用链~~
- ~~添加 DevToolAssetResolver、ComposerAssetResolver 或任何真实宿主实现~~
- ~~实现缓存、cancel、getStatus 等未来功能~~
- ~~删除旧的 load-image 路径~~
- ~~添加 Worker 架构~~
- ~~npm 外部发布~~

---

## Decisions

### D1: Package 命名和职责

**决策**: 创建 `packages/browser-runtime/` 包（发布名为 `@prism/browser-runtime`）。

**理由**:
- `browser-runtime` 直接反映"无 UI 浏览器执行"职责
- 与 `workflow-core`、`image-ops` 同级
- 不与现有包命名冲突
- monorepo 内使用 `@prism/` 前缀约定

---

### D2: 公开 API 设计

**决策**: 单一函数入口，不使用类封装：

```typescript
// packages/browser-runtime/src/index.ts

import type { RenderRequest, RenderResult } from '@prism/shared-types';
import type { AssetResolver } from './interfaces/asset-resolver';
import type { OutputSink } from './interfaces/output-sink';
import type { TemplateVersionResolver } from './interfaces/template-version-resolver';

export interface BrowserRuntimeOptions {
  /**
   * Resolves AssetRef from DesignState.inputs.assets to browser-compatible ImageData.
   * Only handles INPUT assets — does NOT generate previews or manage UI state.
   */
  assetResolver: AssetResolver;
  
  /**
   * Resolves TemplateVersion for given templateId + version.
   * Must be provided explicitly — no implicit fallback.
   */
  templateVersionResolver: TemplateVersionResolver;
  
  /**
   * Publishes executor outputs to stable ImageRef.
   * Only handles OUTPUT — does NOT resolve input assets.
   */
  outputSink: OutputSink;
}

/**
 * Execute a RenderRequest in the browser.
 * 
 * Input: complete RenderRequest (NOT designState + separate RenderOptions)
 * Output: RenderResult (M2 protocol, unchanged)
 * 
 * @throws ValidationError on invalid RenderRequest
 * @throws FlowResolverError on resolution failure
 * @throws Error on executor failure
 */
export function execute(
  request: RenderRequest,
  options: BrowserRuntimeOptions,
  runtimeOptions?: {
    signal?: AbortSignal;
    onProgress?: (progress: ExecutionProgress) => void;
  }
): Promise<RenderResult>;
```

**理由**:
- 单一函数比类封装更简洁，符合"最小 API"原则
- `options` 参数将三个依赖（resolver/sink/resolver）分组为语义单元
- 直接消费 `RenderRequest`（不是拆散的 `designState + flowKey`）
- `TemplateVersionResolver` 必填，不允许隐式 fallback（M2 决策）
- 返回标准 `RenderResult`，不定义 `BrowserRenderResult`

---

### D3: AssetResolver 接口

**决策**: 仅定义输入素材解析，不包含 preview 生成：

```typescript
// packages/browser-runtime/src/interfaces/asset-resolver.ts

import type { AssetRef } from '@prism/shared-types';

/**
 * Host-provided asset resolver — resolves DesignState input assets to
 * browser-compatible ImageData.
 * 
 * M3 scope: interface definition + test host memory implementation.
 * M4 scope: DevToolAssetResolver, ComposerAssetResolver.
 * 
 * Constraints:
 * - Only resolves INPUT assets (AssetRef → ImageData)
 * - Blob/ImageData/ImageBitmap exist ONLY in browser runtime memory
 * - Must NEVER write Blob/Canvas/ImageBitmap to DesignState/RenderRequest/RenderResult
 * - Must NEVER write blob URLs to persistent JSON
 * 
 * @example
 * // Inline asset (base64 encoded)
 * resolve({ id: 'user-upload-123', kind: 'inline', mimeType: 'image/png', checksum: 'sha256:...' })
 * 
 * // Remote asset (CDN/OSS URL)
 * resolve({ id: 'cdn-asset-456', kind: 'remote', url: 'https://...' })
 * 
 * // Prism-managed asset
 * resolve({ id: 'prism-asset-789', kind: 'prism-asset', url: '/api/assets/...' })
 */
export interface AssetResolver {
  resolve(assetRef: AssetRef): Promise<ImageData>;
}
```

**理由**:
- 符合 M2 协议约束：DesignState 必须 JSON 可序列化
- 与 OutputSink 分离，职责单一
- 宿主实现细节（M4）不影响 M3 接口设计
- test host 提供内存实现（MockAssetResolver）

---

### D4: OutputSink 接口

**决策**: 定义最小 executor output → ImageRef 转换：

```typescript
// packages/browser-runtime/src/interfaces/output-sink.ts

/**
 * Host-provided output sink — converts executor outputs to stable ImageRef.
 * 
 * M3 scope: interface definition + test host implementation.
 * M4 scope: DevToolOutputSink, ComposerOutputSink.
 * 
 * Responsibilities:
 * - Receive executor raw output (ImageData or ImageBitmap)
 * - Convert to stable ImageRef (data URL, blob URL, or CDN URL)
 * - Return ImageRef that can be serialized to RenderResult
 * 
 * Constraints:
 * - Must NEVER return Blob/Canvas/ImageBitmap in RenderResult
 * - Blob URLs must have cleanup tracking
 */
export interface OutputSink {
  /**
   * Publish an executor output to a stable reference.
   * @param nodeId - Source node ID for audit
   * @param slot - Output slot name
   * @param output - Raw executor output (ImageData in browser memory)
   * @returns ImageRef suitable for RenderResult
   */
  publish(nodeId: string, slot: string, output: unknown): ImageRef;
}
```

**理由**:
- 与 AssetResolver 边界清晰：输入解析 vs 输出发布
- 最小接口：`publish(nodeId, slot, output) → ImageRef`
- M3 test host 提供内存实现（MockOutputSink）
- 未来可扩展 CDN 上传、OSS 写入等（宿主实现）

---

### D5: TemplateVersionResolver 接口

**决策**: 定义精确的 TemplateVersion 获取接口：

```typescript
// packages/browser-runtime/src/interfaces/template-version-resolver.ts

/**
 * Host-provided TemplateVersion resolver.
 * 
 * Mirrors the M2-B `TemplateVersionCatalog` interface used by workflow-core.
 * Must be provided explicitly — no implicit fallback.
 * 
 * @example
 * const resolver: TemplateVersionResolver = {
 *   getVersion(templateId, version) { ... },
 *   currentVersion(templateId) { ... },
 * };
 */
export interface TemplateVersionResolver {
  /**
   * Get specific version of a template.
   * @returns TemplateVersion or undefined if not found
   */
  getVersion(templateId: string, version: string): TemplateVersion | undefined;
  
  /**
   * Get current (catalog-marked) version of a template.
   * @returns TemplateVersion or undefined if template not found
   */
  currentVersion(templateId: string): TemplateVersion | undefined;
}
```

**理由**:
- 复用 M2-B `TemplateVersionCatalog` 语义
- `getVersion` 精确查找，`currentVersion` 获取标记版本
- 与 workflow-core 的 `resolveTemplateVersion()` 配合
- 必须显式提供，不允许隐式 fallback（M2 决策）

---

### D6: image-ops 浏览器子入口设计

**决策**: 添加 `@prism/image-ops/browser` 导出条件：

```typescript
// packages/image-ops/src/browser-entry.ts

/**
 * @prism/image-ops/browser
 * 
 * Browser-only entry point — exports ONLY browser executors and helpers.
 * Does NOT export Sharp, Node executors, or any Node.js built-ins.
 * 
 * Usage:
 * import { browserExecutors, createCanvas } from '@prism/image-ops/browser';
 * 
 * This entry point is suitable for:
 * - @prism/browser-runtime (M3)
 * - Browser-only applications
 * - Chromium test hosts
 * 
 * DO NOT use this entry point in:
 * - Server-side rendering
 * - Node.js production workflows
 * - Applications requiring Sharp
 */

export { browserExecutors } from './browser/index';
export { createCanvas, makeImageData, getImageData, putImageData } from './browser/canvas-utils';
export { generatePreviewUrl, lazyPreviewStrategy, eagerPreviewStrategy } from './preview-strategy';

// Re-export core algorithms for reference (pure, no platform deps)
export { compositeImages } from './core/composite/composite';
export { applyMask } from './core/mask/mask';
export { blendModes } from './core/blend-modes';
```

```json
// packages/image-ops/package.json (新增)
{
  "exports": {
    ".": { /* existing */ },
    "./browser": {
      "browser": "./dist/src/browser-entry.js",
      "default": "./dist/src/browser-entry.js"
    }
  }
}
```

**理由**:
- 干净导入路径：`@prism/image-ops/browser` 只含浏览器代码
- 不需要完全重构 `load-image.ts`（见 D7）
- browser-runtime 从此入口导入，不导入整个 image-ops
- 现有 `executors.ts` 保持不变，向后兼容

---

### D7: load-image 处理策略

**决策**: 不完全重写 `load-image.ts`，而是创建 browser-resolver-backed load adapter：

**当前状态**:
- `load-image.ts` 直接使用 `window`/`document`/`fetch`/`URL.createObjectURL`
- 这些都是**标准浏览器 API**，browser runtime 可以使用
- 问题是 `load-image.ts` 依赖于全局 `window`，在某些环境可能不存在

**M3 方案**:
1. **保留** `load-image.ts` 现有调用方路径（Dev Tool、Composer SDK）
2. **新增** `packages/browser-runtime/src/internal/asset-resolver-backed-loader.ts`
   - 使用 `AssetResolver.resolve()` 获取 ImageData
   - 内部调用现有 `load-image.ts` 的解码逻辑（复用 OffscreenCanvas 转换）
3. **M4** 调用方迁移完成后，删除旧路径

**注意**: Browser Runtime 是**浏览器包**，允许使用标准 Browser API（`fetch`、`OffscreenCanvas`、`ImageData`）。"无 UI"不等于"不能使用浏览器 API"。

**理由**:
- 最小改动：M3 只增加 resolver-backed adapter
- 不改变现有 Dev Tool 行为（M3 不修改 Dev Tool）
- 不引入第二套长期实现（M4 完成后删除旧路径）
- 符合 explore 报告 D7 决策

---

### D8: @prism/node-definitions 调查结果

**决策**: `@prism/browser-runtime` **不需要**直接依赖 `@prism/node-definitions`。

**调查结论**:
- `@prism/node-definitions` 只依赖 `@prism/shared-types`（无 Node/React 依赖）
- 但 `globalRegistry.ts` 依赖 `@prism/image-ops`（含 Sharp）
- browser-runtime 使用 `workflow-core` 的 `WorkflowExecutor`，不需要 node definitions
- node definitions 是 Dev Tool UI 层使用的元信息，不影响执行引擎

**理由**:
- `WorkflowExecutor` 只需要 `NodeExecutorMap`（执行函数），不需要 `NodeDefinition[]`（元信息）
- 元信息（参数名、描述、类别）只在 Dev Tool UI 中使用
- browser-runtime 不需要显示节点信息给用户

**Future**: 如果未来需要类型验证，可以从 `image-ops` 内部复用 definitions，不直接依赖。

---

### D9: Package Boundary Gates

**决策**: 添加自动 bundle 分析测试，禁止 browser runtime bundle 包含违禁依赖：

```typescript
// packages/browser-runtime/src/__tests__/boundary-gates.test.ts

/**
 * Package Boundary Gates — verify browser-runtime does NOT contain forbidden deps.
 * 
 * Forbidden imports:
 * - react, @types/react
 * - zustand
 * - @prism/dev-tool
 * - @prism/composer-sdk
 * - @prism/server
 * - sharp
 * - @prism/image-ops/nodejs
 * - Node built-ins: fs, path, buffer, process, stream, crypto
 * - @prism/image-ops/src 深层导入（除了 /browser/）
 */

const FORBIDDEN_PACKAGES = [
  'react',
  'zustand',
  '@prism/dev-tool',
  '@prism/composer-sdk',
  '@prism/server',
  'sharp',
];

const FORBIDDEN_PATTERNS = [
  /@prism\/image-ops\/nodejs/,
  /@prism\/image-ops\/src\/(?!\/browser\/)/,  // Allow /browser/ only
  /\bfs\b/,
  /\bpath\b/,
  /\bBuffer\b/,
  /\bprocess\b/,
  /\bstream\b/,
  /\bcrypto\b/,
];

describe('package boundary gates', () => {
  it('should not import forbidden packages', async () => {
    const pkg = await readPackageJson('packages/browser-runtime');
    const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    const violations = deps.filter(d => FORBIDDEN_PACKAGES.includes(d));
    expect(violations).toHaveLength(0);
  });
  
  it('should not contain forbidden patterns in bundle', async () => {
    const bundle = await buildAndReadBundle('packages/browser-runtime');
    const violations = FORBIDDEN_PATTERNS.filter(p => p.test(bundle));
    expect(violations).toHaveLength(0);
  });
  
  it('should have correct exports map', async () => {
    const pkg = await readPackageJson('packages/browser-runtime');
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['.']).toBeDefined();
  });
});
```

**理由**:
- 自动化门禁，比人工 review 更可靠
- 防止 browser bundle 意外包含 Sharp/Node 代码
- 验证导出配置正确
- 可集成到 CI/CD

---

### D10: Chromium Test Host 设计

**决策**: 建立独立 Chromium test host，复用 M0 基础设施：

```
packages/browser-runtime/src/__tests__/
  ├─ chromium/
  │   ├─ chromium-host.html          ← Test HTML page (独立于 _m0_evidence)
  │   ├─ chromium-runner.ts         ← Playwright 启动器
  │   └─ chromium-verify.ts        ← 10 项验证
  ├─ fixtures/
  │   ├─ minimal-template-version.ts
  │   ├─ minimal-design-state.ts
  │   └─ minimal-render-request.ts
  └─ browser-runtime.test.ts         ← 主测试文件
```

**10 项 Chromium 验证条件**（来自用户需求）:

```typescript
// packages/browser-runtime/src/__tests__/chromium/chromium-verify.ts

interface ChromiumVerification {
  id: string;
  description: string;
  verify: () => Promise<boolean>;
}

export const CHROMIUM_VERIFICATIONS: ChromiumVerification[] = [
  {
    id: 'browser-runtime-can-be-created',
    description: 'Browser Runtime can be created independently',
    async verify() {
      const runtime = createBrowserRuntime({ ... });
      return runtime !== undefined;
    },
  },
  {
    id: 'no-dev-tool-dependency',
    description: 'Does not depend on Dev Tool, Composer, or React',
    async verify() {
      const bundle = await buildAndReadBundle();
      return !/react|@prism\/dev-tool|@prism\/composer-sdk/.test(bundle);
    },
  },
  {
    id: 'executes-design-state-flow-key',
    description: 'Precisely executes DesignState.flowKey',
    async verify() {
      const result = await execute(minimalRenderRequest, options);
      return result.designState.flowKey === 'preview.main';
    },
  },
  {
    id: 'returns-multiple-output-slots',
    description: 'Returns at least two explicit output slots',
    async verify() {
      const result = await execute(minimalRenderRequest, options);
      return result.outputs.length >= 2;
    },
  },
  {
    id: 'requested-output-slots-effective',
    description: 'requestedOutputSlots filter is effective',
    async verify() {
      const result = await execute(requestWithOneSlot, options);
      return result.outputs.length === 1;
    },
  },
  {
    id: 'output-order-follows-explicit-outputs',
    description: 'Output order follows Flow.explicitOutputs declaration',
    async verify() {
      const result = await execute(minimalRenderRequest, options);
      const expectedOrder = ['mockup', 'cutting-preview'];
      return expectedOrder.every((slot, i) => result.outputs[i]?.slot === slot);
    },
  },
  {
    id: 'unknown-slot-returns-error',
    description: 'Unknown slot returns M2 explicit error',
    async verify() {
      try {
        await execute(requestWithUnknownSlot, options);
        return false; // Should have thrown
      } catch (e) {
        return e.code === 'REQUESTED_OUTPUT_UNKNOWN';
      }
    },
  },
  {
    id: 'bundle-excludes-sharp',
    description: 'Runtime bundle does not include Sharp',
    async verify() {
      const bundle = await buildAndReadBundle();
      return !/sharp/.test(bundle);
    },
  },
  {
    id: 'no-canvas-polyfill',
    description: 'Does not load canvas npm polyfill',
    async verify() {
      const page = await chromiumPage;
      const canvasPolyfillLoaded = await page.evaluate(() => {
        // Check that we're using native OffscreenCanvas, not polyfill
        return typeof (globalThis as any).__canvasPolyfill !== 'undefined';
      });
      return !canvasPolyfillLoaded;
    },
  },
  {
    id: 'chromium-tests-pass',
    description: 'Package build, typecheck, and Chromium tests pass',
    async verify() {
      const results = await Promise.all([
        exec('pnpm build --filter @prism/browser-runtime'),
        exec('pnpm typecheck --filter @prism/browser-runtime'),
        exec('pnpm vitest run --filter @prism/browser-runtime'),
      ]);
      return results.every(r => r.exitCode === 0);
    },
  },
];
```

**理由**:
- 复用 M0 已验证的 Chromium 基础设施
- 独立于 `_m0_evidence` 私有目录
- 10 项验证覆盖用户所有要求
- 自动化验证，可集成到 CI

---

## Architecture Review

### A1: 当前结构分析

```
当前架构：

apps/dev-tool
  ├─ store/canvasStore.ts (Zustand)
  ├─ services/executionService.ts
  │    └─ globalRegistry.initialize()
  │         └─ nodeExecutors from @prism/image-ops
  └─ components/canvas/* (React UI)

packages/image-ops
  ├─ src/browser/*.ts (browser executors) ← 可以抽取
  ├─ src/nodejs/*.ts (Sharp) ← 浏览器不能用
  ├─ src/load-image.ts (强依赖 window) ← 需要改造
  └─ src/preview-strategy.ts (OffscreenCanvas)

packages/workflow-core
  ├─ executor.ts (纯引擎)
  ├─ flow-resolver.ts (M2)
  └─ flow-execution.ts (M2)

问题：
1. Dev Tool 强耦合 Zustand
2. image-ops 直接使用 window/document
3. 没有独立 browser runtime 包
4. load-image.ts 无法在隔离环境运行
```

**问题**:
- Dev Tool 预览逻辑无法被 Composer SDK 复用
- Browser 执行链强依赖 UI 层
- 没有干净的 browser-only 导入路径

### A2: 方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A: 创建 `@prism/browser-runtime`，依赖全局 `globalRegistry` | 复用现有初始化逻辑 | 依赖 `@prism/core`（含 Sharp） | ❌ |
| B: 创建 `@prism/browser-runtime`，直接从 `@prism/image-ops/browser` 导入 | 干净导入路径 | 需要新增 browser 子入口 | ✅ |
| C: 修改 `load-image.ts` 支持 nodejs 路径 | 统一代码 | 改动大，影响现有调用方 | ❌ |
| D: 在 browser-runtime 内部复制 image 算法 | 完全隔离 | 违反"不复制引擎"原则 | ❌ |

**选择 B**：新增 `@prism/image-ops/browser` 子入口，browser-runtime 从此导入。

---

## Data Flow

```
Browser Runtime 执行流程

RenderRequest
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  execute(request, options)                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Validate RenderRequest (ajv)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 2. options.templateVersionResolver.getVersion()     │   │
│  │    → TemplateVersion                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 3. resolveFlow(templateVersion, designState.flowKey)│   │
│  │    → Flow (M2 explicit)                              │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 4. For each asset in designState.inputs.assets:     │   │
│  │    options.assetResolver.resolve(assetRef)           │   │
│  │    → ImageData                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 5. executeFlow(executor, flow, designState)        │   │
│  │    → executor outputs                               │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 6. For each output in flow.explicitOutputs:         │   │
│  │    options.outputSink.publish(nodeId, slot, output) │   │
│  │    → ImageRef                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│    │                                                         │
│    ▼                                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 7. mapFlowResultToRenderResult()                    │   │
│  │    → RenderResult (M2 protocol)                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
RenderResult
```

---

## File Changes

### 新增文件

| 文件 | 用途 |
|------|------|
| `packages/browser-runtime/package.json` | 包定义 |
| `packages/browser-runtime/tsconfig.json` | TypeScript 配置 |
| `packages/browser-runtime/vitest.config.ts` | Vitest 配置（含 Chromium） |
| `packages/browser-runtime/src/index.ts` | 公开 API：`execute()` |
| `packages/browser-runtime/src/interfaces/asset-resolver.ts` | AssetResolver 接口 |
| `packages/browser-runtime/src/interfaces/output-sink.ts` | OutputSink 接口 |
| `packages/browser-runtime/src/interfaces/template-version-resolver.ts` | TemplateVersionResolver 接口 |
| `packages/browser-runtime/src/internal/create-executor.ts` | 内部 executor 创建 |
| `packages/browser-runtime/src/internal/execute-impl.ts` | 执行实现 |
| `packages/browser-runtime/src/__tests__/browser-runtime.test.ts` | 主测试文件 |
| `packages/browser-runtime/src/__tests__/chromium/chromium-host.html` | Chromium 测试页面 |
| `packages/browser-runtime/src/__tests__/chromium/chromium-runner.ts` | Playwright 启动器 |
| `packages/browser-runtime/src/__tests__/chromium/chromium-verify.ts` | 10 项验证 |
| `packages/browser-runtime/src/__tests__/boundary-gates.test.ts` | Package boundary 测试 |
| `packages/browser-runtime/src/__tests__/fixtures/*.ts` | 固定 fixture |
| `packages/image-ops/src/browser-entry.ts` | 浏览器子入口 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/image-ops/package.json` | 添加 `browser` 导出条件 |
| `pnpm-workspace.yaml` | 注册 `packages/browser-runtime` |

### 删除文件

无

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | RenderRequest/RenderResult 类型正确 | TypeScript 检查 |
| Core | browser-runtime 不依赖 Node/React | boundary-gates 测试 |
| Build | `pnpm build --filter @prism/browser-runtime` | CI 验证 |
| Test | Chromium 10 项验证通过 | Playwright 测试 |
| API | `execute()` 符合公开 API 规范 | 单元测试 |
| Protocol | M2 协议兼容性 | 集成测试 |
| Boundary | package gates 全部通过 | 自动测试 |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| browser-runtime bundle 包含 Sharp | 低 | 高 | boundary-gates 测试 |
| `load-image.ts` 无法在隔离环境运行 | 中 | 中 | M3 只增加 adapter，不重写 |
| Playwright Chromium 路径不一致 | 低 | 低 | 复用 M0 工具 |
| TypeScript 循环依赖 | 低 | 高 | `tsc --noEmit` 验证 |
| image-ops browser 子入口破坏现有导出 | 低 | 中 | 现有导出保持不变 |

---

## Quality Compliance

本设计遵循 [项目全局质量与交付规范](../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序: 不涉及（M2 已验证）
- 节点级错误隔离: executor 输出验证通过 try/catch
- Cancellation 链路: AbortSignal 通过 workflow-core 传递

### 不变量检查

- Node Registry: browser executors 来自 image-ops，无新增 type
- API 契约: M2 协议不变，browser-runtime 只组合不修改

### 测试策略

- [x] 单元测试: 接口定义 + 边界测试
- [x] 集成测试: RenderRequest → RenderResult 端到端
- [x] Chromium 测试: 10 项验证
- [x] Bundle 分析: boundary-gates 测试

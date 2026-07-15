# Prism Editor 执行架构分析

> 调查对象：`packages/image-ops`、`packages/workflow-core`、`apps/dev-tool`、`server/src`
> 调查原则：只读源码、不安装依赖；结论标注 `[已确认]` / `[推断]`

---

## 1. 执行引擎：两条路径

| 维度 | 浏览器（dev-tool） | 服务端（server） |
|---|---|---|
| 执行器类 | `WorkflowExecutor`（`@prism/workflow-core`） | `WorkflowExecutorNodeJs` |
| 初始化位置 | `executionService.ts:17-18` | `render.ts:17` |
| 执行方式 | 浏览器主线程 + Web Worker 池 | Node.js 单进程 |
| 节点执行器来源 | `globalRegistry.initialize()` → `nodeExecutors`（`image-ops/src/executors.ts`） | 直接 import `nodeExecutors` from `@prism/image-ops/nodejs` |
| 缓存 | LRU 缓存（默认启用） | 缓存对象已实例化但 `execute()` 调用时未传入 |

**关键区别**：浏览器走 `globalRegistry`，服务端直接 import。两者共享同一套节点类型定义，但绑定的执行函数不同（browser vs nodejs）。

---

## 2. 像素算法：三层分离

```
┌─────────────────────────────────────────────────┐
│  Layer 1: core/ （纯函数，无副作用）             │
│   ├── composite/composite.ts → compositeImages() │
│   └── mask/mask.ts → applyMask()                │
├─────────────────────────────────────────────────┤
│  Layer 2: browser/ / nodejs/ （平台 I/O 包装）  │
│   读取 → 调用 core → 输出                        │
├─────────────────────────────────────────────────┤
│  Layer 3: image-ops/src/ （对外 API + Worker）   │
│   composite/transform/apply-mask executor        │
└─────────────────────────────────────────────────┘
```

**结论**：`compositeImages`（Porter-Duff 合成 + 13 种混合模式）和 `applyMask`（alpha/brightness/luminance 遮罩）在两端完全相同。`transform` 变换逻辑两端独立实现。

---

## 3. TransformExecutor：像素坐标系统

### 浏览器（`image-ops/src/browser/TransformExecutor.ts`）

- 坐标单位：**像素**（整数）
- 变换方式：Canvas 2D 变换矩阵
  ```
  translate(outWidth/2, outHeight/2)
  → scale(scaleX, scaleY)
  → rotate(rotation * Math.PI / 180)
  → translate(-outWidth/2, -outHeight/2)
  → drawImage(...)
  ```
- 旋转单位：**度**（°），自动转弧度
- 裁剪：`cropX / cropY / cropWidth / cropHeight` 直接作为 `extract()` 参数
- 缩放：`cropWidth * |scaleX|` → 输出宽度，`cropHeight * |scaleY|` → 输出高度
- **不支持透视变换**，仅 affine

### Node.js（`image-ops/src/nodejs/transform-executor.ts`）

- 坐标单位：**像素**（整数）
- 变换方式：sharp 管道 `.extract() → .resize() → .rotate()`
- 旋转单位：**度**（°），sharp 接受数值（自动转弧度）
- **Translation 不改变像素**：translateX/Y 存储在输出的 `position.x / position.y` 字段，**不参与图像变换**

```77:77:packages/image-ops/src/nodejs/transform-executor.ts
const finalX = Math.floor(translateX)
const finalY = Math.floor(translateY)
output.position = { x: finalX, y: finalY }
```

**结论**：变换逻辑两端独立实现，但参数含义一致（像素 + 度）。Translation 在 node 端仅记录坐标，不平移像素。

---

## 4. CompositeExecutor：混合模式与合成

### 核心算法（两端共用）

```115:119:packages/image-ops/src/core/composite/composite.ts
const blended = blendPixel(basePx, ovPx, blendMode)   // 13 种混合模式
const [r, g, b, a] = compositePixel(basePx, blended, opacity) // Porter-Duff Source-Over
```

### 混合模式（`core/composite/blend-modes.ts`）

`normal` / `multiply` / `screen` / `overlay` / `darken` / `lighten` / `color-dodge` / `color-burn` / `hard-light` / `soft-light` / `difference` / `exclusion`

### 平台包装差异

| | 浏览器 | Node.js |
|---|---|---|
| 读取像素 | `canvas.getContext('2d').getImageData()`（预乘 alpha） | `sharp().raw().toBuffer()` |
| 写入像素 | `canvas.putImageData()` | `sharp.fromBuffer().png().toBase64()` |
| globalCompositeOperation | **不使用** | N/A |
| 预乘 alpha 处理 | 是（避免半透明边缘黑边） | sharp 自动处理 |

### 输出格式

浏览器：`HTMLCanvasElement` → `canvas.toDataURL('image/png')`
Node.js：`sharp` → base64 → `data:image/png;base64,...`

**结论**：合成算法两端完全一致，均为纯像素运算。`globalCompositeOperation` 未被使用。

---

## 5. Web Worker 与 OffscreenCanvas（浏览器）

### Worker 架构

```
WorkerPool (image-ops/src/scheduler/workerRunner.ts:54)
 └── ImageWorker[] × N
      └── OffscreenCanvas + Comlink
```

### 分发策略（`image-ops/src/laneSelector.ts`）

| 节点类型 | 执行位置 |
|---|---|
| `load-image` / `load-mask` / `export` | 主线程（DOM API / Blob） |
| `composite` / `transform` / `apply-mask` | Worker 优先，回退主线程 |

### Worker 中的像素操作

Worker 内同样调用 `core/compositeImages` 和 `core/applyMask`。CanvasPool 管理 `OffscreenCanvas` 复用，避免频繁分配。

**结论**：图像处理密集操作在 Worker 线程，I/O 和输出操作在主线程。

---

## 6. 执行缓存机制

### WorkflowExecutor（`packages/workflow-core/src/executor.ts`）

```134:149:packages/workflow-core/src/executor.ts
const inputsHash = hashInputs(nodeInputs)
if (cache) {
  const cached = cache.get(ctx.workflowId, nodeId, inputsHash)
  if (cached) return { outputs: cached.result, failed: false }
}
```

缓存 key：`workflowId:nodeId:inputsHash`（输入值哈希）。

**缓存状态**：

| 调用方 | 缓存状态 |
|---|---|
| dev-tool（`executionService.ts`） | 未传入 cache → **未启用** |
| server（`render.ts`） | `new WorkflowExecutorNodeJs({ nodeExecutors })` → 未传 cache → **未启用** |
| 测试文件 | 传入了 `enableCache: true` |

### 脏检测策略

**无增量更新**。每次触发执行均从 topological level 0 重新遍历全图。中间节点若有缓存则直接返回（节省计算），但这依赖输入哈希匹配，不是真正的依赖图脏标记。

---

## 7. 服务器渲染管线分析

### 端点：`POST /api/render/template`

```19:24:server/src/routes/render.ts
interface RenderTemplateBody {
  templateId: string
  userParams?: Record<string, unknown>
  inputs?: Record<string, unknown>
  format?: 'png' | 'jpeg'
}
```

### 关键缺陷

**[已确认] `userParams` 和 `inputs` 完全未绑定。**

```55:55:server/src/routes/render.ts
const { templateId, format = 'png' } = request.body
```

两者在接口定义中存在，但在路由层被静默丢弃，不传入 executor。这意味着 workflow JSON **必须自包含所有参数**，无法在请求时注入 runtime 变量。

### Flow 选择逻辑

```177:185:server/src/services/product-template-service.ts
const flow = await prisma.workflow.findFirst({
  where: { templateId, platform: 'nodejs' },
})
```

- `findFirst` — **多 flow 场景非确定性**，取决于插入顺序
- 无 `flowType` / `purpose` 字段区分 mockup / production / cutting-preview
- `platform` 仅 `browser` / `nodejs` 二选一

### 超时与取消

- 30 秒硬超时（`setTimeout → AbortController.abort()`）
- executor 在每个 topological level 边界检查 `checkAborted()`
- 取消时返回 504 `RENDER_TIMEOUT`，但已执行节点不回滚

### 输出提取

```83:97:server/src/routes/render.ts
const finalNodeId = Object.keys(results).pop() ?? ''  // 取最后一个节点
const previewUrl = finalOutput?.previewUrl ?? (finalOutput.image as any).previewUrl
```

依赖 `Object.keys()` 遍历顺序，**对并行 DAG 或非最后输出的场景脆弱**。

---

## 8. composer-sdk 与 dev-tool 的关系

| | composer-sdk | dev-tool |
|---|---|---|
| 定位 | 嵌入 PS 风格图层编辑器（mall 接入面） | 可视化工作流构建 + 预览 |
| 状态管理 | `useComposerStore`（Zustand v5） | `useCanvasStore`（Zustand v4） |
| 工作流引擎 | **无** — 仅 Canvas 2D 即时复合 | `WorkflowExecutor` 全链路 |
| 渲染内容 | `layers[]` → `<canvas>` 实时合成 | `nodes[]` + `edges[]` → executor → 结果图 |
| 提交数据 | `ComposerSubmitParams`（完整图层快照，含所有 transform/mask/blend 参数） | 无直接提交接口 |
| 状态共享 | 独立 store，无同步机制 | 独立 store，无同步机制 |

**[已确认]**：`composer-sdk` 和 `useCanvasStore` 完全独立，无共享状态。

---

## 9. 包依赖与遗留代码

### 包可独立发布性

| 问题 | 状态 |
|---|---|
| `"private": true` | 所有 packages 均标记 |
| `workspace:*` 依赖 | `@prism/image-ops` / `@prism/shared-types` 无法外部解析 |
| sharp native 模块 | `image-ops` 依赖，无法在浏览器裸环境运行 |
| React peerDeps | `composer-sdk` 要求 `>= 17`，**不包含 React 19** |

**结论**：当前无法作为独立 npm 包发布。

### 遗留代码清单

| 概念 | 状态 |
|---|---|
| `PublishedWorkflowExecutor` | 代码已删除，`packages/workflow-core/README.md` 仍文档化 |
| `SnippetSummary` | 类型定义残留，CRUD stubbed → `[]` |
| `RenderProductionModal` → `POST /api/skus/:id/render` | 后端无 `/api/skus` 路由，死代码 |
| `apps/user-app/` | 目录不存在（Phase 2 决策撤销） |
| IndexedDB v1→v2 迁移 | `migrateFromLocalStorage()` 存在但 upgrade handler 不迁移数据 |
| Zustand 版本差异 | dev-tool v4，composer-sdk v5 |
| `/api/workflow` / `/api/batch` | 410 Gone tombstone |

---

## 10. 关键发现汇总

1. **服务端渲染参数注入缺失**：`userParams` / `inputs` 被静默丢弃，接入方无法动态传入变量
2. **多 flow 选择不确定**：`findFirst` 语义在多 flow 场景不可预测
3. **Translation 在 node 端仅记录坐标**：不平移像素，与浏览器行为差异
4. **执行缓存均未启用**：dev-tool 和 server 均未传入 cache 选项
5. **输出提取依赖遍历顺序**：非最后节点场景可能提取错误
6. **composer-sdk 无状态同步**：与 dev-tool store 完全独立
7. **遗留代码需清理**：`SnippetSummary` / `RenderProductionModal` / `README` 漂移
8. **Worker/OffscreenCanvas 架构健壮**：浏览器端并行化已实现，错误处理和回退机制完整

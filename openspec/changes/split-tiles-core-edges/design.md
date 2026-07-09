# Design

> 核心 store / composer / worker 边缘 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Goals

1. 把 2 个核心边缘 tile（sizing helper + imageToImageData）抽到独立文件。
2. 严格不触碰 `useCanvasStore.ts` 与 `imageWorker.worker.ts` 核心算法。
3. 所有拆分走 Facade / Wrapper 外壳保留法。
4. 每个 tile 在 `docs/refactor-map.md` 追加块摘要。

## Non-Goals

- ~~拆 `useCanvasStore.ts` 任何一行~~
- ~~拆 `imageWorker.worker.ts` 的 mask / transform / export 算法~~
- ~~拆 `workerPool.ts` 的 queue / execute / replace 逻辑~~
- ~~改 SDK 公开 API 类型~~
- ~~改 Prisma schema / node schema~~

---

## Decisions

### D1：仅拆边缘纯函数

`workerPoolSizing`（16-44）和 `imageToImageData`（23-31）都是无副作用的纯函数，抽出风险最低。

### D2：路径选择

- `packages/image-ops/src/scheduler/workerPoolSizing.ts`：与 `workerPool.ts` 同目录 sibling。
- `packages/composer-sdk/src/utils/imageToImageData.ts`：放在新建 `utils/` 目录，未来 SDK 工具函数增多时便于扩展。

### D3：旧文件策略

- `workerPool.ts`：删除 sizing 本体，改为 `import { ... } from './workerPoolSizing';`。queue / execute / replace 主体不变。
- `ComposerCanvas.tsx`：删除 `imageToImageData` 本体，改为 `import { imageToImageData } from './utils/imageToImageData';`。组件逻辑不变。

---

## Architecture Review

### A1：当前结构分析

```text
packages/image-ops/src/
├─ scheduler/
│  └─ workerPool.ts (621)  ← sizing helper 16-44 + queue/execute/replace
└─ worker/
   └─ imageWorker.worker.ts (1042)  ← 核心算法，不动
packages/composer-sdk/src/
└─ ComposerCanvas.tsx (546)  ← imageToImageData 23-31 + 组件主体
```

### A2：方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A. 仅拆 2 个 tile，不动核心 | 风险最低、可回滚 | 仍是分阶段 | ✅ |
| B. 同时拆 store / worker 核心 | 一次到位 | 风险极高、回滚困难 | ❌ |
| C. 不拆 | 零风险 | 体积墙存在 | ❌ |

### A3：与 Phase 3 协调

`phase3-composer-sdk-completion` 已 archive（最新 commit `51c4485 fix: add visible/locked fields to LayerPanel mockLayers for T1.3` 之后不再有 phase3 commit，且 `openspec/changes/phase3-composer-sdk-completion/` 已被 git 删除）。本子 change 的 ComposerCanvas 部分仅动 `imageToImageData` helper（23-31 段），与 Phase 3 改过的 LayerPanel / mask / undo-redo 不重叠。

---

## File Changes

### 新增文件

| 文件 | 用途 |
|------|------|
| `packages/image-ops/src/scheduler/workerPoolSizing.ts` | sizing 纯函数本体 |
| `packages/composer-sdk/src/utils/imageToImageData.ts` | imageToImageData 纯函数本体 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/image-ops/src/scheduler/workerPool.ts` | 删除 16-44 sizing 本体；改为 import |
| `packages/composer-sdk/src/ComposerCanvas.tsx` | 删除 23-31 imageToImageData 本体；改为 import |
| `docs/refactor-map.md` | 追加 2 个 tile 块摘要 |

### 不修改文件

- `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`
- `packages/image-ops/src/worker/imageWorker.worker.ts`
- `packages/image-ops/src/scheduler/workerPool.ts` 的 queue / execute / replace 段
- `packages/composer-sdk/src/ComposerCanvas.tsx` 的组件主体

---

## API Design

不引入新 API。`workerPool` / `ComposerCanvas` 公开签名不变。

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | 子 change 的 proposal/design/tasks 完整 | `openspec validate --changes split-tiles-core-edges` |
| Core | typecheck | `pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk` |
| Test | image-ops + composer-sdk 测试 | `pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk` |
| 不变量 | useCanvasStore / imageWorker 未改 | `git diff --stat` |
| 缓存 | refactor-map.md 至少 2 个 tile 摘要 | 文本搜索 |

---

## 子 change 调度

本子 change C 在父 change 调度中位于第 3 位（B 完成后执行）。
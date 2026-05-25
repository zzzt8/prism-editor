# design: image-ops-runtime-core-foundation

## Goals

1. 将 `composite.ts` 的核心像素计算逻辑抽离为纯函数集合，置于 `core/` 目录
2. 保持 browser executor 层 (`composite.ts`) 行为完全不变
3. core 层零浏览器 API 依赖，可在 Node.js 直接调用
4. 建立后续 nodejs executor 的目录结构和调用约定

## Non-Goals

- 不实现 nodejs executor（后续 change）
- 不引入 sharp 或其他 Node.js 图像库
- 不拆分 apply-mask、transform、load-image、export 节点
- 不改造 node-definitions 或 dev-tool

---

## Decisions

### D1: core 层文件拆分粒度

**Decision**: 将 composite 核心逻辑拆为 4 个单一职责模块：`blend-modes.ts`、`porter-duff.ts`、`alpha-format.ts`、`composite-math.ts`。

**Alternatives considered**:

*Single file (`composite-math.ts`)*：将所有逻辑写在一个文件。缺点是职责混在一起，后续其他节点（如 mask、transform）也需要共享 alpha-format 和 porter-duff 逻辑，文件会变得臃肿且难以复用。

*按节点拆分（`core/composite/*.ts`）*：过深目录结构，且 alpha-format 和 porter-duff 不属于 composite 专属逻辑。

*按职责拆分（`blend-modes.ts`、`porter-duff.ts`、`alpha-format.ts`、`composite-math.ts`）*：当前选择。职责清晰、复用路径明确（mask 节点未来也可用 alpha-format）、目录扁平。

**Resolution**: 采用 4 模块拆分，后续节点（apply-mask、transform）的 core 层与这些模块对齐。

---

### D2: core 层依赖约束

**Decision**: `core/` 目录内的文件**禁止**引入任何浏览器或 Node.js 特有 API，仅使用 Web Standard 类型（`ImageData`、原生数组）。

**Rationale**: core 层的价值在于跨平台可移植。只有不依赖任何平台 API，才能确保 Node.js executor 直接复用。当前 `composite.ts` 中的 `createCanvas`/`makeImageData` 调用（已兼容 Node.js canvas npm）是 executor 层关注的事，不应进入 core。

**Implication**: `core/` 内的 `makeImageData` 不属于 core 层。core 层只负责计算，输入输出都是 caller 负责。

---

### D3: 现有 executor 改造策略

**Decision**: `composite.ts` 改造为 executor 胶水层，核心逻辑委托 `core/composite-math.ts`。

**Before**（`composite.ts` 中 `compositeImages` 函数）:
- 包含 blendPixel、detectAlphaFormat、unPremultiply、blendPixel 常量逻辑
- 直接创建 canvas 和 ImageData

**After**:
- executor 仍保持原接口（`NodeExecutor` 函数签名）
- 内部调用 `core/composite-math.ts` 的纯函数处理像素
- canvas/ImageData 创建逻辑保留在 executor 层

```ts
// composite.ts (executor layer) — 调用 core 纯函数
import { compositeImages as compositeImagesCore } from './core/composite-math';

// executor 保持 NodeExecutor 签名
export const compositeExecutor: NodeExecutor = async (inputs, params, ctx) => {
  // ... 参数解析、输入 unwrap（不变）
  // ...
  // 计算逻辑委托 core
  const result = compositeImagesCore(base, overlayData, {
    blendMode, opacity, canvasWidth, canvasHeight, overlayX, overlayY,
  });
  // ... preview 生成、IRO 封装（不变）
};
```

**Rationale**: 最小化破坏性改动。executor 的职责（参数解析、preview 生成、IRO 输出）与 core（像素计算）解耦，各自独立演进。

---

### D4: serialComposite / parallelComposite 归属

**Decision**: `serialComposite` 和 `parallelComposite` 保留在 `composite.ts`（executor 层），不进入 core。

**Rationale**: Web Worker 调度和并行策略是 browser executor 的运行时关注点，不属于核心像素计算。core 层只负责给定 ImageData → 计算 → 返回 ImageData 的单次运算。

---

## Architecture Review

### 整体架构

```
packages/image-ops/src/
├── core/                           ← 新增（纯算法，零平台依赖）
│   ├── blend-modes.ts              ← blend mode 像素运算
│   ├── porter-duff.ts              ← Source-Over compositing
│   ├── alpha-format.ts             ← premultiplied/straight 检测与转换
│   ├── composite-math.ts           ← compositeImages 纯函数
│   └── index.ts                    ← 统一导出
├── composite.ts                    ← 改造（executor 胶水层）
└── [其他节点文件不变]
```

调用链：
```
compositeExecutor (composite.ts)
  └─ compositeImages (core/composite-math.ts)
       ├─ detectAlphaFormat (core/alpha-format.ts)
       ├─ unPremultiply (core/alpha-format.ts)
       ├─ blendPixel (core/blend-modes.ts)
       └─ Source-Over lerp (core/porter-duff.ts)
```

### 验证计划

本 change 的核心验证点是：**改造后 composite 节点的视觉输出与改造前完全一致**。通过像素级 diff 测试确保。

---

## Review Checklist

- [ ] `core/` 目录内无任何 `typeof window`、`typeof Worker`、`require('canvas')`、`import 'sharp'` 等平台特有代码
- [ ] `composite.ts` 的 executor 函数签名和输出格式（CompositeExecutorOutput）与改造前完全一致
- [ ] 现有 `composite.test.ts` 全部通过（像素级 diff 为 0）
- [ ] `core/composite-math.ts` 纯函数可独立导入和测试
- [ ] `core/index.ts` 导出所有 core 模块
- [ ] dev-tool 和 user-app 无需任何改动即可正常工作

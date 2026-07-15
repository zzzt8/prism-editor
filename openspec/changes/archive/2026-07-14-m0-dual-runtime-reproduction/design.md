# Design: M0 - 双端执行器几何一致性验证

## Goals

1. 用确定性测试 fixture 验证 Browser `transformExecutor` 与 Node `transformExecutor` 的几何输出一致性
2. 量化两端语义差异（translate/rotation anchor），记录但不强制统一
3. 建立 M0 完成基准：核心场景尺寸 100% 一致，像素 diff < 0.5%

## Non-Goals

- 不修改任何现有 executor 实现
- 不建立正式公共协议
- 不修改 shared-types 或 workflow-core

---

## Architecture Review

### 现状分析

**Browser executor** (`packages/image-ops/src/browser/TransformExecutor.ts`)：
- 使用 Canvas 2D API 实现变换
- 旋转 anchor 为画布中心 (`outWidth/2, outHeight/2`)
- translate 通过 `ctx.translate()` 实际位移像素
- 支持任意角度旋转

**Node executor** (`packages/image-ops/src/nodejs/transform-executor.ts`)：
- 使用 sharp 库实现变换
- 旋转 anchor 为 top-left（sharp 默认）
- translate 只记录 `position` offset，不移动像素
- 仅支持 90° 整数倍旋转

### 替代方案考虑

| 方案 | 描述 | 决策 |
|------|------|------|
| A: 只测 Node | 忽略 Browser executor | 放弃 — 架构护栏要求两端一致性验证 |
| B: 统一 executor | 修改两端实现使其语义完全一致 | 放弃 — 属于 M1+ 范围 |
| C: 量化差异 + 测试一致性 | M0 仅量化差异，建立测试基线 | **采用** — 符合 M0 定义 |

---

## Design Decisions

### Decision 1: Fixture 生成方式

**选择**: 程序化 `Uint8ClampedArray` 生成纯色图片

```typescript
// 纯色图片工厂
function makeColorImageData(width, height, r, g, b, a = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4]     = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, width, height);
}
```

**理由**: 无外部文件依赖，确定性，无 IO，不污染 CI 环境

---

### Decision 2: 像素 diff 容忍度

**选择**: RGB ±2 通道，允许 0.5% 像素差异

```typescript
const TOLERANCE = 2;        // RGB 通道容忍度
const SIZE_TOLERANCE = 0.5; // 允许 0.5% 像素差异
```

**理由**:
- Browser Canvas 和 Node sharp 的抗锯齿算法不同
- 浮点取整在 V8 和原生库之间可能有 ±1 差异
- 0.5% 足够宽松能覆盖正常差异，足够严格能捕获语义错误

---

### Decision 3: Browser executor 调用路径

**选择**: 使用 `@vitest/browser` + playwright provider 在 Node 测试环境运行 Browser executor

**理由**:
- 与现有 vitest 测试框架一致
- playwright provider 支持 OffscreenCanvas
- 不需要修改现有 executor 代码

**备选**: jsdom canvas mock（已排除 — jsdom 不支持 OffscreenCanvas）

---

### Decision 4: 测试参数范围

**选择**: 固定 5 个场景参数组合

| 场景 | translateX | translateY | scaleX | scaleY | rotation |
|------|-----------|-----------|--------|--------|----------|
| identity | 0 | 0 | 1 | 1 | 0 |
| scale-2x | 0 | 0 | 2 | 2 | 0 |
| rotate-90 | 0 | 0 | 1 | 1 | 90 |
| scale+rotate | 0 | 0 | 0.5 | 0.5 | 180 |
| translate+scale | 10 | 10 | 1.5 | 1.5 | 0 |

**理由**:
- 覆盖 scale / rotate / translate 三个独立维度
- rotation 仅使用 90° 倍数（兼容 Node executor 限制）
- 不穷举所有组合，符合 M0 "最小验证" 原则

---

## 已知语义差异（显式记录）

| 维度 | Browser | Node | 测试策略 |
|------|---------|------|---------|
| 旋转 anchor | 画布中心 | top-left | 测试 rotate-90 场景尺寸一致性 |
| translate 语义 | 像素实际位移 | 仅记录 offset | 标注 `it.skip`，M1 统一协议时解决 |
| 旋转范围 | 任意角度 | 仅 90° 倍数 | rotation 测试仅用 90° 倍数 |

---

## Test Structure

```
dual-executor-consistency.test.ts
├── describe: 'M0 Dual Runtime Consistency'
│   ├── beforeAll: 生成 fixture（20×20 底图 + 8×8 用户图）
│   ├── describe: 场景测试
│   │   ├── it: identity transform
│   │   ├── it: scale-2x transform
│   │   ├── it: rotate-90 transform
│   │   ├── it: scale+rotate transform
│   │   └── it: translate+scale transform
│   ├── describe: 语义差异记录（it.skip）
│   │   ├── it.skip: translate pixel displacement
│   │   └── it.skip: arbitrary rotation angle
│   └── describe: 确定性验证
│       └── it: same input produces identical output
```

---

## Verification Plan

| 验证项 | 命令 | 成功标准 |
|--------|------|---------|
| 测试可运行 | `pnpm --filter @prism/image-ops test -- --run dual-executor-consistency` | 退出码 0 |
| 尺寸一致 | 断言 | `browserResult.width === nodeResult.width` |
| 几何 diff | 断言 | `diffPercent < 0.5` |
| 确定性 | 断言 | 同输入两次执行 diffPercent === 0 |

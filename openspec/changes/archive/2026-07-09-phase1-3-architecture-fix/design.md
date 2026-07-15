# Design: phase1-3-architecture-fix

## Goals

1. 统一 image-ops/core 算法调用路径，nodejs 和 browser executor 共用同一纯算法层
2. 补充节点 `platforms` 配置，使 Phase 1 核心目标（双平台运行）可落地
3. composer-sdk 使用 image-ops/browser 执行合成，确保前端/后端像素级一致
4. 补充测试覆盖，满足 PRD §6.9 质量要求

## Non-Goals

- 不修改 image-ops/core 纯算法实现本身（已通过单元测试）
- 不实现 Production API（Phase 2 范围）
- 不重构 composer-sdk 的事件系统和状态管理

## Decisions

### D1: nodejs executor 调用 core/composite/composite.ts 而非 composite-math.ts

**问题**: 当前 `nodejs/composite-executor.ts` 直接调用 `core/composite-math.ts`（旧实现），与 browser executor 使用的新 `core/composite/composite.ts` 可能不一致。

**决策**: 将 nodejs executor 改为调用 `core/composite/composite.ts`，作为唯一的 composite 真相源。

**备选考虑**:
- 保留 composite-math.ts 做向后兼容 → 拒绝，维护两份实现成本高且易出错
- 将 composite-math.ts 重命名为 composite-v1.ts 并废弃 → 接受，将旧文件移到 `_archive/` 目录

### D2: 节点 platforms 配置策略

**问题**: 所有 7 个节点当前 `platforms: ['browser']`，没有节点支持 nodejs。

**决策**: 所有 7 个节点标记 `platforms: ['both']`（前端/后端都支持），因为它们的算法都是纯函数，不依赖平台 API。

```typescript
// 目标配置示例
export const compositeDefinition: NodeDefinition = {
  type: 'composite',
  platforms: ['both'],  // ← 从 ['browser'] 改为 ['both']
  // ...
};
```

**备选考虑**:
- 逐节点审查，按需设置为 browser/nodejs/both → 拒绝，7 个节点都是纯算法，应该都是 both
- 使用 platforms: ['*'] 通配符 → 拒绝，代码中显式声明更清晰

### D3: composer-sdk 集成 image-ops vs 原生 Canvas

**问题**: 当前 `ComposerCanvas` 使用 `ctx.globalCompositeOperation` 做叠加模式，没有走 image-ops 链路。PRD 要求"前端 Canvas 预览与后端 sharp 生产输出像素级一致"。

**决策**: 将 `ComposerCanvas` 的合成逻辑替换为调用 `image-ops/browser` executor。

**架构**:
```
ComposerCanvas
  └─ 调用 image-ops/browser/CompositeExecutor
        └─ 调用 image-ops/core/composite/composite.ts（纯算法）
```

**备选考虑**:
- 在 composer-sdk 内部复制 image-ops 算法 → 拒绝，代码重复且难以维护
- 仅添加 pixel-level 测试验证一致性 → 拒绝，风险太高

### D4: 旧实现 composite-math.ts 处理

**问题**: Phase 1 抽取后产生了 `composite/composite.ts`（新）和 `composite-math.ts`（旧）两份实现。

**决策**: 
1. 将 `core/composite-math.ts` 重命名为 `core/_archive/composite-math-v1.ts`
2. 确认无其他 consumer 后删除

## Architecture Review

### 修复后架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        image-ops Architecture                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │  node-definitions │     │  node-definitions │     │  node-definitions │   │
│  │  (platforms 配置) │     │  (platforms 配置) │     │  (platforms 配置) │   │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘   │
│           │                       │                       │              │
│           ▼                       ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      image-ops/core/                              │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  composite/composite.ts  ← 唯一 composite 真相源 ✅       │   │   │
│  │  │  mask/mask.ts           ← 唯一 mask 真相源 ✅            │   │   │
│  │  │  transform/transform.ts ← 唯一 transform 真相源 ✅       │   │   │
│  │  │  blend-modes.ts / porter-duff.ts ✅                      │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▲                                          │
│           ┌──────────────────┴──────────────────┐                      │
│           ▼                                     ▼                       │
│  ┌─────────────────┐                 ┌─────────────────┐                │
│  │  browser/       │                 │  nodejs/        │                │
│  │  CompositeExec  │                 │  CompositeExec  │                │
│  │  Canvas API     │                 │  sharp API      │                │
│  └────────┬────────┘                 └────────┬────────┘                │
│           │                                     │                       │
│           ▼                                     ▼                       │
│  ┌───────────────────────────────────────────────────────┐             │
│  │  image-ops/core/composite/composite.ts（共用） ✅     │             │
│  └───────────────────────────────────────────────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### composer-sdk 集成架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        composer-sdk Architecture                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ComposerCanvas                                                          │
│    │                                                                     │
│    ├─ 加载模板 (template.content)                                        │
│    │                                                                     │
│    ├─ 初始化 layers[]                                                   │
│    │                                                                     │
│    ├─ 用户拖拽交互                                                       │
│    │   └─ 更新 layer 状态 (x, y, scale, rotation)                        │
│    │                                                                     │
│    └─ 触发合成 (onChange debounce 100ms)                                │
│          │                                                               │
│          ▼                                                               │
│  ┌───────────────────────────────────────────────────────┐              │
│  │  image-ops/browser/CompositeExecutor.execute() ✅      │              │
│  │    └─ image-ops/core/composite/composite.ts ✅        │              │
│  └───────────────────────────────────────────────────────┘              │
│          │                                                               │
│          ▼                                                               │
│  ┌───────────────────────────────────────────────────────┐              │
│  │  Canvas 渲染预览 ✅                                   │              │
│  └───────────────────────────────────────────────────────┘              │
│          │                                                               │
│          ▼                                                               │
│  onSubmit({ inputs, layers, designParams })                             │
│    └─ 提交到业务后端                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Verification Checklist

### Core Layer
- [ ] `core/composite/composite.ts` 是 composite 的唯一真相源
- [ ] `core/mask/mask.ts` 是 mask 的唯一真相源
- [ ] `core/transform/transform.ts` 是 transform 的唯一真相源
- [ ] `core/_archive/composite-math-v1.ts` 已移至 archive
- [ ] 无其他 consumer 引用旧实现

### Node Definitions
- [ ] 所有 7 个节点有 `platforms: ['both']` 配置
- [ ] dev-tool 节点面板按 targetPlatform 正确过滤

### nodejs Executors
- [ ] `nodejs/composite-executor.ts` 调用 `core/composite/composite.ts`
- [ ] `nodejs/transform-executor.ts` 调用 `core/transform/transform.ts`
- [ ] `nodejs/apply-mask-executor.ts` 调用 `core/mask/mask.ts`
- [ ] 每个 executor 有独立 Vitest 单元测试

### composer-sdk
- [ ] `ComposerCanvas` 使用 `image-ops/browser` executor
- [ ] 前端 Canvas 预览与后端 sharp 像素级一致（有测试验证）

### Tests
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 全部通过
- [ ] cross-platform 一致性测试通过

---

*本文档基于探索结果和 PRD v1.0 §6.4 方案 C 生成*

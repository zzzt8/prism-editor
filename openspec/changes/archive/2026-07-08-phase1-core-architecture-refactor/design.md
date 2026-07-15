# Phase 1: 核心架构重构 Design

## Goals

1. 将 `image-ops` 拆分为三层：core / browser / nodejs
2. 在 `NodeDefinition` 增加 `platforms` 字段
3. 改造现有 executor 为"调用 core + 平台 API"模式
4. 实现 `image-ops/nodejs/` 的 sharp 版本（composite/transform/load/export）
5. dev-tool 增加目标平台选择

## Non-Goals

- 不实现完整的 nodejs executor 套件
- 不修改 Prisma schema
- 不修改 server 路由
- 不实现 Composer SDK

---

## Decisions

### D1: 三层架构设计

**决策**：采用 `core` + `platform` 分离架构

```
packages/image-ops/
├── core/           # 纯算法，不依赖任何平台 API
│   ├── composite/  # 叠加模式实现
│   ├── mask/      # 蒙版算法
│   ├── transform/  # 变换算法
│   ├── export/    # 导出格式
│   └── utils/     # 共享工具
├── browser/       # Canvas 2D 实现
│   ├── CompositeExecutor.ts
│   ├── MaskExecutor.ts
│   └── ...
└── nodejs/        # sharp 实现
    ├── CompositeExecutor.ts
    ├── MaskExecutor.ts
    └── ...
```

**理由**：
- core 层完全无依赖，易于测试
- 平台实现可独立演进
- 新增平台只需实现 platform 层

### D2: Executor 接口设计

**决策**：平台 executor 实现统一接口，core 层通过接口调用

```typescript
// core/composite/types.ts
export interface CompositeInput {
  base: ImageData;
  overlays: Array<{ image: ImageData; mode: CompositeMode; opacity: number }>;
}

export interface CompositeOutput {
  result: ImageData;
}

export interface PlatformCompositeExecutor {
  execute(input: CompositeInput): CompositeOutput;
}
```

### D3: NodeDefinition.platforms 字段

**决策**：扩展 `NodeDefinition` 接口

```typescript
interface NodeDefinition {
  type: string;
  label: string;
  category: string;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
  defaultParams: Record<string, unknown>;
  platforms: Array<'browser' | 'nodejs'>; // 新增
}
```

### D4: 平台选择 UI

**决策**：dev-tool 新建工作流时选择目标平台

```
┌─────────────────────────────────────────┐
│  新建工作流                              │
├─────────────────────────────────────────┤
│  目标平台：○ 前端（Browser）              │
│           ○ 后端（Node.js）              │
│           ● 通用（支持所有平台）          │
└─────────────────────────────────────────┘
```

---

## Architecture Review

### A1: 现有 ImageOps 结构分析

```
packages/image-ops/src/
├── imageLoader.ts        # load-image 节点
├── imageSaver.ts         # save-image 节点
├── composite.ts          # composite 叠加
├── mask.ts              # 蒙版操作
├── transform.ts         # 变换（resize/rotate/flip）
├── type.ts              # 类型定义
├── index.ts
└── __tests__/
```

**问题**：
- 所有实现混合在一个目录
- Canvas/sharp 逻辑通过 `typeof window !== 'undefined'` 判断
- 无法跨平台复用算法

### A2: 拆分方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| 按文件拆分 | 改动最小 | 仍有平台判断逻辑 |
| 按层拆分（core/platform）| 清晰分离 | 需要重写导入逻辑 |
| 按节点拆分 | 细粒度 | 包体积增加 |

**选择**：按层拆分（core + platform），与 Executor 模式保持一致

### A3: sharp 实现优先级

| 节点 | browser 实现 | nodejs 实现 | 优先级 |
|------|-------------|-------------|--------|
| load-image | Canvas → ImageData | sharp → raw buffer | P0 |
| save-image | canvas.toBlob() | sharp.toBuffer() | P0 |
| composite | Canvas globalCompositeOperation | sharp.composite() | P0 |
| resize | canvas.drawImage() | sharp.resize() | P0 |
| rotate | canvas.rotate() | sharp.rotate() | P0 |
| flip | canvas.scale() | sharp.flip() | P1 |
| 其他 | 后续迭代 | 后续迭代 | P2 |

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | NodeDefinition.platforms 字段存在 | TypeScript 检查 |
| Core | core/ 所有函数无 platform 依赖 | CI 无 window/sharp 引用 |
| Build | image-ops 构建成功 | `pnpm build --filter=@prism/image-ops` |
| Test | 现有测试通过 | `pnpm test --filter=@prism/image-ops` |
| Dev-tool | 平台选择 UI 存在 | 手动测试 |
| E2E | Browser/nodejs 输出一致 | golden fixture 测试 |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| core 层引入平台依赖 | 中 | 高 | 禁止 import window/sharp |
| 现有测试失效 | 高 | 中 | 迁移测试到 core/ |
| dev-tool 平台选择破坏现有流程 | 中 | 中 | 保持默认 browser |

# Phase 1 Core Architecture Refactor Tasks

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 8 |
| Completed | 0 |
| In Progress | 0 |

---

## Phase 1.1 - NodeDefinition 平台字段

### T1.1.1 - 定义 platforms 类型

**opsx-meta**

```yaml
id: T1.1.1
layer: packages/core
task_type: refactor
verify:
  - type: file_content
    path: packages/core/src/types/node.ts
    contains: "platforms"
```

**Description**

在 `packages/core/src/types/node.ts` 定义 `Platform` 类型和扩展 `NodeDefinition` 接口。

```typescript
export type Platform = 'browser' | 'nodejs';

interface NodeDefinition {
  type: string;
  label: string;
  category: string;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
  defaultParams: Record<string, unknown>;
  platforms: Platform[]; // 新增
}
```

**Acceptance Criteria**

- [x] `Platform` 类型已定义
- [x] `NodeDefinition` 包含 `platforms` 字段
- [x] 现有实现中所有节点默认 `platforms: ['browser']`

---

### T1.1.2 - 更新 node-definitions 包的节点注册

**opsx-meta**

```yaml
id: T1.1.2
layer: packages/node-definitions
task_type: refactor
verify:
  - type: command
    command: pnpm typecheck --filter=@prism/node-definitions
    exit_code: 0
```

**Description**

更新 `packages/node-definitions/src/` 下所有节点定义文件，为每个节点添加 `platforms` 字段。

**Acceptance Criteria**

- [x] 所有节点定义包含 `platforms` 字段
- [x] TypeScript 检查通过

---

## Phase 1.2 - Core 层抽取

### T1.2.1 - 创建 image-ops/core/ 目录结构

**opsx-meta**

```yaml
id: T1.2.1
layer: packages/image-ops
task_type: architect
verify:
  - type: dir_exists
    path: packages/image-ops/src/core
```

**Description**

创建 `packages/image-ops/src/core/` 目录结构：

```
packages/image-ops/src/core/
├── composite/
│   ├── types.ts
│   ├── composite.test.ts
│   └── composite.ts
├── mask/
│   ├── types.ts
│   ├── mask.test.ts
│   └── mask.ts
├── transform/
│   ├── types.ts
│   ├── transform.test.ts
│   └── transform.ts
├── export/
│   ├── types.ts
│   ├── export.test.ts
│   └── export.ts
└── utils/
    └── imageUtils.ts
```

**Acceptance Criteria**

- [x] 目录结构已创建
- [x] 基础类型文件已创建

---

### T1.2.2 - 实现 core/composite/ 纯算法层

**opsx-meta**

```yaml
id: T1.2.2
layer: packages/image-ops
task_type: tdd
verify:
  - type: command
    command: pnpm test --filter=@prism/image-ops -- src/core/composite
    exit_code: 0
```

**Description**

从 `image-ops/src/composite.ts` 抽取叠加模式算法到 `core/composite/`：
- 所有叠加模式算法（multiply/screen/overlay/等）
- 不包含任何 platform API 调用

**Acceptance Criteria**

- [x] `core/composite/composite.ts` 包含所有叠加模式
- [x] 无 `typeof window` 或 `sharp` 引用
- [x] 现有测试迁移后通过

---

### T1.2.3 - 实现 core/mask/ 纯算法层

**opsx-meta**

```yaml
id: T1.2.3
layer: packages/image-ops
task_type: tdd
verify:
  - type: command
    command: pnpm test --filter=@prism/image-ops -- src/core/mask
    exit_code: 0
```

**Description**

从 `image-ops/src/mask.ts` 抽取蒙版算法到 `core/mask/`。

**Acceptance Criteria**

- [x] `core/mask/mask.ts` 包含所有蒙版算法
- [x] 无 platform 依赖
- [x] 测试通过

---

### T1.2.4 - 实现 core/transform/ 纯算法层

**opsx-meta**

```yaml
id: T1.2.4
layer: packages/image-ops
task_type: tdd
verify:
  - type: command
    command: pnpm test --filter=@prism/image-ops -- src/core/transform
    exit_code: 0
```

**Description**

从 `image-ops/src/transform.ts` 抽取变换算法到 `core/transform/`。

**Acceptance Criteria**

- [ ] `core/transform/transform.ts` 包含 resize/rotate/flip 算法
- [ ] 无 platform 依赖
- [ ] 测试通过

---

## Phase 1.3 - Platform 实现层

### T1.3.1 - 创建 image-ops/browser/ 实现

**opsx-meta**

```yaml
id: T1.3.1
layer: packages/image-ops
task_type: refactor
verify:
  - type: command
    command: pnpm build --filter=@prism/image-ops
    exit_code: 0
```

**Description**

创建 `packages/image-ops/src/browser/` 目录，将现有 Canvas 2D 实现迁移到此目录：

```
packages/image-ops/src/browser/
├── CompositeExecutor.ts
├── MaskExecutor.ts
└── ...
```

**Acceptance Criteria**

- [ ] browser/ 目录包含现有实现
- [ ] 原实现位置重构为调用 browser/ 或 core/
- [ ] 构建通过

---

### T1.3.2 - 实现 image-ops/nodejs/ 的 sharp 版本

**opsx-meta**

```yaml
id: T1.3.2
layer: packages/image-ops
task_type: feature
verify:
  - type: command
    command: pnpm build --filter=@prism/image-ops
    exit_code: 0
```

**Description**

创建 `packages/image-ops/src/nodejs/` 目录，实现 sharp 版本：

| 节点 | 实现 | 优先级 |
|------|------|--------|
| load-image | `sharp.toBuffer()` | P0 |
| save-image | `sharp.fromBuffer()` | P0 |
| composite | `sharp.composite()` | P0 |
| resize | `sharp.resize()` | P0 |
| rotate | `sharp.rotate()` | P0 |
| flip | `sharp.flip()` | P1 |

**Acceptance Criteria**

- [ ] `image-ops/nodejs/` 包含 4 个核心节点的 sharp 实现
- [ ] 构建通过
- [ ] 类型检查通过

---

## Phase 1.4 - Dev-tool 平台选择

### T1.4.1 - 添加工作流目标平台选择 UI

**opsx-meta**

```yaml
id: T1.4.1
layer: apps/dev-tool
task_type: feature
verify:
  - type: file_content
    path: apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts
    contains: "platform"
```

**Description**

在 dev-tool 新建工作流时添加目标平台选择：
- Browser（默认）
- Node.js
- 通用（支持所有平台）

**Acceptance Criteria**

- [ ] 新建工作流时有平台选择 UI
- [ ] 平台选择影响可用节点列表
- [ ] TypeScript 检查通过

---

## Completion Criteria

所有 8 个 tasks 完成后：

- [ ] `NodeDefinition` 包含 `platforms` 字段
- [ ] `image-ops/core/` 包含纯算法实现（composite/mask/transform）
- [ ] `image-ops/browser/` 包含 Canvas 2D 实现
- [ ] `image-ops/nodejs/` 包含 sharp 实现（4 个核心节点）
- [ ] dev-tool 支持目标平台选择
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过

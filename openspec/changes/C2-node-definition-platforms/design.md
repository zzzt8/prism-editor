# design: node-definition-platforms

## Goals

1. `NodeDefinition` 接口支持平台能力声明
2. registry 提供按平台过滤节点的查询函数
3. 所有现有节点默认 `platforms: ['browser']`
4. workflow metadata 记录目标平台

## Non-Goals

- nodejs executor 实现
- dev-tool UI 改动
- 节点逻辑改动

---

## Decisions

### D1: `platforms` 字段默认值

**Decision**: 现有节点默认 `platforms: ['browser']`，新增 `both` 表示两端都支持。

**Rationale**: 现有全部节点都是 browser-only，默认 browser 是向后兼容的选择。未来新增节点时显式声明 `['both']` 或 `['nodejs']`。

---

### D2: `listByPlatform` 函数签名

**Decision**:
```ts
function listByPlatform(
  registry: NodeDefinitionRegistry,
  platform: 'browser' | 'nodejs'
): NodeDefinition[]
```

**Rationale**: 过滤条件为单一平台，返回所有在该平台可用的节点（包括 `both` + 该平台专属）。

---

### D3: WorkflowMetadata.targetPlatform

**Decision**: `targetPlatform` 作为 workflow metadata 的可选字段，不作为硬约束。

**Rationale**: 允许 workflow 在创建时声明目标平台，但 executor 执行时不做强制校验。后续可演进为硬约束。

---

## Architecture Review

```
packages/shared-types/src/node.ts
└── NodeDefinition.platforms?: ('browser' | 'nodejs' | 'both')[]

packages/node-definitions/src/registry.ts
└── listByPlatform(registry, platform) → NodeDefinition[]

packages/shared-types/src/workflow.ts
└── WorkflowMetadata.targetPlatform?: 'browser' | 'nodejs'
```

---

## Review Checklist

- [ ] `platforms` 字段是可选的，现有节点不填也能编译
- [ ] `listByPlatform(registry, 'browser')` 返回含 `both` 和 `['browser']` 的节点
- [ ] 所有 7 个现有节点定义已添加 `platforms: ['browser']`
- [ ] typecheck 通过

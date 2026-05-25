# proposal: node-definition-platforms

**change_class: medium**

reason: 在 `NodeDefinition` 接口新增可选字段，并在 `registry.ts` 中新增过滤函数，不改变现有节点的定义格式，不破坏任何现有功能。

---

## Why

Change 1（`image-ops-runtime-core-foundation`）已建立 core/browser/nodejs 三层目录结构，但节点本身尚无"在哪里可用"的元信息。dev-tool 需要根据用户选择的目标平台（frontend/backend）过滤可用节点，registry 需要提供对应的查询接口。

---

## What Changes

1. `packages/shared-types/src/node.ts` 中的 `NodeDefinition` 接口新增可选字段 `platforms?: ('browser' | 'nodejs' | 'both')[]`
2. `packages/node-definitions/src/registry.ts` 新增 `listByPlatform()` 函数
3. 现有节点定义（definitions.ts）**全部添加** `platforms` 字段，默认值为 `['browser']`（表示当前仅支持浏览器）
4. `packages/shared-types/src/workflow.ts` 中 `WorkflowMetadata` 新增 `targetPlatform?: 'browser' | 'nodejs'`

---

## Capabilities

- 节点定义可声明自己支持的平台（browser/nodejs/both）
- registry 可按平台过滤节点列表
- workflow metadata 可记录目标执行平台

---

## Impact

| layer | 影响 |
|-------|------|
| `packages/shared-types` | `NodeDefinition` 接口新增字段；`WorkflowMetadata` 新增字段 |
| `packages/node-definitions` | 所有节点加 platforms 字段；registry 新增 `listByPlatform` |
| `packages/image-ops` | 无改动 |
| `apps/dev-tool` | 无直接改动（Change 3 会使用这些字段） |

---

## Out of Scope

- nodejs executor 实现（Change 4）
- dev-tool UI 改动（Change 3）
- 任何节点逻辑改动

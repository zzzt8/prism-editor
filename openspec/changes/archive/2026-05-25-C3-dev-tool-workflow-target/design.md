# design: dev-tool-workflow-target

## Goals

1. NewWorkflowModal 增加 Frontend/Backend Radio
2. workflow metadata 持久化 `targetPlatform`
3. 节点面板按 targetPlatform 过滤

## Non-Goals

- 两个独立编辑器入口
- 平台切换 tab
- SKU 管理 UI

---

## Decisions

### D1: Radio vs Tab vs 两个入口

**Decision**: 采用 Radio（选项 A）。

**Rationale**: 改动最小，与 Change 2 的平台标记机制自然对接。用户在创建工作流时明确意图，workflow metadata 记录选择，编辑器据此过滤节点面板。

---

### D2: 节点面板过滤时机

**Decision**: 在编辑器 mount 时从 canvas store 读取 `targetPlatform`，传给 NodePalette 组件做过滤。

**Rationale**: 不需要改动节点注册机制，只在消费端（NodePalette）做过滤。简单有效。

---

### D3: Storage 改动范围

**Decision**: IndexedDB storage adapter 的 `createWorkflow` 增加 `targetPlatform` 参数，写入 workflow metadata。

**Rationale**: metadata 是 workflow JSON 的一部分，storage adapter 只需透传该参数。

---

## Review Checklist

- [ ] NewWorkflowModal 渲染 Frontend/Backend Radio
- [ ] 选择的平台值写入 workflow metadata.targetPlatform
- [ ] NodePalette 只展示目标平台支持的节点
- [ ] dev-tool typecheck 通过

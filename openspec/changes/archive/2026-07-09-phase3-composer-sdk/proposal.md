# Proposal: Phase 3 — Composer SDK + PS 风格交互

> **change_class**: high
> **reason**: 新建 packages/composer-sdk/ 包 + 跨包接口 + React 组件层，触及核心产品交互

---

## Why

Prism Composer Platform 的护城河之一是"同一套结构化配置驱动前端实时预览和后端生产图渲染"。Phase 2 完成了 ProductTemplate 数据模型和 Render API，但还没有给 mall 前端提供实时预览的 SDK。

Composer SDK 是 Prism 与 mall 前端集成的唯一入口，提供 PS 风格的拖拽交互和实时 Canvas 合成能力。

---

## What Changes

**新增包**：`packages/composer-sdk/`

```
packages/composer-sdk/
├── src/
│   ├── ComposerCanvas.tsx      ← PS 风格拖拽 + 实时 Canvas 合成
│   ├── ComposerParams.tsx      ← 参数面板
│   ├── ComposerState.ts        ← 状态类型定义
│   ├── types.ts                ← SDK 公共类型
│   └── index.ts                ← 入口导出
├── package.json
└── tsconfig.json
```

**复用现有资产**：
- `packages/image-ops/src/browser/` — Canvas 2D 合成执行器（Phase 1 已实现）
- `packages/shared-types/` — 类型契约

---

## Capabilities

### ComposerCanvas

- 图层拖拽（位置、缩放、旋转）—— CSS transform 实时跟随（< 16ms）
- 图层选区（选中图层高亮、锚点显示）
- 实时 Canvas 合成：
  - 叠加模式：正常（source-over）、正片叠底（multiply）、滤色（screen）、叠加（overlay）、柔光（soft-light）
  - 蒙版运算：亮度蒙版、渐变蒙版、边缘羽化
- 参数响应（< 100ms 合成延迟）

### ComposerParams

- 动态渲染 ProductTemplate.inputs / designParams 表单
- 与 ComposerCanvas 双向绑定

### 事件回传

- `onChange(state)` — 参数变化回调
- `onSubmit(params)` — 提交最终参数到 mall 后端（不直接触发 Production Render）

---

## Impact

| Layer | Impact |
|-------|--------|
| `packages/composer-sdk/` | **新增** — Composer SDK 包 |
| `packages/image-ops/src/browser/` | **复用** — Canvas 合成 executor |
| `packages/shared-types/` | **复用** — 类型定义 |
| `apps/dev-tool/` | **无** — 不修改 |

---

## Out of Scope

- 撤销/重做功能（PRD §10 Out of Scope）
- Web Component / iframe 分发形态（React package 优先）
- 多人实时协作
- 复杂权限系统
- Production Render 触发（由 mall 后端调用 Prism API）

---

## Dependencies

- Phase 1 完成（image-ops/core/、browser/、nodejs/ 三层架构）
- Phase 2 完成（ProductTemplate 数据模型、Render API）

---

## Risks

| Risk | Mitigation |
|------|------------|
| Canvas 合成性能（< 100ms） | 使用 `requestAnimationFrame` 节流 + `OffscreenCanvas` 优化 |
| 样式冲突 | 使用 CSS Modules 或 Shadow DOM |
| React 版本兼容性 | 指定 peerDependencies 范围 |

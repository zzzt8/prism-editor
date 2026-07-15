# openspec

OpenSpec 变更管理系统，记录和管理项目的所有变更提案、设计和任务。本仓库以 OpenSpec 作为 change 管理层，把 ECC 作为 apply / verify 阶段的 SOP / agent bridge。

## 概述

OpenSpec 是一种结构化的变更管理方法，包含以下阶段：

1. **探索 (Explore)** - 分析代码库结构，澄清需求
2. **提案 (Propose)** - 创建变更提案，生成 artifacts
3. **实现 (Apply)** - 按 task 执行实现代码（支持断点续传）
4. **验证 (Verify)** - 验证实现一致性
5. **归档 (Archive)** - 归档完成的变更

## 目录结构

```
openspec/
├── changes/                      # 活跃变更提案
│   ├── e2e-verify-canvas-synthesis-pipeline/  # 端到端验证 dev-tool → publish → user-app → 执行 链路
│   └── archive/                  # 已归档的变更
│       ├── 2026-04-17-prism-phase1-plan/
│       ├── 2026-04-16-prism-c1-asset-model/        # 资产模型收口
│       ├── 2026-04-16-prism-c2-publish-protocol/   # 发布态协议与参数模型
│       ├── 2026-04-16-prism-c3-editor-experience/  # 编辑器体验补强
│       ├── 2026-04-16-prism-c6-snippet-fragments/  # ComfyUI 风格片段
│       ├── 2026-04-17-prism-c4-version-management/ # 版本管理与资产沉淀
│       └── 2026-04-17-prism-c5-platform-foundation/# 平台基础能力
└── README.md
```

## 变更结构

每个变更包含以下 artifacts：

| Artifact | 描述 |
|----------|------|
| `proposal.md` | 变更提案，包含背景、目标、范围、change_class |
| `design.md` | 技术设计，包含架构决策和 API 设计 |
| `tasks.md` | 任务列表，基于 checkbox 的进度追踪；`opsx-meta` 标注 `layer` / `task_type` / `verify` / `dependencies` |
| `verify.md` | 验证报告，包含测试结果 |
| `config.yaml` | 变更配置，包含 change_class 和元数据 |

## change_class

变更风险等级，影响验证强度：

| 等级 | 描述 | 触发条件 |
|------|------|----------|
| `low` | 样式/文案/UI 布局 | 不影响逻辑的变更 |
| `medium` | 单页面交互增强 | 节点面板调整、局部 UI 变更 |
| `high` | 触及核心逻辑 | store/API contract/node schema/engine 层 |

## Layer 映射

按优先级执行任务：

| Layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |
| `meta` | `.cursor/skills/` | OpenSpec / ECC workflow 元层 |

**执行优先级：** `engine > backend > editor > runtime > ui-skin > meta`

## Task 元数据（`opsx-meta`）

`tasks.md` 推荐显式写 `task_type`，让 `ecc-openspec-bridge` 优先按显式标注路由：

```html
<!-- opsx-meta
id: T2
layer: backend
task_type: api-design | tdd
verify:
  - typecheck
  - api-tests
dependencies:
  - type: task
    refs: ["T1"]
-->
```

`task_type` 候选：`api-design` / `tdd` / `build-fix` / 自定义。
未显式填写时，bridge 使用 fallback 推断（基于关键词 + layer）。

## 使用方式

在 Cursor 中使用 `/opsx-*` 命令：

```bash
/opsx-quick      # 轻量改动：自动选择 ECC lane，直接实现与最小验证
/opsx-explore    # 探索代码库：结构分析，需求澄清
/opsx-propose    # 创建新变更：生成 proposal / design / tasks artifacts
/opsx-apply      # 实现变更：按 tasks 执行代码
/opsx-ecc-apply  # 在 apply 阶段为每个 task 路由 ECC lane
/opsx-verify     # 验证变更：检查实现一致性
/opsx-ecc-verify # verify 阶段追加 ECC review / failure attribution
/opsx-archive    # 归档变更：完成后的整理
```

## 命令对照

| 命令 | 何时使用 | 是否建 change |
|------|----------|--------------|
| `/opsx-quick` | 类型/文档/局部修复，改动局部且清晰；自动选择 ECC lane 执行 | 否 |
| `/opsx-explore` | 需求不明确，需要先理解代码结构 | 可选 |
| `/opsx-propose` | 涉及运行逻辑、跨层契约、多阶段实施 | 是 |
| `/opsx-apply` | 执行 `/opsx-propose` 创建的 change | — |
| `/opsx-ecc-apply` | 在 apply 阶段为每个 task 路由 ECC lane | — |
| `/opsx-verify` | 验证已完成的 change 实现一致性 | — |
| `/opsx-ecc-verify` | verify 阶段追加 ECC review / failure attribution | — |
| `/opsx-archive` | 归档已完成的 change | — |

## `opsx-quick` 与 `ecc-openspec-bridge`

- `opsx-quick` 面向轻量任务，不创建 change artifacts
- `ecc-openspec-bridge` 面向 OpenSpec 的 `apply / verify` 阶段，为正式 change 选择更细的 ECC lane
- 两者都可以使用 ECC 方法论，但入口不同：
  - `opsx-quick`：先过 Quick Gate，再自动选一个主 ECC lane，直接做最小实现与验证
  - `ecc-openspec-bridge`：在已有 `tasks.md` 和 change 边界内，为每个 task 路由 lane
- 当 quick 任务暴露出更大影响面时，应从 `opsx-quick` 升级到 `/opsx-explore` 或 `/opsx-propose`，随后再在 `apply / verify` 中使用 bridge

## 相关资源

- [.cursor/](../.cursor/) - Cursor AI Agent Skills + ECC Bridge
- [docs/changelogs/](../docs/changelogs/) - 归档 changelog（每次归档自动同步）

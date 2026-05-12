# .cursor 目录说明

> **v3.2 变更：** 精简命令至 5 个（移除 opsx-plan/opsx-debug/opsx-skill）；change_class 扩展为 low/medium/high 三级并分离 change_profile；新增 verify.md 模板；debug 诊断逻辑并入 apply failure-handling section；plan 编排逻辑并入 propose change-splitting section。

---

## 目录结构

```
.cursor/
├── skills/                        # Skill 定义文件（AI 执行逻辑）
│   ├── _shared/
│   │   ├── SHARED-LAYERS.md       # 共享层：layer 映射、验证命令
│   │   ├── SKILL-INDEX.md         # 自动生成的 Skill 索引
│   │   └── SKILL-SCHEMA.md        # 元数据 Schema 定义
│   ├── openspec-explore/           # 探索代码库，澄清需求
│   ├── openspec-propose/          # 创建 change，生成 artifacts（含 risk-triggered 模板 + change-splitting）
│   ├── openspec-apply/            # 按 task 实现代码，断点续传基于 checkbox，内置 failure-handling
│   ├── openspec-verify/           # 验证实现一致性（Full + coherence-lite）
│   └── openspec-archive/          # 归档完成的 change
│
└── commands/                       # 命令入口（触发对应 Skill）
    └── opsx-*.md                   # 5 个核心命令
```

---

## 命令速查表（v3.2）

| 命令 | Skill | 阶段 | 作用 |
|------|-------|------|------|
| `/opsx-explore` | `openspec-explore` | 探索 | 扫描代码库结构，澄清需求，量化切换标准 |
| `/opsx-propose` | `openspec-propose` | 提案 | 创建 change，生成 artifacts；change_class 推断触发 review/测试模板；支持 change-splitting |
| `/opsx-apply` | `openspec-apply` | 实现 | 按 layer 优先级执行 task，断点续传基于 checkbox；内置 failure-handling 诊断 |
| `/opsx-verify` | `openspec-verify` | 验证 | Full 验证 + coherence-lite checklist |
| `/opsx-archive` | `openspec-archive` | 归档 | 最终确认后归档 change |

---

## v3.0 核心变更

### 1. 状态管理：checkbox 为主，JSON 为兼容参考

> Task 状态以 tasks.md checkbox（`- [ ]` / `- [x]`）为主，tasks-state.json 仅作兼容参考。

```
冲突处理规则（必须写死）：
- tasks.md checkbox 是唯一主真相源
- 冲突时输出 warning：`[opsx-apply] 状态不一致：tasks.md 为准，JSON 已过时`
- 不自动修复 JSON
```

### 2. change_class / change_profile 推断

> `change_class` = 风险等级，影响 verify 强度和归档条件。
> `change_profile` = 流程重量，记录推断依据（schema v2 固定 5 个 artifacts）。
> 规则来源：config.yaml 的 `rules.change_class`，proposal.md 只展示推断结果。

```yaml
---
name: <change-name>
change_class: high      # 风险等级
change_profile: high     # 流程重量
reason: "touches engine layer, modifies canvas API contract"
---
```

| 条件 | change_class | change_profile | 触发动作 |
|------|-------------|---------------|---------|
| 仅样式/文案/UI 布局，不影响逻辑 | `low` | `low` | 跳过 review checklist；测试并入 tasks |
| 单页面交互增强、节点面板调整、局部 UI 变更 | `medium` | `medium` | 简化 review checklist；测试章节可选 |
| 触及 store / API contract / node schema | `high` | `high` | 插入完整 review checklist + 独立测试章节 |
| 涉及跨包接口、数据迁移、序列化格式 | `high` | `high` | 插入完整 review checklist + 独立测试章节 |
| engine/core 层改动（任何 scope） | `high` | `high` | 插入完整 review checklist + 独立测试章节 |
| 无法明确判断 | `high`（默认走保守路径） | `medium`（默认走中等路径） | — |

### 3. 精简的 Task 元数据

> v3.0 删除了 risk / priority / estimated_time（主观判断，无自动化消费方）。

```html
<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
  - type: change
    refs: []
    status_required: completed
-->
```

### 4. Coherence 降级为 coherence-lite

> 三阶段（Incremental / Full / Coherence）简化为两阶段 + lite checklist。

```
Incremental verify → Full verify（含 coherence-lite checklist）
```

coherence-lite 结构：
- **问答式 checklist**：task 是否有对应代码、design 决策是否落地、specs 语义是否有实现
- **Traceability Map**：Proposal Goal → Design Decision → Task → Code/Test 可执行核对
- **High-Risk 额外检查**：适用于 change_class = high

---

## Change 生命周期

### 标准路径

```
┌─────────────────────────────────────────────────────────┐
│  /opsx-explore                                          │
│  探索代码库 → 澄清需求                                   │
│  ↓                                                      │
│  /opsx-propose                                          │
│  推断 change_class → 生成 artifacts                      │
│  ↓ （如需多 change 编排：change-splitting）              │
│  /opsx-apply                                            │
│  按 layer 优先级执行 → 增量验证 → 断点续传               │
│  ↓ 遇到问题                                             │
│  failure-handling 诊断                                   │
│  ↓ 所有 task 完成                                        │
│  /opsx-verify                                           │
│  Full + coherence-lite                                   │
│  ↓ 全部通过                                              │
│  /opsx-archive                                          │
│  Git 检查 → 最终确认 → 归档                              │
└─────────────────────────────────────────────────────────┘
```

---

## Layer 映射

| Layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |

**执行优先级：** engine > backend > editor > runtime > ui-skin > meta

---

## 增量验证策略

> 基于 `git diff --name-only HEAD~1` 获取实际改动文件。

```bash
git diff --name-only HEAD~1  # 获取本次改动的文件
# 按文件路径判断受影响 layers → 执行增量验证
```

**全量验证（保底）：**
```bash
pnpm typecheck
pnpm test
```

---

## OpenSpec 与 Skills 的关系

OpenSpec（`openspec/`）是变更管理的产物系统，记录了每项变更的提案、设计、任务和验证结果。

Cursor Skills（`.cursor/skills/`）是 AI Agent 的执行逻辑，驱动 OpenSpec 工作流各阶段。

两者相辅相成：
- OpenSpec **消费** Skills：`/opsx-apply` 调用 `openspec-apply` skill 执行任务
- Skills **产出** OpenSpec：`/opsx-propose` 调用 `openspec-propose` skill 生成变更提案
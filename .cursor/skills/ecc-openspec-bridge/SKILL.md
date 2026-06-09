---
name: ecc-openspec-bridge
description: 在 OpenSpec apply / verify 阶段按 task 类型路由到合适的 ECC skill / agent。
version: "1.0.0"
category: meta
tags:
  - ecc
  - openspec
  - layer:meta
aliases:
  - /opsx-ecc-bridge
  - /ecc-opsx
permissions:
  - file-write
verify:
  - cli-output
  - typecheck
---

## 目标

把 OpenSpec 保持为 **change / proposal / tasks / acceptance boundary**，把 ECC 作为 **apply / verify 阶段的开发 SOP 增强层**。

这个 bridge **不替代** `openspec-apply` / `openspec-verify`，而是在执行 task 时补充一层“任务类型 → ECC lane”的自动匹配。

## 适用时机

- 你正在执行 `/opsx-apply <change-name>`
- 你正在执行 `/opsx-verify <change-name>`
- `tasks.md` 中的 task 同时涉及 API、测试、构建修复、代码审查、E2E、文档、架构拆分等专业活动

## 使用方式

### Apply 阶段

1. 先按 `openspec-apply` 的规则读取 `tasks.md` checkbox 和 `opsx-meta`
2. 对每个可执行 task，先读取显式 `task_type`
3. 如 `task_type` 缺失，再根据下方 fallback 映射推断 lane
4. 用该 lane 的 SOP 完成任务，再回到 `openspec-apply` 的 commit / checkbox / smoke test 流程

### Verify 阶段

1. 先执行 `openspec-verify` 的 Full Verification
2. 若存在 related failure，使用下方 lane 做二次归因
3. 对 high-risk change，额外执行 `code-reviewer` / `security-reviewer` / `e2e-runner` 风格检查
4. 输出 verify 报告，但仍保持非阻断

## Task 类型识别规则

### 0. 显式 `task_type` 优先

如果 `opsx-meta` 中存在 `task_type`，则直接按如下映射路由：

| `task_type` | 主 lane | 辅助 lane |
|---|---|---|
| `api-design` | `ecc-api-design` | `typescript-reviewer` |
| `tdd` | `ecc-tdd-workflow` | — |
| `feature` | `ecc-tdd-workflow` | — |
| `build-fix` | `ecc-build-error-resolver` | — |
| `refactor` | `code-reviewer` | `refactor-cleaner` |
| `security` | `security-reviewer` | — |
| `e2e` | `e2e-runner` | — |
| `architect` | `planner` / `architect` | — |

如果写成 `task_type: api-design | tdd`，则：
- 第一项视为主 lane
- 其余项视为辅助 lane
- apply 摘要中应写明主/辅 lane

### 1. Fallback 推断规则

仅在未写 `task_type` 时使用下列规则。

### 1. API / contract / schema

命中任一条件即可：
- 路径落在 `server/`、`server/prisma/`、`packages/shared-types/`
- task 文本包含 `api`、`route`、`schema`、`contract`、`auth`、`published`、`repository`
- `change_class = high` 且涉及前后端接口边界

**ECC lane：** `api-design` + `typescript-reviewer`

**执行 SOP：**
- 先确认请求/响应 contract、schema、兼容性约束
- 再实现 route / repository / shared-types
- 最后跑 `api-tests`、对应 package typecheck、必要的 reviewer 检查

### 2. TDD / 测试优先任务

命中任一条件即可：
- task 文本包含 `test`、`spec`、`coverage`、`assertion`
- `verify` 包含 `unit-tests`、`api-tests`、`golden-fixture`
- 目标文件是 `*.test.ts`、`*.spec.ts`

**ECC lane：** `tdd-workflow`

**执行 SOP：**
- 先补或改失败测试
- 再做最小实现
- 最后重跑最小相关测试，再回到 layer smoke

### 3. Build / type / lint / CI 修复

命中任一条件即可：
- task 文本包含 `build`、`typecheck`、`lint`、`ci`
- 当前 layer smoke / full verification 失败
- 报错主要是 TS、构建链、测试启动失败

**ECC lane：** `build-error-resolver`

**执行 SOP：**
- 先读错误输出
- 只修 related failure
- 每修一轮就重跑最小验证
- 两次 retry 仍失败才停

### 4. 代码评审 / 清理 / 一致性

命中任一条件即可：
- task 文本包含 `review`、`cleanup`、`refactor`、`consistency`
- verify 阶段需要做 coherence-lite / 可维护性复核

**ECC lane：** `code-reviewer` + `refactor-cleaner`

**执行 SOP：**
- 检查命名、重复逻辑、边界条件、错误处理
- 仅做与当前 change 强相关的清理
- 不扩散修 unrelated 旧债

### 5. 安全 / 认证 / 输入校验

命中任一条件即可：
- 路径落在 `server/middleware/`、`server/routes/auth*`、`apps/*/auth*`
- task 文本包含 `auth`、`jwt`、`security`、`permission`、`validation`

**ECC lane：** `security-reviewer`

**执行 SOP：**
- 检查 token、权限、输入验证、错误泄漏
- 避免引入明文 secret、弱校验、越权路径

### 6. E2E / 用户流 / 视觉回归

命中任一条件即可：
- task 文本包含 `e2e`、`flow`、`user journey`、`visual`
- 涉及 `apps/dev-tool/` 或 `apps/user-app/` 的关键主链路交互

**ECC lane：** `e2e-runner`

**执行 SOP：**
- 先确认关键路径
- 再跑最小端到端或手动 smoke
- verify 报告里明确覆盖了哪些主流程

### 7. 架构 / 分层 / 大改动拆分

命中任一条件即可：
- `change_class = high`
- 任务横跨 `engine + backend + editor/runtime`
- 涉及缓存、执行器、发布模型、跨包共享类型

**ECC lane：** `planner` + `architect`

**执行 SOP：**
- 先定义边界、依赖顺序、兼容策略
- 必要时先拆 task，再继续 apply
- 保持 commit 按 layer 隔离

## 推荐映射表

| OpenSpec 信号 | ECC lane | 备注 |
|---|---|---|
| `server/` + schema / route | `api-design` | 配合 `typescript-reviewer` |
| `*.test.ts` / `verify: unit-tests` | `tdd-workflow` | 先测后改 |
| typecheck / lint / smoke 失败 | `build-error-resolver` | 最小重跑 |
| refactor / consistency | `code-reviewer` | 必要时加 `refactor-cleaner` |
| auth / jwt / validation | `security-reviewer` | 安全边界优先 |
| UI 主链路 / visual | `e2e-runner` | verify 阶段更常用 |
| 跨层高风险变更 | `planner` / `architect` | 先拆分再执行 |

## 与本项目的结合原则

- **OpenSpec 是主流程**：change、proposal、design、tasks、archive 仍由 OpenSpec 管理
- **ECC 是增强层**：只增强 apply / verify，不替代 proposal artifacts
- **最小引入**：优先采用 SOP 和路由规则，不强行复制 ECC 全量技能树
- **按 monorepo layer 对齐**：`
  - engine → planner / architect / tdd-workflow / build-error-resolver
  - backend → api-design / security-reviewer / build-error-resolver
  - editor/runtime → e2e-runner / code-reviewer / tdd-workflow
  - ui-skin → code-reviewer / e2e-runner
`

## 在 `openspec-apply` 中的桥接方式

执行 task 时，在“确认目标”之后插入一步：

```text
1.5 选择 ECC lane
- 读 task 标题、layer、verify、目标路径
- 依据 bridge 映射确定 ECC lane
- 记录一句：`ECC lane = <lane>`
- 后续修改与验证遵循该 lane SOP
```

## 在 `openspec-verify` 中的桥接方式

执行 full verify 后，追加：

```text
3.5 ECC review lanes
- related type/test/build failure → build-error-resolver 归因
- high-risk backend/auth change → security-reviewer 检查
- runtime/editor 主链路变更 → e2e-runner 风格检查
- 关键实现完成后 → code-reviewer 风格复核
```

## 选择建议（针对本仓库）

本仓库当前应采用 **Cursor target 的最小 ECC 安装**：
- 保留现有 OpenSpec skills/commands
- 增加项目本地 `.cursor/rules` 与 `.cursor/hooks.json`
- 增加本地 `ecc-openspec-bridge` skill 和命令入口
- 先消费 ECC 的方法论与 lane 映射，再视使用频率逐步引入更多细分 skills

不建议当前直接引入 ECC 全量 skill tree，原因：
- 现有 `.cursor/skills` 已形成稳定 OpenSpec 流程
- 全量覆盖会增加选择噪音和维护负担
- 你当前最需要的是 apply / verify 专业 SOP，而不是再造 proposal 层

## 输出要求

当此 bridge 被使用时，摘要中补充：

```markdown
- ECC Bridge：已启用
- Task 路由：T1 → api-design；T2 → tdd-workflow；T3 → build-error-resolver
- 额外验证：code-reviewer / e2e-runner / security-reviewer（如有）
```

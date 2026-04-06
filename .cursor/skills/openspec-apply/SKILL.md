---
name: openspec-apply
description: 实现 OpenSpec change 的任务。元数据驱动执行循环，支持断点续传和增量验证。
---

> **前置共享片段：** layer 映射、验证命令、增量测试策略见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心职责

- 读取 task 元数据
- 按 layer 优先级执行
- 增量验证（不每次全量跑）
- 失败转 debug
- 支持断点续传

## 执行流程

### 1. 选择 change

```bash
openspec status --change "<name>" --json
```

- 如果 change name 未提供，尝试从上下文推断
- 如果有多个 active change，列出供用户选择

### 2. 获取任务列表（带 fallback）

```bash
openspec instructions apply --change "<name>" --json
```

读取 `contextFiles` 中的 tasks.md。

**Fallback 逻辑**：如果 CLI 未返回有效 JSON 或 `contextFiles` 为空，直接读取 `openspec/changes/<name>/tasks.md`。

### 3. 解析 task 元数据

解析 `<!-- opsx-meta -->` 块：

```html
<!-- opsx-meta
id: T1
layer: engine
risk: high
verify:
  - unit-tests
  - golden-fixture
files:
  - packages/workflow-core/src/executor.ts
  - packages/image-ops/src/ops/resize.ts
status: todo
-->
```

**layer 取值**：见 [_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md#layer-映射)

**risk 取值**：`low` | `medium` | `high`

**verify 取值**：`unit-tests` | `golden-fixture` | `api-tests` | `smoke-test` | `visual-check`

**files**：本次 task 修改的文件列表

**status 取值**：`todo` | `in-progress` | `done`

### 4. 过滤已完成的 task（断点续传）

读取 tasks.md 时：
- `status: done` 或标记为 `- [x]` 的 task → 跳过
- `status: in-progress` → 从断点继续（询问用户是否继续还是重新开始）
- `status: todo` → 按计划执行

### 5. 按 layer 优先级执行

| 优先级 | layer | 执行策略 |
|--------|-------|----------|
| 1 | engine | 先跑测试，确保基础稳固 |
| 2 | backend | 先验证 Prisma schema 兼容性 |
| 3 | editor | 后执行 |
| 4 | runtime | 后执行 |
| 5 | ui-skin | 最后执行 |

**单个 task 内的改动上限**：如果预判某个 task 需要修改 5 个以上文件，或跨越 3 个以上子模块 → **拆分**该 task，先执行其中最小可运行子集。

**大 task 拆分原则**：
```
这个 task 看起来很大（>5 文件 / >3 子模块）
├─ 能否独立运行一个最小功能？
│    └─ 是 → 拆成 T1a（核心）+ T1b（边界处理）+ T1c（优化）
├─ 是否有明确的先后依赖？
│    └─ 是 → 按依赖顺序拆成独立 task
└─ 是否涉及多个 layer？
     └─ 是 → 按 layer 拆分，每个 layer 一个 task
```

### 6. 增量验证（基于改动文件）

> 不要每次 task 都跑全量测试。根据本次实际改动的文件决定验证范围。

根据 `<!-- opsx-meta -->` 中的 `files` 字段判断：

```
改动文件属于哪些 layer？
│
├─ engine（packages/workflow-core, packages/image-ops, packages/node-definitions）
│    └─ pnpm test --filter=@prism/workflow-core
│    └─ pnpm test --filter=@prism/image-ops
│
├─ backend（server/, server/prisma/）
│    └─ pnpm test --filter=@prism/server
│    └─ pnpm --filter=@prism/server exec prisma migrate status
│
├─ editor（apps/dev-tool/）
│    └─ pnpm typecheck --filter=@prism/dev-tool
│    └─ pnpm build --filter=@prism/dev-tool
│
├─ runtime（apps/user-app/）
│    └─ pnpm typecheck --filter=@prism/user-app
│    └─ pnpm build --filter=@prism/user-app
│
├─ ui-skin（packages/shared-ui/）
│    └─ pnpm typecheck --filter=@prism/shared-ui
│
└─ 跨多个 layer 或无法判断
     └─ 全量验证：pnpm typecheck && pnpm test
```

**全量验证命令**（作为保底）：

```bash
pnpm typecheck
pnpm test
```

### 7. 更新任务状态

每个 task 完成后：
- 将 `status: todo` 改为 `status: done`，或将 `- [ ]` 改为 `- [x]`
- 如果中途停止（用户中断），将当前 task 改为 `status: in-progress`

### 8. 失败处理

验证失败时：
1. **立即停止**，不要继续下一个 task
2. 收集错误输出（test / typecheck 的实际报错）
3. 转交 `openspec-debug` skill，提供：
   - 失败的 task id 和 layer
   - `files` 字段中的相关文件
   - 错误输出摘要

## Guardrails

- **禁止**在 apply 阶段探索代码库
- **禁止**跳过 verify（每个 task 完成后必须验证）
- **禁止**用关键词判断任务类型，改为解析 task 元数据
- **禁止**忽略 layer 优先级
- **禁止**在单个 task 内做过多改动（大 task 必须拆分）
- **强制**优先增量验证（根据 files 字段判断范围）
- **强制**失败时转 debug skill
- **强制**每个 task 执行完立即验证，不累积到结尾
- **强制**未完成的 task 标记为 `status: in-progress`，支持下次续传

## 禁止事项

- 不要跳过任何验证步骤
- 不要在未完成当前 task 前开始下一个
- 不要在 CLI 输出异常时放弃，应使用 fallback 直接读 tasks.md

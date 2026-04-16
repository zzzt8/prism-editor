---
name: openspec-apply
description: 实现 OpenSpec change 的任务。支持断点续传、增量验证、依赖调度。
version: "3.1"
category: apply
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-apply
depends_on:
  - openspec-propose
  - openspec-plan
permissions: []
risks: []
verify:
  - typecheck
---

> **前置共享片段：** layer 映射、验证命令见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 状态真相源

> **v3.0 变更：** Task 状态以 tasks.md checkbox 为主，tasks-state.json 仅作兼容参考（渐进迁移中）。

**主真相源：tasks.md checkbox**
- `- [ ]` → todo
- `- [x]` → done

**兼容参考：tasks-state.json（v3.0 渐进迁移，暂保留文件但不再主动写入）**

**冲突处理规则（必须写死）：**

```
冲突定义：tasks.md checkbox 状态与 tasks-state.json 状态不一致

处理原则：tasks.md checkbox 是唯一主真相源

处理流程：
1. 读取 tasks.md checkbox 状态
2. 如果 JSON 存在，读取 JSON 状态
3. 比对两者：
   - 如果一致：正常继续
   - 如果不一致：
     a. 以 checkbox 为准（主真相）
     b. 输出一条 warning：`[opsx-apply] 状态不一致：tasks.md 为准，JSON 已过时`
     c. 不自动修复 JSON（避免 AI 在未确认情况下覆盖历史）
4. 用户确认后，手动同步 JSON（如需）
```

## Schema / Config 一致性 Preflight（硬关卡）

在所有操作之前执行。如果失败，立即停止。

```bash
# 1. 读取 config.yaml 中配置的 schema 名称
SCHEMA_NAME=$(grep -E "^schema:" openspec/config.yaml | sed 's/^schema: *//')

# 2. 检查 schema 目录是否存在
if [ ! -d "openspec/schemas/$SCHEMA_NAME" ]; then
  echo "[opsx-apply] Schema 缺失，硬关卡触发。"
  echo ""
  echo "openspec/config.yaml 引用了 schema '$SCHEMA_NAME'，"
  echo "但 'openspec/schemas/$SCHEMA_NAME/' 目录不存在。"
  echo ""
  echo "可能原因："
  echo "  - Schema 被误删"
  echo "  - config.yaml 中的 schema 名称过时"
  echo ""
  echo "排查建议："
  echo "  1. 检查 openspec/schemas/ 下有哪些可用 schema：ls openspec/schemas/"
  echo "  2. 检查 openspec/config.yaml 中的 schema 字段"
  echo "  3. 查看 git log openspec/schemas/ 定位删除提交"
  echo ""
  echo "下一步：输入 /opsx-debug 调试"
  echo "停止执行。"
  exit 1
fi

# 3. 检查 schema.yaml 是否存在
if [ ! -f "openspec/schemas/$SCHEMA_NAME/schema.yaml" ]; then
  echo "[opsx-apply] Schema 定义文件缺失，硬关卡触发。"
  echo ""
  echo "'openspec/schemas/$SCHEMA_NAME/' 目录存在，"
  echo "但 'openspec/schemas/$SCHEMA_NAME/schema.yaml' 文件缺失。"
  echo ""
  echo "Schema 定义不完整，请检查目录内容。"
  echo "下一步：输入 /opsx-debug 调试"
  echo "停止执行。"
  exit 1
fi
```

**硬关卡：Schema 检查失败 → 输出上述信息后立即停止。**

## Artifact Precondition（硬关卡）

在开始执行前，必须确认以下 artifacts 存在且可读：

```bash
test -f "openspec/changes/<name>/proposal.md"
test -f "openspec/changes/<name>/design.md"
test -f "openspec/changes/<name>/tasks.md"
```

**硬关卡：若任一 artifact 缺失：**
- 停止 apply
- 输出：`[opsx-apply] 缺少 artifact（<文件名>），请先通过 /opsx-propose 生成`
- 不得自行创建或复制 artifact

**一致性检查（软警告）：**
- proposal 的 change name 与当前 change 名称是否一致
- 若不一致，输出 warning：`proposal 与当前 change 名称不一致，请确认`

## 增量验证：基于 git diff

> **原则：** 不依赖 Agent 预估的 files 字段，而是 task 完成后通过 `git diff --name-only` 获取实际改动的文件列表。

### 流程

```
task 完成 → git commit → git diff --name-only HEAD~1 → 计算受影响 layers → 执行增量验证
```

**计算受影响 layers：**

```bash
git diff --name-only HEAD~1
```

```javascript
function getAffectedLayers(changedFiles) {
  const layers = new Set();
  for (const file of changedFiles) {
    if (file.startsWith('packages/workflow-core/') ||
        file.startsWith('packages/image-ops/') ||
        file.startsWith('packages/node-definitions/')) {
      layers.add('engine');
    } else if (file.startsWith('server/')) {
      layers.add('backend');
    } else if (file.startsWith('apps/dev-tool/')) {
      layers.add('editor');
    } else if (file.startsWith('apps/user-app/')) {
      layers.add('runtime');
    } else if (file.startsWith('packages/shared-ui/')) {
      layers.add('ui-skin');
    } else if (file.startsWith('.cursor/skills/')) {
      layers.add('meta');
    }
  }
  return [...layers];
}
```

**增量验证命令（按 layer）：**

| Layer | 验证命令 |
|-------|---------|
| engine | `pnpm test --filter=@prism/workflow-core`<br>`pnpm test --filter=@prism/image-ops` |
| backend | `pnpm test --filter=@prism/server`<br>`pnpm --filter=@prism/server exec prisma migrate status` |
| editor | `pnpm typecheck --filter=@prism/dev-tool` |
| runtime | `pnpm typecheck --filter=@prism/user-app` |
| ui-skin | `pnpm typecheck --filter=@prism/shared-ui` |
| meta | `pnpm typecheck` |
| 跨层或无法判断 | `pnpm typecheck && pnpm test`（降级全量） |

**验证规则：**
- Incremental 验证失败 → **立即停止**，转 `openspec-debug`
- 不累积错误到结尾

## 执行流程

### 1. 选择 change

```bash
openspec status --change "<name>" --json
```

- 如果 change name 未提供，尝试从上下文推断
- 如果有多个 active change，列出供用户选择

### 2. 读取任务状态

**优先读取 tasks.md checkbox 状态：**
- 扫描 tasks.md 中的 `- [ ]` 和 `- [x]`
- `- [ ]` → todo
- `- [x]` → done

**如果 tasks-state.json 存在，读取作为兼容参考：**
- 比对 checkbox 与 JSON 状态
- 如不一致，以 checkbox 为准，输出 warning

### 3. 解析 task 元数据

> **v3.0 变更：** 元数据精简。risk / priority / estimated_time 已删除，详见 [SKILL-SCHEMA.md](../_shared/SKILL-SCHEMA.md)。

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
- [ ] T1: 更新 WorkerPoolConfig 接口
  - layer: engine
  - **验收标准**：新接口向后兼容旧接口
```

### 4. 检查依赖

```javascript
function checkDependencies(taskId, deps, checkboxState) {
  const blockers = [];

  // type=task：同一 tasks.md 内的前置 task
  for (const ref of deps.filter(d => d.type === 'task').flatMap(d => d.refs)) {
    const refStatus = checkboxState[ref];
    if (refStatus !== 'done') {
      blockers.push({ type: 'task', ref, current_status: refStatus });
    }
  }

  // type=change：外部 change 的完成状态
  for (const dep of deps.filter(d => d.type === 'change')) {
    for (const changeName of dep.refs) {
      const extState = readExternalCheckbox(changeName);
      const statusRequired = dep.status_required || 'completed';
      if (!meetsStatusRequirement(extState, statusRequired)) {
        blockers.push({
          type: 'change',
          ref: changeName,
          required: statusRequired,
          current: extState.overall_status
        });
      }
    }
  }

  return blockers;
}
```

如有依赖未满足：将 task 记录为 blocked，不执行，记录在摘要中。

### 5. 按 layer 优先级排序

```
按 layer 优先级执行：engine > backend > editor > runtime > ui-skin > meta
```

同 layer 内按 task id 字母顺序。

### 6. 按排序后顺序执行

**单个 task 执行步骤：**

```
1. 执行 task 内容（代码改动）
2. Git commit：记录本次改动（必须有 commit，否则无法 git diff）
3. Git diff 获取实际文件：git diff --name-only HEAD~1
4. 计算受影响 layers
5. 执行增量验证
6. 更新 tasks.md checkbox：
   - 如成功：- [ ] → - [x]
   - 如失败：保持 - [ ]，输出一条简短的 error 摘要
7. 失败 → 转 openspec-debug，提供错误输出
```

### 7. Full 验证（所有 tasks 完成后）

```bash
pnpm typecheck
pnpm test
```

**Full 验证通过标准：**
- 类型检查全部通过
- 所有测试通过

### 8. Test Failure Attribution（声明 + 条件阻断）

> **原则：先声明，声明不成立再硬停。**

**Full 验证或增量验证出现测试失败时：**

```markdown
## Test Failure Attribution（强制声明）

**失败测试列表：**
| 测试名称 | 失败特征 | 在 git diff 覆盖范围内？ |

**归因分析（逐条，必须输出）：**
| 测试 | 归因级别 | 证据 |
|------|---------|------|
| [TC-xxx] | related / unrelated_proven / flaky_proven / undetermined | git diff / pre-existing / flaky 历史 |

**归因判定标准：**

| 级别 | 定义 | 后续动作 |
|------|------|---------|
| `related` | 测试在本次改动覆盖范围内 | 硬关卡：不得标记完成，必须修复 |
| `unrelated_proven` | 能用 git diff 证明不在覆盖范围 | 记录归因，继续 |
| `flaky_proven` | 已知 flaky，失败特征与历史一致 | 记录归因，继续 |
| `undetermined` | 无法明确证明无关 | **硬关卡：禁止给出"可以完成"结论** |

**如果存在 `undetermined` 或 `related`：**
- 输出：`[opsx-apply] Test Failure Attribution 阻断：存在 N 个未归因测试`
- **强制**进入 /opsx-debug 并附上归因分析
- **禁止**自行判断"与本次 change 无关"并继续推进
```

### 9. 大 task 拆分判断

```
拆分条件（满足任一）：
├─ 预判需修改 >5 个文件
├─ 跨越 >3 个子模块（按 packages/*/src/ 下的直接子目录）

拆分方向：
├─ 能否独立运行一个最小功能？ → 拆成 T1a（核心）+ T1b（边界）+ T1c（优化）
├─ 是否有明确的先后依赖？ → 按依赖顺序拆成独立 task
└─ 是否涉及多个 layer？ → 按 layer 拆分，每个 layer 一个 task
```

## Guardrails

**强制：**
- **强制**状态以 tasks.md checkbox 为唯一真相源，JSON 仅作兼容参考
- **强制**每个 task 完成后执行 git commit，再执行 git diff
- **强制**增量验证基于实际改动的文件（git diff），不依赖预估的 files 字段
- **强制**失败时转 openspec-debug，提供错误输出
- **强制**每个 task 完成后立即增量验证，不累积到结尾
- **强制**执行前检查 dependencies 依赖
- **强制**按 layer 优先级排序（engine > backend > editor > runtime > ui-skin > meta）
- **强制**apply 开始前验证所有 artifacts 存在，缺失则阻断
- **强制**测试失败时执行 Test Failure Attribution 并输出归因分析
- **强制**存在 `related` 或 `undetermined` 时必须转 /opsx-debug
- **强制**调用 CLI 前必须执行 Schema / Config 一致性 Preflight，检查失败则立即停止

**禁止：**
- **禁止**在 apply 阶段探索代码库
- **禁止**跳过增量验证
- **禁止**忽略 layer 优先级
- **禁止**在 CLI 输出异常时放弃，应使用 fallback
- **禁止**忽略 blocked dependencies
- **禁止**未完成归因声明就自行判断"与本次 change 无关"

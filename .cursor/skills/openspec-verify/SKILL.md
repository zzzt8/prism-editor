---
name: openspec-verify
description: 验证 OpenSpec change 的实现一致性 — completeness / correctness / coherence。职责边界：只做检查，不做修复。
---

> **前置共享片段：** layer 映射、验证命令、增量测试策略见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 职责边界（重要）

verify 只做**检查**，不负责修复。检查发现的问题由 `openspec-apply` 修复后重新 verify。如果检查本身遇到困难（如找不到对应文件），则转 `openspec-debug`。

```
apply 负责：执行 + 增量验证（每 task 完成后立即运行）
verify 负责：系统性检查（Completeness + Correctness + Coherence）
                ↓
          发现问题 → 返回 apply 修复 → 重新 verify
```

## 执行流程

### 1. 选择 change

```bash
openspec status --change "<name>" --json
```

### 2. Completeness 检查

读取 `openspec/changes/<name>/tasks.md`：

- 所有 task 都是 `- [x]` 或 `status: done`
- architecture-review 章节已填写（当需要时）
- test-plan 章节已填写（当需要时）
- 所有 `<!-- opsx-meta -->` 块中声明的 `files` 都有实际改动

** Completeness 通过标准：**
- 文档层面无遗漏
- 不检查代码正确性（那是 Correctness 的职责）

### 3. Correctness 检查

使用**增量验证策略**（基于 tasks.md 中所有 task 的 `files` 字段聚合判断）：

```
所有 task 的 files 字段聚合后涉及哪些 layer？
│
├─ engine
│    └─ pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops --filter=@prism/node-definitions
│    └─ pnpm test --filter=@prism/workflow-core
│    └─ pnpm test --filter=@prism/image-ops
│
├─ backend
│    └─ pnpm typecheck --filter=@prism/server
│    └─ pnpm test --filter=@prism/server
│    └─ pnpm --filter=@prism/server exec prisma migrate status
│
├─ editor
│    └─ pnpm typecheck --filter=@prism/dev-tool
│    └─ pnpm build --filter=@prism/dev-tool
│
├─ runtime
│    └─ pnpm typecheck --filter=@prism/user-app
│    └─ pnpm build --filter=@prism/user-app
│
└─ 跨多层或无法聚合判断
     └─ 全量验证：pnpm typecheck && pnpm test
```

**Correctness 通过标准：**
- 类型检查全部通过
- 相关 layer 的测试全部通过
- 不关心测试覆盖率，只关心是否有 regression

### 4. Coherence 检查（按步骤执行）

读取 `openspec/changes/<name>/design.md` 和 `tasks.md`：

**Step 1 — 技术方案落地检查：**
对照 design.md 的每个技术决策，读取对应文件验证：
- 如果 design 说"使用 LRU cache"，检查 `packages/workflow-core/src/cache/` 下是否真有 LRU 实现
- 如果 design 说"Prisma schema 增加了 PublishedWorkflow 表"，检查 `server/prisma/schema.prisma`

**Step 2 — Test Plan 覆盖检查：**
对照 tasks.md 的 Test Plan 章节：
- 每个声明的测试用例是否都有对应测试文件？
- 如果 design 说"新增了 Composite node 的 blend mode 测试"，检查 `packages/image-ops/src/` 下是否有对应的 `.test.ts`

**Step 3 — Edge Case 完整性：**
- 读取 `packages/image-ops/src/**/*.test.ts`，检查是否有边界值测试（空输入、极大图片、错误格式等）
- 读取 `packages/workflow-core/src/**/*.test.ts`，检查错误路径测试（循环依赖、缺少输入等）

**Coherence 通过标准：**
- design 中的每个技术承诺都有对应实现
- test-plan 中的每个测试用例都有对应测试文件
- 没有明显偏离设计意图的实现（如 design 没提到的"顺手改进"）

### 5. 输出结果

```
## Verify Result

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Completeness | ✓/✗ | N/N tasks done, N/N artifacts complete |
| Correctness | ✓/✗ | N/N layers passed, N errors |
| Coherence | ✓/✗ | N/N design decisions matched |

发现的问题：
1. [Correctness] T2: pnpm test --filter=@prism/workflow-core 失败，测试用例 ImageRuntimeObject 引用了已移除的字段
2. [Coherence] T5: design.md 承诺使用 LRU cache，但 cache 实现中未见 evict 策略
3. [Completeness] T7: architecture-review 章节缺失（跨 app 改动）

下一步：
- 如果全部通过 → 可以 archive
- 如果有问题 → 转回 apply 修复对应 task，修复后重新运行 verify
```

## Guardrails

- **强制**在 archive 前执行 verify
- **禁止**跳过 verify 直接 archive
- **强制**按增量策略运行针对性测试（不要每次都全量）
- **强制**检查 Coherence（实现与设计一致）
- **禁止**在 verify 阶段修复代码，只负责发现问题
- **强制**区分 Correctness 问题（代码错误）和 Coherence 问题（设计偏离），记录在输出中

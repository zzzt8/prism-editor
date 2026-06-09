---
name: openspec-verify
description: 验证 OpenSpec change 的实现一致性。非阻断报告模式。
version: "4.0"
category: verify
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-verify
depends_on:
  - openspec-propose
verify:
  - typecheck
---

> **verify 模板来源：** ../../openspec/schemas/prism-workflow/templates/verify.md

## 核心原则

- **非阻断**：verify 只做检查和报告，不阻断任何流程
- **发现问题 → 返回 apply 修复 → 重新 verify**（由 Agent 自行判断是否需要）
- 不需要人工确认

## 执行步骤

```
1. 读 tasks.md checkbox 状态
2. Full Verification：pnpm typecheck && pnpm test --run
   - 无论通过与否，继续
   - 自动归因：related / unrelated / flaky
3. Coherence Check（自动化比对）
3.5 ECC review lanes（按需）
4. 输出分级报告
```

## Step 1: Checkbox 检查

读 `tasks.md`，统计：

```
- [x] 的数量 / 总 task 数
- [ ] 的数量（pending + blocked）
```

## Step 2: Full Verification

```bash
pnpm typecheck && pnpm test --run
```

- **归因**（自动判断，不阻塞）：

| 失败测试 | 在本次 git diff 范围内？ | 归因 | 动作 |
|---------|-----------------------|------|------|
| 是 | related | 记录到报告 |
| 否 | unrelated | 记录到报告 |
| 否 | flaky | 记录到报告（标记 flaky）|

git diff 范围 = 从 change 首次 commit 到当前 HEAD 的所有改动文件。

## Step 3: Coherence Check（自动化）

> 不依赖 Agent 主观判断，完全基于代码搜索和文本比对。

读取 `design.md`，提取以下关键决策（用 grep/find 自动验证）：

| 设计中的关键词/模式 | 对应代码证据 |
|-------------------|------------|
| 提到的文件路径 | 该文件存在 |
| 提到的函数/变量名 | 代码中存在 |
| 提到的配置/常量 | 代码中存在 |
| 提到的 API 端点 | server 路由文件中有定义 |

对于每条 design 决策：
- 找到对应代码证据 → 记录 ✓
- 找不到 → 记录为 WARNING，列出缺失项

> Coherence 不检查"行为是否正确"，只检查"design 里提到的东西代码里有没有"。

## Step 4: 输出报告

```markdown
## Verify 结果

- **Checkbox**：`6/8 done`，`2` pending（blocked: T4）
- **Full 验证**：
  - typecheck：✓
  - tests：⚠ `N` 个失败
    - [related] `<file>` → `<test name>`
    - [unrelated] `<file>` → `<test name>`（pre-existing）
- **Coherence**：⚠ `N` 个不一致
  - WARNING: design 提到 `<xxx>` 但代码中未找到
- **结论**：报告模式（不阻断 archive）

> 建议：修复 related 测试失败后重新 verify。
```

## Guardrails

- **不阻断 archive**：verify 无论通过与否，都不阻止调用 archive
- **不询问确认**：Agent 自行判断是否需要修复后重新 verify
- **归因不停止**：即使所有测试都是 related，也不停下来等用户，输出报告后结束

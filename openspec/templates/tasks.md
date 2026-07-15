# Tasks Template

> 每个 OpenSpec change 必须包含此文件。描述小步任务清单和验收标准。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | <!-- N --> |
| Completed | <!-- N --> |
| In Progress | <!-- N --> |

---

## Phase X.X - 阶段名称

### T.X.X - 任务标题

**opsx-meta**

```yaml
id: T.X.X
layer: <!-- packages/core / apps/dev-tool / etc -->
task_type: <!-- feature / refactor / tdd / verification -->
verify:
  - type: <!-- command / file_content / dir_exists -->
    <!-- 具体验证配置 -->
```

**Description**

<!-- 任务详细描述 -->

**Acceptance Criteria**

- [ ] <!-- 验收标准 1 -->
- [ ] <!-- 验收标准 2 -->

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）
- [ ] N.1.2 节点 executor 错误隔离测试
- [ ] N.1.3 AbortController 链路测试（取消后结果保留）

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试
- [ ] N.2.2 取消后 Zustand store 状态检查

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证
- [ ] N.3.2 Prisma migration 验证（`prisma migrate status`）
- [ ] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 API 输入 Zod 验证覆盖（如涉及 API 变更）

---

## Completion Checklist

### 功能完成
- [ ] 所有 tasks 完成
- [ ] 所有 specs 场景实现

### 质量门禁
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过 (<!-- N --> tests)
- [ ] `pnpm build` 通过
- [ ] 覆盖率达标

### 测试覆盖
- [ ] 所有 Scenario 有测试映射
- [ ] 核心算法有单元测试
- [ ] 关键流程有 E2E 测试

### 文档
- [ ] proposal.md 完整
- [ ] design.md 完整
- [ ] specs/*.md 包含所有场景
- [ ] test-plan.md 完整
- [ ] verification.md 记录实际结果
- [ ] qa-report.md 记录所有问题

### Review
- [ ] AI Review 无 Critical/High 问题
- [ ] 人工 Review 通过
- [ ] 所有问题已修复或计划

**最终状态**: DRAFT / READY_FOR_REVIEW / APPROVED / MERGED

---

**完成标准**: N.1 ~ N.5 全部勾选后，方可标记 change 为 completed 并申请合并。

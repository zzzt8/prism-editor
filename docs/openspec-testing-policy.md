# OpenSpec Testing Policy

> 本文档定义了 Prism Editor 项目 OpenSpec Change 的测试策略和质量门槛。每个 change 必须遵循本文档的要求才能合并。

---

## 1. Change 必需文件清单

每个 `openspec/changes/<change-name>/` 目录必须包含以下文件：

| 文件 | 必需 | 说明 |
|------|------|------|
| `.openspec.yaml` | 是 | Change 元数据 |
| `proposal.md` | 是 | 为什么做、范围、不做什么 |
| `design.md` | 是 | 技术方案、数据流、文件影响 |
| `tasks.md` | 是 | 小步任务清单 |
| `specs/*.md` | 是 | 用户可感知行为和验收场景 |
| `test-plan.md` | 是 | 这个 change 要怎么测 |
| `verification.md` | 是 | 实际跑过哪些命令、结果 |
| `qa-report.md` | 是 | AI/人工 reviewer 发现的问题 |

---

## 2. Spec → 测试映射规则

### 2.1 Scenario 映射原则

每个 `specs/*.md` 中的 Scenario 必须映射到具体的测试用例：

```
Scenario: 用户输入有效 URL 时，图片加载成功
  ↓
test("loads image from valid URL")
```

### 2.2 映射检查清单

| Scenario 类型 | 必须映射到 | 示例 |
|---------------|----------|------|
| WHEN ... THEN ... | 单元测试或集成测试 | `getLuminance(255,0,0) → 76.245` |
| 用户点击/输入 | E2E 测试 | `用户点击保存按钮 → 工作流保存成功` |
| 多模块协作 | 集成测试 | `拓扑排序 + 执行 → 正确顺序` |
| 错误处理 | 单元测试 | `空输入 → 抛出错误` |

### 2.3 映射模板

```markdown
#### Scenario: 用户输入有效 URL 时，图片加载成功

**测试映射**:
- 单元测试: `packages/image-ops/src/nodejs/load-image.test.ts`
  - "loads image from valid URL"
  - "handles invalid URL gracefully"
```

---

## 3. 测试类型决策树

```
变更涉及什么？
│
├── 纯函数/算法
│   └── 必须：单元测试
│
├── UI 交互
│   ├── 关键流程（登录、保存、执行）
│   │   └── 必须：Playwright E2E
│   └── 辅助功能
│       └── 建议：Vitest 组件测试
│
├── 多个模块协作
│   └── 必须：集成测试
│
├── API/后端逻辑
│   ├── 读取/写入
│   │   └── 必须：API 测试
│   └── 权限/认证
│       └── 必须：E2E 测试
│
└── 数据持久化
    └── 必须：E2E 测试（保存/加载验证）
```

---

## 4. 必须编写测试的场景

### 4.1 核心算法

| 算法 | 必须测试 | 边界值 |
|------|----------|--------|
| 拓扑排序 | 是 | 单节点、多节点、循环依赖 |
| 图像叠加 | 是 | 透明、全覆盖、部分覆盖 |
| 蒙版应用 | 是 | alpha、亮度、亮度 |
| 格式解析 | 是 | 有效格式、无效格式、边界格式 |

### 4.2 执行引擎

| 场景 | 必须测试 | 验证点 |
|------|----------|--------|
| 节点执行 | 是 | 正常执行、错误处理、结果格式 |
| 拓扑排序 | 是 | 正确顺序、循环检测 |
| 取消操作 | 是 | signal 传递、结果保留 |
| 状态转换 | 是 | idle↔running↔done |

### 4.3 Registry

| 场景 | 必须测试 | 验证点 |
|------|----------|--------|
| 注册节点 | 是 | 成功注册 |
| 重复注册 | 是 | 抛出错误 |
| 获取节点 | 是 | 正确返回 |

---

## 5. 必须使用 E2E 测试的场景

### 5.1 关键用户流程

| 流程 | E2E 必须覆盖 |
|------|--------------|
| 新建工作流 | 是 |
| 添加节点 | 是 |
| 连接节点 | 是 |
| 执行流水线 | 是 |
| 保存/加载工作流 | 是 |
| 导出图像 | 是 |
| 用户认证 | 是 |

### 5.2 E2E 测试模板

```typescript
// apps/dev-tool/e2e/workflow-execution.test.ts
import { test, expect } from '@playwright/test';

test.describe('工作流执行', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 创建一个基础工作流
  });

  test('用户执行包含蒙版的工作流', async ({ page }) => {
    // 添加节点
    await page.click('[data-testid="add-node"]');
    await page.selectOption('[data-testid="node-type"]', 'mask');

    // 连接节点
    await page.drag('[data-testid="node-base"]', '[data-testid="node-mask"]');

    // 执行
    await page.click('[data-testid="run-button"]');

    // 验证结果
    await expect(page.locator('[data-testid="preview"]')).toBeVisible();
  });

  test('执行失败时显示错误', async ({ page }) => {
    // 设置错误场景
    await page.fill('[data-testid="invalid-param"]', 'invalid');

    await page.click('[data-testid="run-button"]');

    // 验证错误提示
    await expect(page.locator('.error-message'))
      .toContainText('Invalid parameter');
  });
});
```

---

## 6. 必须更新文档的场景

### 6.1 API 变更

| 变更类型 | 必须更新的文档 |
|----------|--------------|
| 新增 API | API 文档、OpenAPI spec |
| 修改 API | API 变更日志、版本说明 |
| 删除 API | 迁移指南、弃用说明 |

### 6.2 功能变更

| 变更类型 | 必须更新的文档 |
|----------|--------------|
| 新增功能 | README、功能说明、用户指南 |
| UI 变更 | 截图更新、交互说明 |
| 配置变更 | 环境变量说明、配置文档 |

### 6.3 架构变更

| 变更类型 | 必须更新的文档 |
|----------|--------------|
| 目录结构 | README、架构图 |
| 依赖关系 | package.json 注释、README |
| 部署方式 | 部署文档、环境配置 |

---

## 7. 测试覆盖率要求

### 7.1 覆盖率目标

| 包/模块 | 行覆盖率目标 | 分支覆盖率目标 |
|---------|------------|---------------|
| `@prism/workflow-core` | > 80% | > 70% |
| `@prism/image-ops/core` | > 90% | > 85% |
| `@prism/image-ops/browser` | > 60% | > 50% |
| `@prism/shared-types` | > 90% | > 80% |
| `@prism/core` | > 70% | > 60% |

### 7.2 覆盖率检查

每个 change 必须验证：

```bash
# 检查覆盖率
pnpm test:coverage

# 查看覆盖率报告
# coverage/index.html
```

---

## 8. Change 完成标准

### 8.1 必须完成的条件

| 条件 | 验证方式 | 状态 |
|------|----------|------|
| 所有 Scenario 有测试映射 | test-plan.md 完整 | 必须 |
| 单元测试通过 | `pnpm test` | 必须 |
| E2E 测试通过（如适用） | `pnpm test:e2e` | 必须 |
| TypeCheck 通过 | `pnpm typecheck` | 必须 |
| Lint 通过 | `pnpm lint` | 必须 |
| Build 通过 | `pnpm build` | 必须 |
| 覆盖率达标 | coverage report | 必须 |
| QA Review 通过 | qa-report.md | 必须 |
| 所有 Critical/High 已修复 | qa-report.md | 必须 |

### 8.2 完成检查清单

在 `tasks.md` 末尾添加：

```markdown
## Completion Checklist

### 功能完成
- [ ] 所有 tasks 完成
- [ ] 所有 specs 场景实现

### 质量门禁
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过 (X tests)
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
```

---

## 9. 验证流程

### 9.1 开发流程中的验证

```
1. 编写 test-plan.md
   ↓
2. 实现代码 + 测试
   ↓
3. 运行 pnpm verify
   ↓
4. 填充 verification.md
   ↓
5. 申请 QA Review
   ↓
6. 修复问题
   ↓
7. 合并
```

### 9.2 CI/CD 验证

```yaml
# .github/workflows/ci.yml
- name: Quality Gate
  run: pnpm verify

- name: E2E Tests
  run: pnpm test:e2e
  if: always()

- name: Coverage Report
  run: pnpm test:coverage
  if: always()
```

---

## 10. 模板引用

快速创建新 change 时，复制以下模板目录：

```
openspec/changes/
├── <change-name>/
│   ├── .openspec.yaml          # 复制自已有 change
│   ├── proposal.md             # 复制自 templates/proposal.md
│   ├── design.md              # 复制自 templates/design.md
│   ├── tasks.md               # 复制自 templates/tasks.md
│   ├── specs/                 # 创建功能相关 spec
│   │   └── feature-spec.md
│   ├── test-plan.md           # 复制自 openspec/templates/test-plan.md
│   ├── verification.md         # 复制自 openspec/templates/verification.md
│   └── qa-report.md          # 复制自 openspec/templates/qa-report.md
```

---

## 附录 A: 测试命名约定

```
<功能>.<场景>.<预期行为>

Examples:
- getLuminance.red.returnsCorrectValue
- applyMask.transparentMask.preservesOriginal
- executor.invalidInput.throwsError
- workflowExecution.cancel.preservesResults
```

## 附录 B: 禁止的测试模式

| 模式 | 问题 | 替代方案 |
|------|------|----------|
| `setTimeout` | 不可靠 | `vi.useFakeTimers()` |
| 共享状态 | 测试间耦合 | 每个测试独立 setup |
| `test.skip` | 隐藏问题 | 修复或标记 `test.only` |
| 硬编码时间 | 环境敏感 | 等待条件而非时间 |

## 附录 C: 快速参考

### 测试类型决策

```
纯函数 → 单元测试
算法 → 单元测试 + 边界测试
UI 交互 → E2E 测试
多模块协作 → 集成测试
持久化 → E2E 测试
关键流程 → E2E 测试
```

### 覆盖率要求

```
核心引擎: > 80%
纯算法: > 90%
UI 代码: > 60%
类型定义: > 90%
```

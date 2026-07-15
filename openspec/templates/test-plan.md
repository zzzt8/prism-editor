# Test Plan

> 本文档描述 change 的测试策略。每个 Scenario 应映射到具体的测试用例。

---

## 1. 测试策略概览

| 类型 | 范围 | 工具 | 何时运行 |
|------|------|------|----------|
| 单元测试 | 纯函数、算法、工具函数 | Vitest | 每次 PR |
| 集成测试 | 模块间协作、API 边界 | Vitest | 每次 PR |
| E2E 测试 | 完整用户流程、UI 交互 | Playwright | 每次 PR + CI |
| 性能测试 | 关键路径耗时 | Vitest Benchmark | 每次 PR |

---

## 2. Scenario → 测试用例映射

每个 `specs/*.md` 中的 Scenario 必须映射到至少一个测试用例：

### 映射规则

```
Scenario
  ├── 有 "WHEN ... THEN ..." 格式
  │     └── 必须有对应测试用例
  ├── 涉及 UI 交互
  │     └── 必须有 E2E 测试
  ├── 涉及纯函数/算法
  │     └── 必须有单元测试
  └── 涉及多个模块协作
        └── 必须有集成测试
```

### 示例

```
Scenario: 用户输入有效 URL 时，图片加载成功
  └── test: src/load-image.test.ts
        - "loads image from valid URL"
```

---

## 3. 需要单元测试的场景

### 3.1 纯算法函数

| 代码类型 | 示例 | 测试要求 |
|----------|------|----------|
| 数值计算 | `getLuminance(r, g, b)` | 边界值、典型值 |
| 字符串处理 | `parseImageSource(params)` | 有效/无效输入 |
| 数据转换 | `topologicalSort(nodes, connections)` | 正常/异常图 |
| 状态机 | `executeWorkflow()` 状态转换 | 所有转换路径 |

### 3.2 工具函数

```typescript
// 必须为纯函数编写单元测试
describe('getLuminance', () => {
  it('calculates correct luminance for red', () => {
    expect(getLuminance(255, 0, 0)).toBeCloseTo(76.245, 2);
  });
});
```

### 3.3 Registry 函数

```typescript
describe('globalRegistry', () => {
  it('throws on duplicate registration', () => {
    expect(() => registerNode(duplicateType)).toThrow('already registered');
  });
});
```

---

## 4. 需要 E2E 测试的场景

### 4.1 用户关键流程

| 流程 | 触发条件 | 测试覆盖 |
|------|----------|----------|
| 新建工作流 | 任何变更涉及工作流创建 | 必须 |
| 执行流水线 | 任何变更涉及节点执行 | 必须 |
| 保存/加载 | 任何变更涉及数据持久化 | 必须 |
| 用户认证 | 任何变更涉及 auth | 必须 |

### 4.2 UI 交互

| 交互 | 测试要求 |
|------|----------|
| 节点拖拽 | 端到端验证 |
| 画布缩放 | 端到端验证 |
| 参数面板编辑 | 端到端验证 |
| 右键菜单 | 端到端验证 |

### 4.3 E2E 测试模板

```typescript
// apps/dev-tool/e2e/workflow-creation.test.ts
import { test, expect } from '@playwright/test';

test.describe('工作流创建', () => {
  test('用户可以创建并保存新工作流', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="new-workflow"]');
    await page.fill('[data-testid="workflow-name"]', 'Test Workflow');
    await page.click('[data-testid="create-button"]');

    // 验证工作流已创建
    await expect(page.locator('[data-testid="workflow-title"]'))
      .toHaveText('Test Workflow');

    // 验证可保存
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('.toast')).toContainText('Saved');
  });
});
```

---

## 5. 需要性能测试的场景

### 5.1 关键路径性能基准

| 场景 | 目标 | 阈值 |
|------|------|------|
| 图像加载 (1K) | < 100ms | 200ms |
| 图像加载 (4K) | < 500ms | 1000ms |
| 蒙版应用 (4K) | < 50ms | 2000ms |
| 拓扑排序 (100 节点) | < 10ms | 100ms |

### 5.2 性能测试模板

```typescript
// packages/image-ops/src/apply-mask-benchmark.test.ts
import { describe, it, expect } from 'vitest';

describe('ApplyMask Performance Benchmark', () => {
  it('Alpha mask 4K performance < 50ms', () => {
    const start = performance.now();
    applyMask(testImage, testMask);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
```

---

## 6. 回归测试策略

### 6.1 必须覆盖的回归场景

每个 change 必须验证以下场景不会退化：

| 场景 | 验证方式 |
|------|----------|
| 拓扑排序正确性 | 已有测试 + 新场景 |
| 节点执行不崩溃 | 集成测试 |
| UI 渲染正常 | E2E 截图验证 |
| API 响应正确 | API 测试 |

### 6.2 Golden Fixture 测试

对于像素级输出一致性（如 browser/nodejs 输出一致）：

```
test/
├── fixtures/
│   ├── input-red-100x100.png
│   ├── mask-100x100.png
│   └── expected-output.png
└── golden.test.ts
```

---

## 7. 测试数据管理

### 7.1 测试 Fixtures

| 类型 | 位置 | 管理方式 |
|------|------|----------|
| 图片 fixtures | `test/fixtures/images/` | 版本控制 |
| JSON fixtures | `test/fixtures/json/` | 版本控制 |
| 动态生成 | 在测试中生成 | 不持久化 |

### 7.2 Mock 策略

```typescript
// 使用 Vitest 的 vi.fn() 进行 mocking
import { vi, describe, it, expect } from 'vitest';

describe('executor with mocked dependencies', () => {
  it('calls onProgress callback', async () => {
    const onProgress = vi.fn();
    await executeNode({ onProgress });
    expect(onProgress).toHaveBeenCalled();
  });
});
```

---

## 8. 测试覆盖率目标

| 包 | 覆盖率目标 | 说明 |
|----|------------|------|
| `@prism/workflow-core` | > 80% | 核心引擎 |
| `@prism/image-ops/core` | > 90% | 纯算法 |
| `@prism/image-ops/browser` | > 60% | UI 交互 |
| `@prism/shared-types` | > 90% | 类型定义 |
| `@prism/core` | > 70% | 编排逻辑 |

---

## 9. 测试执行时间目标

| 测试类型 | 单包目标 | Monorepo 目标 |
|----------|----------|----------------|
| 单元测试 | < 30s | < 60s |
| 集成测试 | < 60s | < 120s |
| E2E 测试 | < 5min | < 10min |

---

## 10. 禁止的模式

### 10.1 测试中禁止

```typescript
// 禁止: 硬编码时间等待
await page.waitForTimeout(2000);

// 禁止: 测试间共享状态
let sharedCounter = 0;
test('increments', () => { sharedCounter++; });
test('reads', () => { expect(sharedCounter).toBe(1); }); // 脆弱!

// 禁止: 跳过测试
test.skip('important but failing', () => { ... });
```

### 10.2 替代方案

```typescript
// 正确: 使用显式等待
await expect(page.locator('.result')).toBeVisible({ timeout: 10000 });

// 正确: 每个测试独立设置
test('increments', () => {
  const counter = { value: 0 };
  counter.value++;
  expect(counter.value).toBe(1);
});

// 正确: 修复问题而非跳过
test('handles edge case', async () => {
  await setupEdgeCase();
  // ... test implementation
});
```

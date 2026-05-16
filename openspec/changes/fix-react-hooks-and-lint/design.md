---
goals:
  - Fix React Hook conditional call violations
  - Remove all unused variables and imports
  - Achieve 0 ESLint errors
non_goals:
  - Do not change business logic
  - Do not add new features
  - Do not modify test files
---

# Design: fix-react-hooks-and-lint

## Problem Analysis

### React Hook Conditional Call Issue

React Hooks 规则要求：
- Hooks 必须在组件顶层调用
- 条件调用（如在 `if` 内调用 `useState`）会导致 Hook state 错乱

典型错误模式：
```tsx
function Component({ flag }) {
  if (flag) {
    const [state, setState] = useState(); // ❌ Conditional call
  }
  // ...
}
```

正确模式：
```tsx
function Component({ flag }) {
  const [state, setState] = useState(); // ✅ Always at top level
  // Use flag conditionally in logic, not in hook call
}
```

### Unused Variables Issue

大量未使用的变量/导入/常量影响：
- 代码可读性
- Tree-shaking 效果
- 编译性能

## Solution

### Fix React Hook Conditional Calls

对于每个有问题的文件：

1. 将条件调用的 Hook 提升到组件顶层
2. 在 Hook 后使用条件逻辑处理值
3. 或使用 early return 模式（在条件不满足时提前返回）

示例修复（`ParametersPanel.tsx`）:
```tsx
// Before
function ParametersPanel({ hasParams }) {
  if (hasParams) {
    const [localParams, setLocalParams] = useState({});
  }
  // ...
}

// After
function ParametersPanel({ hasParams }) {
  const [localParams, setLocalParams] = useState({});
  // Use hasParams in conditional logic, not in hook call
  const effectiveParams = hasParams ? localParams : {};
  // ...
}
```

### Fix Unused Variables

策略：
1. 首先尝试 `eslint --fix` 自动修复
2. 手动清理无法自动修复的（如未使用的枚举导出）
3. 对于 intentional stable callbacks，使用 `_` 前缀或 eslint-disable

## Architecture Review

### Option A: 逐文件手动修复

- **Pros**: 精确控制每个修改
- **Cons**: 耗时，容易遗漏

### Option B: 先 auto-fix，再手动 review

- **Pros**: 高效，auto-fix 可处理 ~80% 的问题
- **Cons**: 需要验证 auto-fix 未破坏代码

**选择**: Option B

### Option C: 重写相关组件

- **Pros**: 可以优化架构
- **Cons**: 超出 scope，引入风险

## Verification

- [ ] `pnpm lint` passes with 0 errors
- [ ] All React Hook conditional call errors resolved
- [ ] No runtime behavior changes (verify with `pnpm test`)

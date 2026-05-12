## Context

代码库散落调试代码和未完成功能桩：
1. `workflowCatalogStore.ts`、`WorkflowRunPage.tsx`、`InputSection` 中有多处 `console.log` 输出用户文件信息
2. `App.tsx` 中版本历史/版本对比/回滚三个按钮点击后抛出错误，用户体验差

## Goals / Non-Goals

**Goals:**
- 清除所有调试日志
- 未实现功能不在 UI 中暴露

**Non-Goals:**
- 不改 console.warn / console.error
- 不实现版本历史功能
- 不做性能调优
- MAX_ATTEMPTS 可配置（已移至 C3）

## Decisions

### 1: console.log 清除范围

只删除 `console.log`，保留 `console.warn`（警告）和 `console.error`（错误）。涉及文件：
- `apps/user-app/src/modules/catalog/workflowCatalogStore.ts`
- `apps/user-app/src/pages/WorkflowRunPage.tsx`
- `apps/user-app/src/components/InputSection/index.tsx`
- `apps/dev-tool/src/` 全局搜索确认无残留

验收：整个 `apps/` 目录下无任何 `console.log` 输出。

### 2: 未完成功能处理

在 `App.tsx` 中：
- 版本历史按钮改为 `onClick={() => alert('此功能开发中')}`
- 版本对比按钮同样处理
- 回滚按钮同样处理

不再展示错误栈，而是给出友好提示。

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 误删有效的 console 输出 | 低 | 调试信息丢失 | 只删 `console.log`，保留 warn/error |
| alert 提示用户体验一般 | 低 | 用户看到浏览器 alert | alert 后续可换为 Toast 组件（本 change 不做） |

**回滚方案**: `git checkout` 对应文件

# Verification Report

> 本文档由 verify 阶段填写。

---

## 执行摘要

| 项目 | 值 |
|------|-----|
| Change 名称 | split-tiles-ui-edges |
| 父 change | codebase-large-file-split-tiles |
| 验证日期 | <!-- YYYY-MM-DD --> |
| 验证人 | <!-- name / agent --> |
| 状态 | PENDING / PASS / FAIL / PARTIAL |

---

## 0. 拆分 tile 状态

| Tile | 原文件 | 新文件 | 拆分完成 | 摘要追加 |
|------|--------|--------|---------|---------|
| DeleteConfirm | `WorkflowsView.tsx:36-65` | `components/workflows/DeleteConfirm.tsx` | ☐ | ☐ |
| dragImageState | `PrismNodeControls.tsx:172-187` | `components/nodes/PrismNodeControls/dragImageState.ts` | ☐ | ☐ |
| WorkflowHeader 内联 style | `WorkflowHeader.tsx:300-674` | `components/header/WorkflowHeaderStyles.css` | ☐ | ☐ |
| InfoPanel CSS | `Inspector.module.css:604-796` | `Inspector/InfoPanel.module.css` | ☐ | ☐ |
| dense-control-node Export text | `dense-control-node.css:961-977` | `styles/nodes/dense-control-node-export-text.css` | ☐ | ☐ |

---

## 1. 命令执行结果

### 1.1 TypeCheck

```bash
pnpm typecheck --filter=dev-tool
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 错误数 | <!-- N --> |
| 耗时 | <!-- Xs --> |

**结果**: PASS / FAIL

### 1.2 Lint

```bash
pnpm lint --filter=dev-tool
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 错误数 | <!-- N --> |
| 警告数 | <!-- N --> |

**结果**: PASS / FAIL

### 1.3 Test

```bash
pnpm test --filter=dev-tool
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 通过数 | <!-- N --> |
| 失败数 | <!-- N --> |

**结果**: PASS / FAIL

---

## 2. 验证矩阵

| 验收标准 | 状态 | 证据 |
|----------|------|------|
| 5 个新文件存在 | PASS/FAIL | `ls <path>` |
| 旧文件 import 路径不变 | PASS/FAIL | `git diff` |
| typecheck 通过 | PASS/FAIL | 退出码 0 |
| lint 通过 | PASS/FAIL | 退出码 0 |
| dev-tool 测试通过 | PASS/FAIL | 0 failed |
| `docs/refactor-map.md` 至少 5 个 tile 摘要 | PASS/FAIL | 文本搜索命中 ≥ 5 |
| `dense-control-node.css` 体积下降 | PASS/FAIL | `wc -l` 前后对比 |

---

## 3. 失败处理（如有）

### 3.1 单 tile 失败回滚策略

- 单个 tile 在 verify 阶段失败：
  1. 在本 verify.md 记录失败现象。
  2. 回滚该 tile 的 commit（`git revert`）。
  3. 不影响其它 tile 的执行。
  4. 修复后重新 apply 该 tile。

### 3.2 整体失败

- 子 change A 整体失败 → 父 change 仍 active；用户决定是否继续 B / C。

---

## 4. 签名

| 角色 | 姓名 | 日期 | 签名 |
|------|------|------|------|
| 执行人 | <!-- --> | <!-- --> | [ ] |
| Reviewer | <!-- --> | <!-- --> | [ ] |
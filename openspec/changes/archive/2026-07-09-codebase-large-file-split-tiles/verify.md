# Verification Report

> 本文档由 verify 阶段填写。propose 阶段提供空模板。

---

## 执行摘要

| 项目 | 值 |
|------|-----|
| Change 名称 | codebase-large-file-split-tiles |
| 验证日期 | <!-- YYYY-MM-DD --> |
| 验证人 | <!-- name / agent --> |
| 状态 | PENDING / PASS / FAIL / PARTIAL |

---

## 0. 子 change 状态

| 子 change | proposal | design | tasks | verify | archived |
|-----------|----------|--------|-------|--------|----------|
| split-tiles-ui-edges | ☐ | ☐ | ☐ | ☐ | ☐ |
| split-tiles-service-layer | ☐ | ☐ | ☐ | ☐ | ☐ |
| split-tiles-core-edges | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## 1. 命令执行结果

### 1.1 Lint

```bash
pnpm lint
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 错误数 | <!-- N --> |
| 警告数 | <!-- N --> |
| 耗时 | <!-- Xs --> |

**结果**: PASS / FAIL

### 1.2 TypeCheck

```bash
pnpm typecheck
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 失败的包 | <!-- list --> |
| 耗时 | <!-- Xs --> |

**结果**: PASS / FAIL

### 1.3 Test

```bash
pnpm test
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 通过数 | <!-- N --> |
| 失败数 | <!-- N --> |

**结果**: PASS / FAIL

### 1.4 Build

```bash
pnpm build
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 失败的包 | <!-- list --> |

**结果**: PASS / FAIL

---

## 2. 验证矩阵

| 验收标准 | 状态 | 证据 |
|----------|------|------|
| 3 个子 change 均 archive | PASS/FAIL | `openspec list --json` 为空 |
| `docs/refactor-map.md` 至少 3 个 tile 块摘要 | PASS/FAIL | 文本搜索 `## YYYY-MM-DD` ≥ 3 |
| typecheck 通过 | PASS/FAIL | 退出码 0 |
| lint 通过 | PASS/FAIL | 退出码 0 |
| 受影响包测试通过 | PASS/FAIL | 0 failed |
| 大文件行数有可观察下降 | PASS/FAIL | `wc -l` 前后对比 |
| 旧 store / adapter 公开方法不变 | PASS/FAIL | typecheck + 既有测试 |

---

## 3. 失败处理（如有）

### 3.1 子 change 失败回滚策略

- 子 change 在 verify 阶段失败：
  1. 在该子 change 的 verify.md 记录失败现象。
  2. 由用户在 apply 阶段决定回滚该子 change 或继续修复。
  3. 不影响其它子 change 的执行。
  4. 父 change 在所有子 change archive 后才 archive；任一子 change 未 archive，父 change 保持 active。

---

## 4. 签名

| 角色 | 姓名 | 日期 | 签名 |
|------|------|------|------|
| 执行人 | <!-- --> | <!-- --> | [ ] |
| Reviewer | <!-- --> | <!-- --> | [ ] |

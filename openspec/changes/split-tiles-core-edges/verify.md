# Verification Report

> 本文档由 verify 阶段填写。

---

## 执行摘要

| 项目 | 值 |
|------|-----|
| Change 名称 | split-tiles-core-edges |
| 父 change | codebase-large-file-split-tiles |
| 验证日期 | <!-- YYYY-MM-DD --> |
| 验证人 | <!-- name / agent --> |
| 状态 | PENDING / PASS / FAIL / PARTIAL |

---

## 0. 拆分 tile 状态

| Tile | 原文件 | 新文件 | 拆分完成 | 摘要追加 |
|------|--------|--------|---------|---------|
| workerPool sizing | `workerPool.ts:16-44` | `scheduler/workerPoolSizing.ts` | ☐ | ☐ |
| imageToImageData | `ComposerCanvas.tsx:23-31` | `utils/imageToImageData.ts` | ☐ | ☐ |

---

## 0.5 不变量检查

| 文件 | 本子 change 内是否被修改 | 验证方式 |
|------|--------------------------|----------|
| `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts` | MUST NOT | `git diff --stat HEAD~2..HEAD` |
| `packages/image-ops/src/worker/imageWorker.worker.ts` | MUST NOT | `git diff --stat HEAD~2..HEAD` |

---

## 1. 命令执行结果

### 1.1 TypeCheck

```bash
pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 错误数 | <!-- N --> |

**结果**: PASS / FAIL

### 1.2 Test

```bash
pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk
```

| 指标 | 值 |
|------|-----|
| 退出码 | <!-- 0 / 1 --> |
| 失败数 | <!-- N --> |

**结果**: PASS / FAIL

---

## 2. 验证矩阵

| 验收标准 | 状态 | 证据 |
|----------|------|------|
| 2 个新文件存在 | PASS/FAIL | `ls <path>` |
| typecheck 通过 | PASS/FAIL | 退出码 0 |
| image-ops 测试通过 | PASS/FAIL | 0 failed |
| composer-sdk 测试通过 | PASS/FAIL | 0 failed |
| useCanvasStore 未修改 | PASS/FAIL | `git diff` |
| imageWorker.worker 未修改 | PASS/FAIL | `git diff` |
| `docs/refactor-map.md` 至少 2 个 tile 摘要 | PASS/FAIL | 文本搜索 |

---

## 3. 签名

| 角色 | 姓名 | 日期 | 签名 |
|------|------|------|------|
| 执行人 | <!-- --> | <!-- --> | [ ] |
| Reviewer | <!-- --> | <!-- --> | [ ] |
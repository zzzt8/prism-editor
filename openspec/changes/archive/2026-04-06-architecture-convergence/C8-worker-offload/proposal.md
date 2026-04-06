# C8: Worker 化

> 派生自 meta-change: `architecture-convergence`

## Why

主线程图像处理会阻塞 UI。OpenSpec 已有 worker-scheduler 意识，image-ops 的 scheduler/index.ts 和 workerPool.ts 已存在，先统一执行入口，再让重的节点走 worker lane。

## What Changes

- executionService 支持 main-thread / worker 双 lane
- Transform / Composite / ApplyMask 节点迁移到 worker
- image-ops scheduler 与 executionService 对接

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| engine | `packages/image-ops/src/` | Worker executor 包装 |
| editor | `apps/dev-tool/src/modules/editor/services/executionService.ts` | 双 lane 支持 |

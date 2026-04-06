---
name: image-synthesis-performance/C1-dynamic-worker-pool
type: change
created: 2026-04-06
description: 根据 navigator.hardwareConcurrency 动态调整 Worker Pool 大小
status: active
parent: image-synthesis-performance
tags:
  - performance
  - image-ops
  - worker
layers:
  - engine
depends_on: []
priority: P0
---

# C1: 动态 Worker 池

> 派生自 meta-change: `image-synthesis-performance`

## Why

当前 WorkerPool 固定 2 个 Worker，现代 8 核设备利用率仅 25%，大量算力浪费。需要根据设备能力动态调整。

## What Changes

- 修改 `DEFAULT_CONFIG`，使用 `navigator.hardwareConcurrency` 计算 Worker 数量
- 添加 `maxSize` 限制防止过度分配
- 保持向后兼容

## Impact Summary

|| Layer | 文件 | 影响 |
|-------|------|------|
| engine | `packages/image-ops/src/scheduler/workerPool.ts` | Worker 数量根据设备动态调整 |

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)

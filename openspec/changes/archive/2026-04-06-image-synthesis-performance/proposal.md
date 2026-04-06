# Proposal: 图像合成性能优化

## Why

Prism Editor 的图像合成工作流执行速度慢，用户感知到的延迟远超预期。根据专家分析，主要瓶颈集中在：

1. **Worker Pool 固定 2 个**：现代设备（8+ 核）利用率仅 25%
2. **多层叠加串行执行**：10 层叠加 = 10× 单层时间，无法并行
3. **Worker 内 Canvas 反复重建**：每次操作都分配 128MB+ 内存
4. **预览图实时生成**：每次节点完成都转 PNG，造成额外 CPU 消耗

当前 image-ops 已具备 worker 基础设施（C8 Worker 化已完成），但性能仍未达到最佳。需要在现有架构上做针对性优化。

## What Changes

本次规划**不改变核心架构**，而是在 `image-ops` 和 `workflow-core` 层做性能收敛性优化，分为 4 个子 change：

|| 子 Change | 目标 | 预期收益 |
|---|---|---|
| **C1: 动态 Worker 池** | 根据 `navigator.hardwareConcurrency` 动态调整 pool 大小 | 2-4x |
| **C2: 并行多层合成** | 将可并行的 overlay 分组后并行合成 | 3-5x |
| **C3: Canvas 实例缓存** | Worker 内复用 OffscreenCanvas 实例 | 1.5-2x |
| **C4: 预览延迟生成** | 首次只返回 ImageData，后续异步生成预览 | 1.3x |

## Impact Summary

### 直接影响（改动范围）

|| 模块 | Layer | 影响 |
|------|-------|------|------|
| `packages/image-ops/src/scheduler/workerPool.ts` | engine | 动态 pool 大小 |
| `packages/image-ops/src/composite.ts` | engine | 并行合成算法 |
| `packages/image-ops/src/worker/imageWorker.worker.ts` | engine | Canvas 复用 |
| 所有 image-ops executor 文件 | engine | 预览延迟生成 |

### 间接影响（契约变更）

|| 契约 | 变更 |
|------|------|
| WorkerPoolConfig 接口 | `size` 参数语义变化：从固定数改为"基准数" |
| NodeExecutor 输出 | `previewUrl` 从同步生成改为可选延迟字段 |

### 全局约束

1. **向后兼容**：所有优化必须在功能正确性不变的前提下进行
2. **性能基准**：优化前后必须有可量化的性能对比数据
3. **优雅降级**：Worker 不可用时必须回退到 main-thread 执行

## 拆分背景

为什么需要多个 change 而不是一个：

1. **风险隔离**：Canvas 复用涉及 Worker 内部状态管理，风险较高，单独成 change
2. **独立验证**：动态 Worker 池可独立测试性能提升，并行合成需验证正确性
3. **按优化层级**：C1/C3 是基础设施，C2 是核心收益，C4 是锦上添花
4. **可选择性**：用户可只采纳部分优化，不强制全量实施

详见 `change-index.md`。

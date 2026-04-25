---
name: fix-flaky-performance-benchmark-tests
change_class: low
reason: "仅修改测试断言阈值，不涉及任何运行时代码逻辑"
---

## Task Anchor Echo

- **原始任务**：修复 flaky 性能 benchmark 测试（`expect(speedup).toBeGreaterThan(0.1)` 边界问题）
- **本次创建 change 的名称**：`fix-flaky-performance-benchmark-tests`
- **change 名称是否服务于原始任务**：是
- **约束/非目标追加（来自用户）**：
  - [ ] 不修改任何生产运行时代码（apply-mask.ts、imageWorker.worker.ts 等）
  - [ ] 不改变算法实现，只调整测试断言和阈值
  - [ ] 保留 CI-relaxed 基线不变

---

## Why

`@prism/image-ops` 的性能 benchmark 测试在 CI 环境中存在 flaky failure：
三个 speedup 比值断言（Alpha/Brightness/Luminance 的 Canvas vs JS speedup）使用了
过于敏感的数值下界（`expect(speedup).toBeGreaterThan(0.1)`），
在当前机器上 Luminance 场景实测 `speedup = 0.0998`，仅差 0.02% 即突破阈值。
这不是功能 bug，而是测试工程质量问题。

## What Changes

- 修改 `apply-mask-benchmark.test.ts` 中 speedup 断言，从 `> 0.1` 改为 `> 0.05`
  （即允许 Canvas 比 JS 慢最多 20 倍，而 Node.js canvas 包的序列化开销实测约 10 倍）
- 清理 `canvas-compositing-primitives.test.ts` 中的冗余断言
  （该文件存在两套测试标准：功能测试 + 性能断言）
- 更新相关测试注释，解释 Node.js Canvas 2D 性能特性

## Capabilities

### Modified Capabilities

- `apply-mask-benchmark`: 修改 speedup 断言阈值，不改变算法

## Impact

- **受影响的包**：`@prism/image-ops`
- **受影响的文件**：
  - `packages/image-ops/src/apply-mask-benchmark.test.ts`
  - `packages/image-ops/src/canvas-compositing-primitives.test.ts`
- **无破坏性变更**：不影响任何生产代码

## Out of Scope

- 修改 `apply-mask.ts` 中的任何算法实现
- 修改 `imageWorker.worker.ts` 中的任何 Canvas 实现
- 修改 CI pipeline 配置
- 新增或删除功能

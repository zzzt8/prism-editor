# Design: Backend Node Parity

## Goals

- 让前端 7 个节点（load-image, load-mask, apply-mask, composite, transform, export, empty-input）在后端都能执行
- 保持前端验证、后端执行的开发流程
- 大图处理内存友好（流式 API）

## Non-Goals

- 不做 AI/生成类节点
- 不改变现有 executor 接口契约
- 不重构 workflow-core 执行模型

---

## Decisions

### 1. 复用 sharp 作为后端图像处理基础

**现状**：`compositeExecutor` 已用 sharp 实现。

**决策**：所有新增后端执行器继续用 sharp，避免引入多依赖。

### 2. 输入方式：URL + FilePath + Buffer 三选一

**候选方案**：
- 方案 A：只支持 OSS URL（与现有 server 存储一致）
- 方案 B：只支持本地文件路径（开发友好）
- 方案 C：同时支持 URL/FilePath/Buffer

**决策**：采用方案 C。灵活度高，前端迁移成本低。

### 3. 执行器独立还是组合？

**候选方案**：
- 方案 A：每个节点类型独立 executor（当前模式）
- 方案 B：共享 sharp 实例，避免重复 decode/encode

**决策**：初期采用方案 A 简化实现。中期可优化为方案 B 减少内存拷贝。

---

## Architecture Review

### 方案 A：逐个实现（推荐）

**做法**：按依赖顺序实现 5 个 executor。

```
执行顺序（按依赖）：
1. empty-input → 输出 blank canvas
2. load-image  → 从 URL/Path/Buffer 加载
3. load-mask   → 复用 load-image，类型标记为 mask
4. apply-mask  → 基于 2/3 的输出
5. transform   → 合并现有 crop + 新增 translate/scale/rotate
6. composite   → 已有 ✅
7. export      → 已有 ✅
```

**优点**：
- 实现简单，每个 executor 独立测试
- 可增量部署，出问题容易回滚
- 与前端 executor 结构一一对应

**缺点**：
- 每个节点多一次 decode/encode
- 内存效率不如流式 pipeline

### 方案 B：流式 Pipeline

**做法**：sharp pipeline 串联，减少中间解码。

**优点**：内存效率高。

**缺点**：实现复杂度高，需要改 executor 接口。

**结论**：不采用。保持简单，先跑起来再优化。

---

## Target File Structure

```
packages/image-ops/src/nodejs/
├── index.ts                    # 导出所有 executor
├── composite-executor.ts      # ✅ 已有
├── crop-executor.ts           # 合并到 transform
├── export-executor.ts         # ✅ 已有
├── sharp-utils.ts             # ✅ 已有，共享工具
├── load-image-executor.ts     # 🆕
├── load-mask-executor.ts      # 🆕
├── apply-mask-executor.ts     # 🆕
├── transform-executor.ts      # 🆕（合并 crop）
└── empty-input-executor.ts    # 🆕
```

---

## Review Checklist

- [ ] executor 输入输出类型与前端一致
- [ ] sharp 处理大图时有内存保护（streams）
- [ ] 错误信息清晰，便于调试
- [ ] 可独立测试每个 executor

# Proposal: M0 - 双端执行器几何一致性验证

> **change_class**: low
> **reason**: M0 是纯测试验证阶段，不修改源码、协议或架构；仅添加一个确定性测试 fixture 验证现有双端 executor 的几何一致性。

---

## Why

Browser Runtime 和 Node Runtime 目前各自实现 transform executor，但缺乏自动化验证证明两者几何输出一致。根据 Prism 架构护栏 §1.5："浏览器预览和 Node 生产必须共享同一套 `DesignState` 与参数语义"，在 M0 阶段我们先用确定性 fixture 验证现有实现的输出关系，为 M1 正式统一协议提供数据基础。

---

## What Changes

1. 新增 `packages/image-ops/src/dual-executor-consistency.test.ts`：双端 transform executor 一致性测试
2. 扩展 `packages/image-ops/src/test-helpers.ts`：新增彩色 ImageData 工厂函数
3. 5 个测试场景：identity / scale-2x / rotate-90 / scale+rotate / translate+scale

---

## Capabilities

- **确定性 fixture**：纯色 20×20 底图 + 8×8 用户图，无外部文件依赖，无随机数
- **尺寸一致性验证**：断言 browser 与 node 输出 width/height 相等
- **像素几何 diff 验证**：容忍 ±2 RGB 通道差异，允许 0.5% 像素差异
- **确定性验证**：同一输入多次执行结果 100% 一致
- **语义差异记录**：显式注释两端在 translate/rotation anchor 上的已知差异

---

## Impact

| 范围 | 影响 |
|------|------|
| 新增文件 | `dual-executor-consistency.test.ts`（测试文件） |
| 扩展文件 | `test-helpers.ts`（测试工具） |
| 触及层 | Layer 3（Runtime）— 仅观察，不修改 executor 实现 |
| 数据库 | 无 |
| 公开 API | 无 |
| Mall 接入 | 无 |

---

## Out of Scope

以下属于 M1 及之后，**不得**在 M0 实施：

- 正式 `DesignState` / `RenderRequest` / `RenderResult` 类型定义
- JSON schema 或运行时校验
- 修改 `packages/shared-types/`
- 修改 `packages/workflow-core/`
- 修改 `server/src/`
- 数据库 schema 或 Prisma migration
- Mall 接入代码
- ZIP、PDF、CMYK 导出
- 多 Flow 支持
- 历史代码清理

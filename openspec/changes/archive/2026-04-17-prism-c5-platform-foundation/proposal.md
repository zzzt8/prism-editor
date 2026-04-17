## Why

Prism Editor 当前缺少三个平台基础能力：

1. **执行日志**：`ExecutionLog` 类型完全缺失，P1-6 要求的"工作流执行记录/错误日志/节点耗时统计"无法实现
2. **权限模型**：auth 类型散落在 server 局部，shared-types 中没有 `AuthRole` 等类型，P1-5 要求的"作者/可运行/管理者"三层权限无法扩展
3. **运行协议抽象**：架构约束 6.1 要求"发布协议统一"，但 user-app 与发布物的交互方式还未从协议层面抽象

这些能力是第一阶段"稳定运行"和第二阶段"对外扩展"的基础，但不紧急，属于"预埋"而非"交付"。

---

## What Changes

- 定义 `ExecutionLog` 类型（执行记录/错误日志/节点耗时统计）
- 定义 `AuthRole` / `AuthPermission` 权限模型类型
- 定义 `RuntimeProtocol` 运行协议抽象（统一页面/API/嵌入模块三种消费方式）
- executionSlice 扩展：记录执行日志

---

## Capabilities

### New Capabilities

- `execution-log`: 执行日志模型，记录每次运行的输入/输出/耗时/错误
- `auth-model`: 最小三层权限模型
- `runtime-protocol`: 运行协议抽象

---

## Impact

- **受影响文件**: `packages/shared-types/`、`apps/user-app/`、`apps/dev-tool/`
- **依赖方**: 均为预埋，供未来 change 使用
- **向后兼容**: 完全向后兼容，仅新增类型

---

## Out of Scope

- 复杂权限 UI（→ P2）
- 服务端权限校验（→ server 未来扩展）
- 运行协议的具体 API 实现

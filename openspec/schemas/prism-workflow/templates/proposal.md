---
name: <change-name>
change_class: <low | medium | high>  # 风险等级，影响 verify 强度和归档条件
change_profile: <low | medium | high>  # 流程重量，记录推断依据（schema v2 固定 5 个 artifacts）
reason: "<一句话推断依据>"
---

## Task Anchor Echo

- **原始任务**: [从上下文回显原始任务描述]
- **change 名称**: `<name>`
- **change 名称是否服务于原始任务**: 是 / 否
  - 若否 → **硬关卡**：不得调用 CLI，输出"change 名称与原始任务不一致，请确认后再试"
- **约束/非目标追加（来自用户）**:
  - [ ] [约束内容 1]
  - [ ] [约束内容 2]
  - → 这些约束**必须**写入 proposal 的 Out of Scope 段

## Why

<!-- 变更动机。解决了什么问题？为什么是现在？ -->

## What Changes

<!-- 具体变更内容。新增/修改/删除的能力。破坏性变更用 **BREAKING** 标注。-->

## Capabilities

### New Capabilities
<!-- 新增能力。格式：`<name>`: <描述>。每个创建 specs/<name>/spec.md -->

### Modified Capabilities
<!-- 需求变更的已有能力。仅当 spec 层面行为变化时列出。查询 openspec/specs/ 中现有 spec。-->

## Impact

<!-- 受影响的代码、API、依赖、系统。-->

## Out of Scope

<!-- 明确排除的范围（来自用户约束）。-->

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

<!-- 按实际涉及的维度勾选并填写 -->

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 是 / 否 | 单元测试 |
| 节点级错误隔离 | 是 / 否 | 错误场景测试 |
| Cancellation 完整性 | 是 / 否 | 取消操作测试 |
| Canvas 状态一致性 | 是 / 否 | 状态机测试 |
| Node Registry 不变量 | 是 / 否 | 注册冲突测试 |
| API 契约稳定性 | 是 / 否 | 向后兼容测试 |
| Node Package 安全 | 是 / 否 | 白名单 + manifest 验证测试 |
| 交互完整性 | 是 / 否 | 手工验收 |

### 验收要求

- [ ] 本需求已覆盖所有涉及的质量检查维度
- [ ] 新增 executor 路径已包含 try/catch 包裹
- [ ] 涉及取消/状态机的逻辑已规划测试方案

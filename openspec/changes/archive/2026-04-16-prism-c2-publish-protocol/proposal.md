## Why

当前 `PublishedConfig.exposedParams` 仅是 `PublishedParamConfig[]` 的简单列表（nodeId + paramId + label），这是 C2 立项时发现的核心阻塞点。

架构师审阅意见明确指出：**exposedParams 不应仅是节点参数的简单勾选暴露，应抽象为独立的发布态参数模型**，支持来源映射、显示名、控件类型、默认值、校验、可见性与锁定。

现状导致：user-app 端无法按参数类型渲染控件（select / number / string），无法校验输入，无法控制可见性/锁定态。发布态参数实际上是一个半成品，无法真正交付给非开发者使用。

**为什么是现在**：C1（Template）完成后，模板有了独立身份。接下来模板的"发布"路径必然经过发布态协议。如果参数模型不升级，模板发布出去也是残缺的，无法支撑"让非开发者也能跑链路"的核心目标。

---

## What Changes

- 定义 `PublishedParamDefinition` 独立参数模型（替代现有的 `PublishedParamConfig`）
- 扩展 `PublishedWorkflow` 的 inputs/outputs 为更完整的 schema
- `workflowToPublished` mapper 增强：自动推断参数控件类型和默认值
- 发布对话框增强：参数可见性/锁定 UI
- user-app 端按 `PublishedParamDefinition` 渲染参数控件

---

## Capabilities

### New Capabilities

- `publish-param-model`: 独立的发布态参数模型，支持控件类型/校验规则/可见性/锁定
- `param-type-inference`: 从节点定义自动推断参数控件类型
- `param-visibility-control`: 参数可见性（visible / hidden / locked）的编辑器配置 UI
- `runtime-param-renderer`: user-app 按 PublishedParamDefinition 渲染控件

### Modified Capabilities

- `publish-protocol`: 现有的发布协议需升级以支持新的参数模型（向后兼容）

---

## Impact

- **受影响文件**: `packages/shared-types/src/published.ts`（扩展）、`apps/dev-tool/` 多个文件、`apps/user-app/` 多个文件
- **依赖方**: C5（平台基础能力依赖发布态协议）
- **向后兼容**: PublishedConfig 的 inputs/outputs 字段结构扩展，旧数据通过默认值兼容

---

## Out of Scope

- 复杂校验规则 DSL（C2 仅支持布尔/范围/正则三种简单校验）
- 条件可见性（参数 A 的值决定参数 B 的可见性）
- 动态选项（select 选项依赖 API 调用）

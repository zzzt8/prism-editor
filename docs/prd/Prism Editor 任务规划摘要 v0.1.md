# Prism Editor 任务规划摘要 v0.1

> 规划依据：Prism Editor 架构审阅报告 v0.1（含架构师审阅意见）
> 生成时间：2026-04-16

---

## 背景

Prism Editor 第一阶段（内部生产工具化）包含 P0/P1 共 14 个任务。当前代码骨架完整、核心功能可用，但存在以下关键缺口：

1. **Template 类型缺失** — 阻塞 P0-7（模板复用）
2. **发布态参数模型为空** — exposedParams 为空数组，用户端无可配置参数
3. **编辑器体验粗糙** — 预览是弹窗、发布 UI 不完整
4. **user-app 执行路径未验证** — 发布后结果一致性风险

架构师审阅意见补充：

- exposedParams 不应仅是节点参数的简单勾选暴露，应抽象为**独立的发布态参数模型**，支持来源映射、显示名、控件类型、默认值、校验、可见性与锁定
- C1（资产模型）和 C2（发布态协议）需提升到**资产模型**和**发布态协议**层级，而不仅是功能补齐

---

## Change 拆分方案

### C1 - 资产模型收口（Template + 三态契约完整化）

**目标**：定义完整的资产模型，使 Template 与 EditorDraft / PublishedConfig 三态并行，解除"模板复用"的根本阻塞。

**核心交付物**：

- `Template` 类型定义（含 id / name / version / description / tags / author / createdAt / updatedAt / workflow 引用）
- `TemplateRepository`（独立于 WorkflowRepository，支持模板保存/加载/列表/删除）
- 模板管理 UI（列表、创建、保存为模板、从模板创建）

**Layer**：`domain`

**依赖**：`none`（第一个 change）

**涉及文件**：

- `packages/shared-types/src/template.ts`（新增）
- `apps/dev-tool/src/modules/repositories/templateRepository.ts`（新增）
- `apps/dev-tool/src/components/TemplateManager/`（新增 UI）
- `apps/dev-tool/src/components/header/SaveDialog.tsx`（扩展）

**change_class**：high

**reason**：Template 是所有后续"模板复用"能力的基础，也是第一阶段"减少重复造轮子"核心目标的数据保障。

---

### C2 - 发布态协议与参数模型

**目标**：将发布态从"功能能力"升级为"协议层"，构建完整的发布态参数抽象。

**核心交付物**：

- **发布态参数模型**（`PublishedParamDefinition`）：
  - 来源映射（sourceNodeId + sourceParamId）
  - 显示名（user-facing label）
  - 控件类型（select / number / string / boolean / image-file）
  - 默认值与校验规则
  - 可见性（visible / hidden / locked）
- 发布对话框增强（参数可见性配置 UI）
- `workflowToPublished` 增强（支持构建完整参数模型）
- user-app 端参数渲染（按 PublishedParamDefinition 生成控件）

**Layer**：`domain` + `editor` + `runtime`

**依赖**：`C1`（需要 Template 类型作为发布源）

**涉及文件**：

- `packages/shared-types/src/published.ts`（扩展 PublishedParamDefinition）
- `packages/shared-types/src/published-param-model.ts`（新增参数模型类型）
- `apps/dev-tool/src/components/header/PublishDialog.tsx`（重构参数配置 UI）
- `apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts`（扩展）
- `apps/dev-tool/src/modules/editor/stores/publishSlice.ts`（新增）
- `apps/user-app/src/components/ParamsSection/`（重构，接入参数模型）

**change_class**：high

**reason**：发布态参数模型是"让非开发者也能跑链路"的核心能力，exposedParams 机制为空直接导致用户端无可配置参数。同时架构师明确要求提升到协议层级，而非简单 UI 补全。

---

### C3 - 编辑器体验补强

**目标**：将编辑器从"功能可用"提升到"体验合格"，补齐 P0-4 和 P0-6 的体验缺口。

**核心交付物**：

- **内嵌预览面板**（替代 NodePreviewModal 弹窗，随节点执行实时更新）
- **节点执行耗时统计**（ExecutionContext 已预留 timing 字段，需接入 UI）
- 节点搜索/分组增强
- 快捷键优化
- Canvas 性能优化（大量节点时的渲染优化）

**Layer**：`editor`

**依赖**：`C1`（部分，模板 UI 需同时开发）

**涉及文件**：

- `apps/dev-tool/src/components/canvas/`（预览面板内嵌）
- `apps/dev-tool/src/components/Inspector/PreviewPanel.tsx`（新增）
- `apps/dev-tool/src/modules/editor/stores/executionSlice.ts`（扩展耗时统计）

**change_class**：medium

**reason**：不影响核心业务闭环，但影响用户日常使用效率。第一阶段成功标准之一是"链路配置时间缩短 50%"，编辑器体验是直接瓶颈。

---

### C4 - 版本管理与资产沉淀

**目标**：使工作流和模板具备版本生命周期管理能力，支撑团队协作。

**核心交付物**：

- 工作流版本历史（每次发布自动生成版本，支持回滚）
- 模板中心（按场景/标签分类，支持搜索）
- 草稿版本 vs 发布版本分离
- 版本 Diff 可视化

**Layer**：`platform`

**依赖**：`C1`（TemplateRepository 完成后才能做模板版本）

**涉及文件**：

- `packages/shared-types/src/workflow-version.ts`（新增）
- `apps/dev-tool/src/modules/repositories/versionRepository.ts`（新增）
- `apps/dev-tool/src/components/VersionHistory/`（扩展 Diff 功能）
- `apps/dev-tool/src/components/TemplateCenter/`（新增模板中心 UI）
- `server/`（若后端实现版本存储）

**change_class**：medium

**reason**：第一阶段目标用户包含"内部设计师"，模板中心是团队复用的关键入口。版本管理是长期资产沉淀的基础设施。

---

### C5 - 平台基础能力

**目标**：为第二阶段的扩展预留架构基础，同时补齐第一阶段运行端必需的日志和协议抽象。

**核心交付物**：

- 运行协议抽象（统一页面/API/嵌入模块三种消费方式）
- 基础权限模型（作者 / 可运行 / 管理者三层）
- 执行日志（工作流执行记录 / 错误日志 / 节点耗时统计）
- API 接口协议设计

**Layer**：`platform` + `runtime`

**依赖**：`C2`（运行协议基于发布态协议）

**涉及文件**：

- `packages/shared-types/src/auth.ts`（权限模型）
- `packages/shared-types/src/execution-log.ts`（执行日志类型）
- `apps/user-app/src/`（API 接入层）
- `server/`（持久化与 API）

**change_class**：low

**reason**：部分属于 P2 预埋，执行日志是 P1-6 的明确要求，可提前实现。

---

## 依赖关系图

```
C1 (资产模型)
  │
  ├──► C2 (发布态协议 + 参数模型)  ← 并行
  │         │
  │         └──► C5 (平台基础)    ← 顺序
  │
  ├──► C3 (编辑器体验)            ← 并行
  │
  └──► C4 (版本管理)              ← 顺序
```

---

## 执行建议

**第一轮**（可并行）：

- C1 模板态与资产模型
- C3 编辑器体验补强（部分不依赖 C1 的部分）

**第二轮**（依赖 C1）：

- C2 发布态协议（核心优先级，仅次于 C1）
- C4 版本管理（C1 完成后立即启动）

**第三轮**（依赖 C2）：

- C5 平台基础能力

---

## 开放决策项（需在 C1 启动前确认）

1. **Template 存储策略**：共用 WorkflowRepository 还是独立 TemplateRepository？
2. **发布态参数模型的控件类型**：初期覆盖哪些类型（select/number/string/boolean）？
3. **版本回滚的语义**：回滚是恢复编辑态草稿，还是重新发布旧版本配置？

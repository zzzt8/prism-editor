# Prism Editor PRD 架构审阅报告 v0.1

> 生成时间：2026-04-16
> 审阅人：架构师
> 状态：待审阅

---

## 一、审阅范围

本报告基于以下三份 PRD 文档审阅：

- Prism Editor PRD v0.1（产品目标、定位、路线图）
- Prism Editor 任务拆解 v0.1（P0/P1/P2 优先级）
- Prism Editor 技术架构约束清单 v0.1（架构原则与硬约束）

审阅方式：完整扫描代码库源码，对照 PRD 要求逐项核查。

---

## 二、总体判断

**项目当前处于"骨架完整、核心功能可用、关键机制缺失"的阶段。**

架构设计质量高于平均水平——分层清晰、执行引擎扎实、数据契约设计合理。但部分核心能力缺失（P0-7 模板机制），导致"可复用"这一核心目标无法闭环。

从工程进度看，P0 的 8 个任务中：
- **已完成**：约 3 个（P0-1 部分、P0-3、P0-6 基础）
- **部分完成**：约 3 个（P0-2、P0-4、P0-5）
- **未完成**：约 2 个（P0-7 模板、P0-8 验收指标）

---

## 三、代码架构评估

### 3.1 分层架构 ✅ 健康

```
packages/
  shared-types/    ← 核心契约（EditorDraft / PublishedConfig / NodeDefinition / PortDataType）
  workflow-core/   ← 执行引擎（拓扑排序 / 类型验证 / AbortSignal / 缓存）
  node-definitions/← 节点定义协议（7个系统节点 + 注册表）
  core/            ← 全局注册中心（融合定义 + 执行器）
  image-ops/       ← 算法实现层（Canvas 原语 / Worker Pool / 任务调度）
  shared-ui/       ← 基础 UI 组件
apps/
  dev-tool/        ← 作者端（Zustand store 分片化，组件完备）
  user-app/        ← 运行端（骨架已建，执行逻辑未完全接入）
server/
  package.json     ← 存在，平台能力待探索
```

**优点**：
- domain 层（shared-types / workflow-core / node-definitions）与 UI 层（dev-tool / user-app）边界清晰
- image-ops 作为纯算法层，不依赖任何 UI 框架，符合"节点是协议"原则
- dev-tool 的 store 已按 graphSlice / selectionSlice / inspectorSlice / draftSlice / executionSlice 分片
- mapper 层职责单一：`canvasToWorkflow` / `workflowToCanvas` / `workflowToPublished` 各司其职

**风险**：
- `core/` 依赖了 `image-ops`（从架构图看，core 是注册中心，但它依赖了 image-ops 层的执行器），存在"中心层依赖实现层"的耦合风险

### 3.2 核心数据契约（三态模型）

| 状态 | 类型 | 文件 | 状态 |
|------|------|------|------|
| 编辑态 | `EditorDraft` | `shared-types/src/editor-draft.ts` | ✅ 已定义 |
| 发布态 | `PublishedConfig` / `PublishedWorkflow` | `shared-types/src/published.ts` | ✅ 已定义 |
| 模板态 | `Template` | **不存在** | ❌ 缺失 |

**问题**：`Template` 类型完全缺失。这是 P0-7 的核心依赖，也是"模板复用"这一第一阶段核心目标无法闭环的直接原因。

当前只有两态，模板被当作普通工作流存储在 `workflowRepository` 中，无法区分"模板"和"工作流实例"。Template 应该有自己的存储路径和生命周期。

### 3.3 节点系统 ✅ 规范清晰

- 节点四层协议（NodeDefinition / Executor / InspectorSchema / Renderer）已明确区分
- Port 命名规范（Layer 1: ID / Layer 2: Name / Layer 3: Handle ID / Layer 4: Param ID）在 `definitions.ts` 中已文档化
- 7 个系统节点均有对应 Executor，无节点与执行逻辑耦合

**缺口**：
- `Preview` 节点不存在（Composite 节点带 Preview 逻辑，但无独立 Preview 节点）
- `Input/Output Adapter` 节点未抽象（当前通过 detectSourceNodes / detectOutputNodes 动态检测）

### 3.4 执行引擎 ✅ 设计扎实

`workflow-core/src/executor.ts` 和 `published-executor.ts` 已实现：
- 拓扑排序 + 循环检测
- 类型验证 + 自动转换（TypeValidator）
- AbortSignal 支持取消
- 执行缓存（cache.ts）
- 节点级错误捕获（每个节点独立 try/catch，错误不蔓延）
- Progress 回调（可实时更新 UI 状态）

**架构约束 §4.3** 要求每次运行有 `ExecutionContext`，包含 runId / workflowVersion / input payload / node results / timing / error info / cache scope。当前 context.ts 已实现大部分字段。

### 3.5 发布与运行协议 ✅ 基础就绪

- `workflowToPublished` 自动检测 source/output 节点
- `PublishedWorkflowExecutor` 可从 PublishedWorkflow 重建完整 Workflow 执行
- `PublishRepository` 基于 IndexedDB 存储

**缺口**：
- `exposedParams` 机制为空（`exposedParams: []`），用户在 user-app 无法配置任何参数
- 发布时无参数可见性控制 UI，无法将内部参数从用户侧隐藏
- user-app 执行路径未完全验证（dev-tool 和 user-app 是否共用 PublishedWorkflowExecutor 待确认）

### 3.6 编辑器体验 ⚠️ 功能完备，细节粗糙

dev-tool 已实现：
- WorkflowCanvas（React Flow）、节点拖拽、连线、选择、复制粘贴
- ParametersPanel（参数配置）、NodePreviewModal（预览）、VersionHistory（版本列表）
- autosaveService（自动保存）、PublishDialog（发布对话框）
- ContextMenu（右键菜单）、NodeSearchModal（节点搜索）

**问题**：
- 预览是弹窗 Modal（`NodePreviewModal`），PRD 要求的是内嵌实时预览面板
- 发布对话框 UI 粗糙，无法精细控制 exposedParams
- 模板无独立 UI（无法"从模板创建新工作流"）
- 无节点耗时统计（架构约束 §12.2 要求预埋）

---

## 四、逐项 P0 核查

| P0 任务 | 优先级 | 状态 | 说明 |
|---------|--------|------|------|
| P0-1 冻结核心数据契约 | P0 | ⚠️ 部分 | EditorDraft/PublishedConfig 已定义，Template 缺失 |
| P0-2 跑通 1 条核心业务链路 | P0 | ⚠️ 条件具备 | 执行引擎就绪，但未做真实链路端到端验证 |
| P0-3 最小系统节点集 | P0 | ✅ 基本完成 | 7个节点均有定义+执行器，缺 Preview 节点 |
| P0-4 编辑器最小闭环 | P0 | ⚠️ 大部分 | 预览/模板/I-O映射 UI 粗糙 |
| P0-5 I/O 映射规范化 | P0 | ⚠️ 半自动 | exposedParams 机制为空 |
| P0-6 最小调试能力 | P0 | ✅ 基础 | 节点级错误/快照/高亮已有，缺耗时统计 |
| P0-7 模板机制落地 | P0 | ❌ 未实现 | 完全缺失 Template 类型 |
| P0-8 验收指标定义 | P0 | ⚠️ 需量化 | PRD 有量化指标，代码无对应验证机制 |

---

## 五、主要风险

### 🔴 风险 1：Template 缺失阻塞可复用目标

**影响**：第一阶段"减少重复造轮子"的核心价值无法体现。
**建议**：将 P0-7 提升为第一优先级 change。

### 🔴 风险 2：exposedParams 为空导致 user-app 无参数可配

**影响**：发布后的工作流在 user-app 中用户无法调整任何参数，体验与 PRD "让非开发者也能跑链路"目标不符。
**建议**：在发布对话框中增加参数可见性配置 UI，与 P0-5 合并为一个 change。

### 🟡 风险 3：user-app 执行路径未验证

**影响**：dev-tool 和 user-app 可能走不同的执行路径，导致发布后结果与编辑器内不一致。
**建议**：明确 user-app 必须复用 `PublishedWorkflowExecutor`，制定集成测试计划。

### 🟡 风险 4：core 层依赖 image-ops

**影响**：注册中心（core）依赖算法层（image-ops），未来如果想将 image-ops 独立部署（如服务端执行），会形成循环依赖。
**建议**：评估是否需要将 globalRegistry 中的执行器注入从编译时依赖改为运行时注入。

### 🟢 优势：架构债务低，扩展路径清晰

- 新增节点只需改 node-definitions 和 image-ops，不碰画布核心 ✅
- Port 四层命名规范已建立，减少未来命名混乱 ✅
- 执行引擎支持 AbortSignal 和缓存，扩展性预留 ✅

---

## 六、Change 拆分建议

| Change | 名称 | 核心任务 | 依赖关系 | 建议优先级 |
|--------|------|---------|---------|-----------|
| C1 | 模板态与核心契约收口 | Template 类型定义 + 模板仓库 + 模板 UI | 无 | **P0-1** |
| C2 | 发布协议与 exposedParams | 发布对话框完善 + 参数可见性配置 + user-app 执行验证 | C1 | P0-5 |
| C3 | 编辑器体验补强 | 内嵌预览面板 + 调试增强 + 节点耗时统计 | C1 部分 | P0-4/P0-6 |
| C4 | 版本管理与资产沉淀 | 工作流版本历史 + 模板中心 | C1 | P1-1/P1-4 |
| C5 | 平台基础能力 | 运行协议抽象 + 基础权限 + 执行日志 | C2 | P1-2/P1-5 |

**建议启动顺序**：C1 → C2/C3（可并行）→ C4 → C5

---

## 七、开放问题（需要产品/架构决策）

1. **Template 与 Workflow 是否共享存储？**
   - 选项 A：共用同一 Repository，通过 `type` 字段区分（简单但语义不清）
   - 选项 B：独立 `TemplateRepository`（清晰但增加迁移成本）
   - **建议**：选项 B，模板和实例的语义差异足够大，值得独立

2. **exposedParams 的配置粒度？**
   - 是否需要参数级别的可见性（visible/hidden/locked）？
   - 还是只需全局"发布时暴露所有参数"？
   - **建议**：参数级别可见性，与 PRD 约束 §2.3 一致

3. **Preview 节点是否需要独立节点？**
   - 当前 Composite 节点可预览，但无独立 Preview 节点
   - 独立节点增加灵活性，但增加用户认知负担
   - **建议**：先保持现状，等用户有明确需求再拆分

4. **core → image-ops 依赖是否需要重构？**
   - 当前 globalRegistry 初始化时注册所有 nodeExecutors
   - 如果未来 image-ops 可独立部署，需要改为运行时注入
   - **建议**：暂时保持，标记为 TBD，等第二阶段再评估

---

## 八、结论

Prism Editor 的架构设计处于较高水准——分层合理、契约清晰、执行引擎扎实。最大的问题不是架构设计，而是**部分核心能力尚未实现**（模板机制）和**部分机制存在但不可用**（exposedParams）。

建议优先推进 Change 1（模板态收口），解除核心阻塞后，其他 P0 任务可快速收尾。

---

*审阅意见：*
审阅意见：
本报告总体判断成立，能够准确识别 Prism Editor 当前的主要矛盾：项目底层执行能力与分层设计基本成立，但模板态缺失、发布态参数暴露机制不可用，导致第一阶段“可复用”和“可发布”的产品目标尚未真正闭环。

架构上同意将 C1 作为当前最高优先级，但 C1 的范围应进一步扩大，不仅包括 Template 类型、仓库与 UI，还应明确模板实例化规则、模板与工作流实例的血缘关系，以及模板独立生命周期。

同意将 C2 作为紧随其后的关键 change，但 exposedParams 不应仅被实现为节点参数的简单勾选暴露，而应抽象为独立的发布态参数模型，支持来源映射、显示名、控件类型、默认值、校验、可见性与锁定等能力。

同意 user-app 必须复用统一的 PublishedWorkflowExecutor 语义，并补充发布态端到端集成测试。

Preview 节点不是当前优先项，建议保持现状；core 对 image-ops 的依赖确属中期风险，但当前可暂列 TBD，于第二阶段统一处理。

结论：本报告可作为下一轮架构与任务排期依据，建议按 C1 → C2/C3 → C4 → C5 推进，但需将 C1 与 C2 的定义补充到“资产模型”和“发布态协议”层级，而不仅是功能补齐。

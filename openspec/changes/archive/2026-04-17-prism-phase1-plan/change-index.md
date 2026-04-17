# Change Index

> 本 index 由 meta-change `prism-phase1-plan` 全局分析生成。
> 规划依据：docs/prd/Prism Editor 任务规划摘要 v0.1.md（含架构师审阅意见）

---

## C1 - asset-model（资产模型收口）

- **goal**: 定义完整的 Template 类型与 TemplateRepository，实现 EditorDraft / PublishedConfig / Template 三态并行
- **layer**: engine
- **depends_on**: none
- **reason**: Template 是所有后续"模板复用"能力的基础，也是第一阶段"减少重复造轮子"核心目标的数据保障。架构师明确要求提升到资产模型层级。

---

## C2 - publish-protocol（发布态协议与参数模型）

- **goal**: 将发布态从功能能力升级为协议层，构建独立的 PublishedParamDefinition 参数模型（来源映射/显示名/控件类型/默认值/校验/可见性）
- **layer**: engine + editor
- **depends_on**: C1
- **reason**: 发布态参数模型是"让非开发者也能跑链路"的核心能力，exposedParams 为空直接导致用户端无可配置参数。架构师明确要求提升到协议层级，而非简单 UI 补全。

---

## C3 - editor-experience（编辑器体验补强）

- **goal**: 将编辑器从功能可用提升到体验合格：内嵌实时预览面板、节点耗时统计、快捷键优化
- **layer**: editor
- **depends_on**: C1（部分，模板 UI 需同步）
- **reason**: 不影响核心业务闭环，但影响用户日常使用效率。第一阶段成功标准之一是"链路配置时间缩短 50%"，编辑器体验是直接瓶颈。

---

## C4 - version-management（版本管理与资产沉淀）

- **goal**: 使工作流和模板具备版本生命周期管理能力：版本历史、模板中心、版本 Diff 可视化
- **layer**: backend + editor
- **depends_on**: C1
- **reason**: 第一阶段目标用户包含"内部设计师"，模板中心是团队复用的关键入口。版本管理是长期资产沉淀的基础设施。

---

## C5 - platform-foundation（平台基础能力）

- **goal**: 预留第二阶段架构基础，补齐第一阶段必需的运行协议抽象、基础权限、执行日志
- **layer**: backend + runtime
- **depends_on**: C2
- **reason**: 运行协议基于发布态协议；执行日志是 P1-6 明确要求，可提前实现。

---

## 依赖关系图

```
C1 (资产模型)
  │
  ├──► C2 (发布态协议)    ← 并行
  │
  ├──► C3 (编辑器体验)    ← 并行
  │
  └──► C4 (版本管理)      ← 顺序
           │
           └──► C5 (平台基础)  ← 依赖 C2
```

---

## 执行顺序建议

| 轮次 | Changes | 说明 |
|------|---------|------|
| 第一轮 | C1, C3（部分） | 可并行，C1 解除核心阻塞 |
| 第二轮 | C2, C4 | 依赖 C1，C2 优先级仅次 C1 |
| 第三轮 | C5 | 依赖 C2 |

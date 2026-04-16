## change_class

`high`

**reason**：触及 `shared-types` 新增顶级类型（Template 及其子类型），新增 `IndexedDB` schema（独立 `templates` object store），属于跨包接口/数据契约变更，影响 engine 层和 editor 层。

---

## Why

Template 是 Prism Editor 模板复用的核心数据载体，但目前 shared-types 中完全没有 `Template` 类型定义，只在文档（P0-1、P0-7）里描述过。导致：

1. 模板保存/加载依赖临时 JSON，无类型安全
2. "另存为模板"和"从模板创建"两条关键路径无法闭环
3. 三态模型（EditorDraft / Template / PublishedConfig）实际上只有两态，模板态是空洞的

**为什么是现在**：第一阶段核心链路（P0-2）已可跑通，接下来必然要做模板复用（P0-7）来减少重复劳动。如果不先把 Template 类型固化，后续 C2（发布态参数模型）乃至 C4（版本管理）都会在错误的数据契约上长功能，积重难返。

---

## What Changes

- 新增 `Template` 类型定义（`packages/shared-types/src/template.ts`）
- 新增 `ITemplateRepository` 接口与 `TemplateRepository` 实现
- 新增模板管理 UI：列表页、详情页、创建/保存/删除操作
- 扩展 SaveDialog 支持"另存为模板"选项
- 扩展 EditorCanvas 支持"从模板创建新工作流"

---

## Capabilities

### New Capabilities

- `template-type`: 定义 Template 数据契约，包括基本信息、节点快照、输入输出 schema、元数据
- `template-repository`: 模板的持久化层，支持列表/获取/保存/删除
- `template-management-ui`: 模板列表、创建、保存为模板、从模板创建

### Modified Capabilities

- 无（本次只做新增，不改已有能力）

---

## Impact

- **新增文件**：`packages/shared-types/src/template.ts`、`apps/dev-tool/src/modules/repositories/templateRepository.ts`、UI 组件
- **依赖方**：C2（发布态协议依赖 Template 作为发布源）、C4（版本管理需对 Template 独立做版本）
- **向后兼容**：完全新增，不影响现有 EditorDraft 和 PublishedConfig

---

## Out of Scope

- 模板版本管理（C4 负责）
- 模板分类/标签 UI（C4 负责）
- 模板市场/分享（C2+ 负责）
- 模板的发布态映射（C2 负责）

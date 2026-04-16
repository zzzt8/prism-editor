## Context

C1 定义了 Template 类型，C4 在此基础上为模板增加版本管理和资产沉淀能力。现有 `VersionRepository` + `VersionHistory` UI 已覆盖工作流版本管理，C4 复用相同模式应用于模板。

---

## Goals / Non-Goals

**Goals:**

- 为 Template 增加版本历史记录
- 实现模板的版本回滚能力
- 构建 TemplateCenter UI（分类/标签/搜索）
- 复用 VersionHistory 组件框架，减少重复开发

**Non-Goals:**

- 模板分享/权限（→ C5）
- 模板市场/付费（→ P2）
- 服务端存储（继续 IndexedDB）

---

## Decisions

### Decision 1: 模板版本粒度

**选择：每次"保存为模板"时创建新版本**

理由：模板与 EditorDraft 不同，模板变更频率低，每次保存自然是一次版本迭代。这与工作流版本管理（每次发布创建版本）逻辑一致。

---

### Decision 2: TemplateCenter 展示入口

**选项 A**: 作为首页 Tab（与 WorkflowsView 并列）

**选项 B**: 作为 WorkflowHeader 中的按钮（弹出面板）

**选择: A（首页 Tab）**

理由：模板是独立的资产类型，与工作流并列，首页 Tab 更符合信息架构。

---

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 版本历史占用存储空间 | 分页加载；旧版本可手动清理 |
| 模板数量增长后搜索慢 | IndexedDB 支持简单 filter；未来迁移到服务端 |

---

## change_class = medium 测试指南

### Test Plan（测试设计）

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| editor | Smoke test | 手工验收 |

#### Test Cases

##### TC-1: 模板版本历史

- **Given**: 存在已保存的模板
- **When**: 打开模板历史面板
- **Then**: 显示模板的版本列表，包含时间、版本号

##### TC-2: 模板回滚

- **Given**: 模板有 3 个历史版本
- **When**: 回滚到版本 1
- **Then**: 模板内容恢复到版本 1 状态

##### TC-3: 模板分类筛选

- **Given**: 存在多个模板（不同分类和标签）
- **When**: 在 TemplateCenter 按标签筛选
- **Then**: 仅显示匹配标签的模板

#### Backward Compatibility（向后兼容）

- [ ] 无模板历史数据的模板不受影响
- [ ] 现有工作流版本管理功能不受影响

# Changelog — prism-c4-version-management

归档时间：2026-04-17
状态：archived

## 变更摘要

本次归档涉及以下代码变更：

- `apps/dev-tool/src/modules/repositories/templateVersionRepository.ts`（T1）
- `apps/dev-tool/src/components/TemplateCenter/`（T2）
  - `index.tsx`
  - `TemplateFilter.tsx`
  - `TemplateSearch.tsx`
  - `TemplateList.tsx`
  - `TemplateCenter.css`
- `apps/dev-tool/src/components/TemplateCenter/TemplateVersionHistory.tsx`（T3）
- `openspec/changes/prism-c4-version-management/tasks.md`（verify 标记完成）

涉及 layers：editor

## 关键决策

1. **模板版本粒度**：每次"保存为模板"时创建新版本（与工作流版本管理逻辑一致）
2. **TemplateCenter 入口**：作为首页 Tab，与 WorkflowsView 并列（而非弹出面板）

## README 同步建议

**当前 README 中相关部分：**

dev-tool 核心功能列表中已有：
- **版本历史**：追踪变更并回滚到之前版本

**Proposal Goal：**
- 为 Template 增加版本历史记录
- 实现模板的版本回滚能力
- 构建 TemplateCenter UI（分类/标签/搜索）

**同步检查：**
- [ ] dev-tool 核心功能列表是否需要增加"模板版本历史"描述？
- [ ] 开发者工具特性是否需要增加"模板中心"（模板浏览/搜索/分类）描述？
- [ ] "最近更新"章节是否需要同步 C4 的贡献？

## 归档元数据

- Git commit：`d11df08`
- 涉及 layers：editor
- Tasks 完成数：4/4

## 影响层（Impact Map）

本次 change 涉及以下层：

- `meta`: openspec/schemas/prism-workflow/

## 相关目录

- `openspec/schemas/prism-workflow/` - 工作流 schema 定义
- `openspec/schemas/prism-workflow/templates/` - 模板目录

## 关键模块

- `schema.yaml` - 定义 artifacts 生成顺序和依赖
- `templates/proposal.md` - 提案模板
- `templates/design.md` - 设计模板
- `templates/tasks.md` - 任务模板
- `templates/repo-analysis.md` - 结构分析模板

## 复用点

- 现有模板结构可复用
- 已有 artifact 生成流程可参考

## 现有问题

- templates 中有些章节对于当前项目可能过于冗余
- 部分模板缺少对 change_class 的明确指导
- tasks.md 和 design.md 中的 opsx-meta 格式不完全一致

## Impact Summary

- 新增依赖：无
- 破坏性变更：无
- 向后兼容：是

---
name: enhance-prism-workflow-templates
change_class: high
reason: "touches schema layer, modifies artifact templates and generation rules"
---

## Why

当前 prism-workflow 模板在结构上已完整，但在实际使用中存在一些可优化之处：部分章节可更精简、change_class 指导可更明确、元数据格式可进一步统一。这些改进将提升后续 change 的创建和执行效率。

## What Changes

- 精简 proposal.md 中冗余的注释占位符
- 在 design.md 中增加对 change_class = low 的轻量处理指南
- 统一 tasks.md 中的 opsx-meta 元数据格式
- 在 tasks.md 中增加 change_class = low 时的测试验证命令标准写法
- 优化模板注释，使 AI agent 更容易理解模板意图

## Capabilities

### New Capabilities
- `low-change-guide`: 为 change_class = low 提供轻量化模板指南

### Modified Capabilities
- 无

## Impact

- 影响文件：openspec/schemas/prism-workflow/templates/*.md
- 后续所有基于此 schema 创建的 change 均受益

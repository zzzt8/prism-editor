---
name: /opsx-skill
id: opsx-skill
category: Maintenance
description: Skill 系统维护工具。合并了 skill-list / skill-deps / skill-validate / skill-index 功能。
skill:
  depends_on: []
  category: meta
  order: 0
---

委托 `openspec-skill` skill 执行。

> **注意：** 本命令不默认暴露，仅在维护 Skill 系统时使用。

## 使用方式

```bash
# 列出所有 skills
/opsx-skill list

# 按 category 过滤
/opsx-skill list --category propose

# 显示依赖关系
/opsx-skill deps <skill-name>

# 验证所有 skills 格式
/opsx-skill validate

# 重新生成索引
/opsx-skill index
```

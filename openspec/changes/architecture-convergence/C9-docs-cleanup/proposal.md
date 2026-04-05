# C9: 文档清理

> 派生自 meta-change: `architecture-convergence`

## Why

文档影响外部对项目成熟度的判断。server/README 写 PostgreSQL 示例，实际是 SQLite；README 末尾同时出现 "Private. All rights reserved." 和 MIT license。这些不是核心架构问题，但会在重构时制造认知噪音。

## What Changes

- 修正 README.md license 冲突
- 修正 server/README.md DATABASE_URL 示例为 SQLite
- 补充 Prisma migration 说明

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| ui-skin | `README.md` | license 冲突修复 |
| ui-skin | `server/README.md` | DATABASE_URL 示例修正 |

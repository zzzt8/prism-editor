# Documentation

> **当前生效的产品基线**：Prism Composer Platform 产品基线 PRD v1.0（见 `prd/Prism Composer Platform 产品基线 PRD v1.0.md`）

项目文档目录，包含设计文档、技术规范和变更日志。

## 目录结构

```
docs/
├── changelogs/                    # 变更日志
│   ├── 2026-04-17-prism-c2-publish-protocol.md
│   ├── 2026-04-17-prism-c3-editor-experience.md
│   ├── 2026-04-17-prism-c4-version-management.md
│   └── 2026-04-17-prism-c5-platform-foundation.md
├── prd/                          # 产品需求文档
│   ├── _archive/                 # 历史文档归档（v0.1/v0.2 等已作废）
│   └── Prism Composer Platform 产品基线 PRD v1.0.md  ← 当前生效
├── apply-mask-optimization/       # 蒙版优化设计文档
│   ├── DESIGN.md
│   └── SUMMARY.md
├── cdn-cors-configuration.md     # CDN/CORS 配置说明
└── harness.md                    # 测试工具文档
```

## 变更日志 (Changelogs)

变更日志记录了每个主要版本或功能发布的重要变更：

| 日期 | 变更 | 描述 |
|------|------|------|
| 2026-06-03 | fix-performance-test-assertion | 修复性能测试断言阈值 |
| 2026-04-17 | prism-c2-publish-protocol | 发布协议实现 |
| 2026-04-17 | prism-c3-editor-experience | 编辑器体验优化 |
| 2026-04-17 | prism-c4-version-management | 版本管理系统 |
| 2026-04-17 | prism-c5-platform-foundation | 平台基础架构 |

## PRD 文档

> **当前生效**：Prism Composer Platform 产品基线 PRD v1.0（见 `prd/Prism Composer Platform 产品基线 PRD v1.0.md`）

产品需求文档（PRD）定义了项目的需求和约束：

| 文档 | 状态 |
|------|------|
| **Prism Composer Platform 产品基线 PRD v1.0.md** | **当前生效** |
| Prism Editor PRD v0.1.md | **作废** → 已归档 |
| Prism Editor 产品定位与产品形态 PRD v0.2.md | **作废** → 已归档 |
| Prism Editor 任务规划摘要 v0.1.md | **作废** → 已归档 |
| Prism Editor 任务拆解 v0.1.md | **作废** → 已归档 |
| Prism Editor 技术架构约束清单 v0.1.md | **作废** → 已归档 |
| Prism Editor 架构审阅报告 v0.1.md | **作废** → 已归档 |

历史文档已移入 `prd/_archive/`。

## 设计文档

技术设计文档详细说明了实现方案：

- **apply-mask-optimization/DESIGN.md** - 蒙版优化设计方案
- **apply-mask-optimization/SUMMARY.md** - 蒙版优化总结

## 其他文档

- **cdn-cors-configuration.md** - CDN 和 CORS 配置说明，用于跨域图像加载
- **harness.md** - 测试工具使用文档

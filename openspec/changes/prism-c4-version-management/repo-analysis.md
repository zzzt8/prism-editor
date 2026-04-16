## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/shared-types/` | 确认/扩展 Template 类型（增加 version 字段） |
| editor | `apps/dev-tool/` | 新增 TemplateCenter UI、模板版本管理 |
| runtime | `apps/user-app/` | 不涉及 |
| backend | `server/` | 暂不涉及（模板版本存 IndexedDB） |
| ui-skin | `packages/shared-ui/` | 若有共享组件则涉及 |

---

## 相关目录

```
affected/
├── packages/shared-types/src/
│   └── template.ts               ← 确认 version 字段存在
├── apps/dev-tool/src/
│   ├── modules/repositories/
│   │   ├── templateRepository.ts       ← C1 新增
│   │   └── templateVersionRepository.ts  ← 新增
│   ├── components/
│   │   ├── TemplateCenter/             ← 新增
│   │   │   ├── index.tsx
│   │   │   ├── TemplateList.tsx
│   │   │   ├── TemplateFilter.tsx      ← 分类/标签筛选
│   │   │   └── TemplateSearch.tsx
│   │   └── VersionHistory/             ← 复用现有组件
│   │       └── TemplateVersionHistory.tsx  ← 扩展或包装
```

---

## 关键模块

### TemplateCenter（新增）

- **位置**: `apps/dev-tool/src/components/TemplateCenter/`
- **职责**: 团队模板的集中展示页面，包含分类/标签筛选、搜索、模板卡片列表
- **复用**: 复用 `TemplateCard`（C1）

### TemplateVersionRepository（新增）

- **位置**: `apps/dev-tool/src/modules/repositories/templateVersionRepository.ts`
- **职责**: 模板版本的 CRUD，复用 `VersionAdapter` 模式
- **复用**: 参考 `VersionRepository` 实现

---

## 现有问题

1. **模板无法版本管理**：Template 修改后无历史记录
2. **模板无分类/标签筛选**：Template.tags 字段存在但 UI 未接入
3. **模板发现困难**：无模板中心，团队成员无法搜索模板

---

## Impact Summary

本次 change 影响：

- **新增依赖**: 无
- **破坏性变更**: 无
- **向后兼容**: 完全向后兼容

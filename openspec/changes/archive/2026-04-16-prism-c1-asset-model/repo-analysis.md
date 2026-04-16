## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/shared-types/` | 新增 `template.ts` 类型文件，扩展 `index.ts` 导出 |
| editor | `apps/dev-tool/` | 新增 TemplateRepository、模板管理 UI、SaveDialog 扩展、EditorCanvas 扩展 |
| runtime | `apps/user-app/` | 暂时不受影响（user-app 消费 PublishedConfig，不直接消费 Template） |
| backend | `server/` | 暂时不受影响（当前模板存储在 IndexedDB） |
| ui-skin | `packages/shared-ui/` | 如模板管理 UI 使用共享组件则涉及 |

---

## 相关目录

```
affected/
├── packages/shared-types/src/
│   ├── template.ts          ← 新增
│   └── index.ts             ← 扩展导出
├── apps/dev-tool/src/
│   ├── modules/repositories/
│   │   ├── templateRepository.ts  ← 新增
│   │   └── index.ts               ← 扩展导出
│   ├── components/
│   │   ├── TemplateManager/       ← 新增 UI 目录
│   │   │   ├── index.tsx
│   │   │   ├── TemplateList.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   └── TemplateDetail.tsx
│   │   └── header/
│   │       └── SaveDialog.tsx     ← 扩展
│   └── modules/
│       └── editor/
│           └── stores/            ← 扩展 canvasStore（从模板创建）
```

---

## 关键模块

### Template 类型（新增）

- **位置**: `packages/shared-types/src/template.ts`
- **职责**: 定义模板态的完整数据契约，与 EditorDraft 和 PublishedConfig 并列
- **数据流**: EditorDraft → [保存为模板] → Template；Template → [从模板创建] → EditorDraft
- **设计约束**: Template 必须快照节点 graph，而非引用 EditorDraft 的实时指针

### TemplateRepository（新增）

- **位置**: `apps/dev-tool/src/modules/repositories/templateRepository.ts`
- **职责**: 模板持久化，封装 IndexedDB 操作，对应 arch constraint 8.1（数据分层）
- **复用**: 复用 `IndexedDBStorageAdapter` 的现有模式（参考 WorkflowRepository）
- **调用链**: CanvasStore → TemplateRepository → IndexedDBStorageAdapter

### SaveDialog 扩展（修改）

- **位置**: `apps/dev-tool/src/components/header/SaveDialog.tsx`
- **职责**: 增加"另存为模板"入口，收集模板元信息（名称、描述、标签）
- **调用链**: SaveDialog → TemplateRepository.save()

---

## 复用点

- `IndexedDBStorageAdapter`：现有 WorkflowRepository 已完整封装，TemplateRepository 复用相同模式
- `editor-draft.ts` 中的 `EditorCanvasNode` / `EditorCanvasEdge` 类型：Template 内部节点结构复用
- `workflow.ts` 中的 `WorkflowInput` / `WorkflowOutput`：模板输入输出 schema 复用
- `node-package.ts` 中的 `NodePackage`：模板依赖的节点包信息可复用

---

## 现有问题

1. **Template 类型缺失**：shared-types 中完全没有 Template 定义，模板数据是 untyped JSON
2. **模板存储未分层**：当前可能把模板数据混在 workflow draft 里，未按 constraint 8.1 分离
3. **模板无法从 EditorCanvas 创建**：缺少从当前画布状态保存为模板的路径

---

## Impact Summary

本次 change 影响：

- **新增依赖**: 无新增外部依赖
- **破坏性变更**: 无
- **向后兼容**: 完全向后兼容，仅新增文件
- **新增文件数**: ~6 个（类型 + repository + UI）

---

## 数据流变化

```
[Before]

EditorDraft (无类型)
  ↓ (临时 JSON)
localStorage / IndexedDB
  ↑ (手动加载)
EditorCanvas

[After]

EditorDraft (typed)
  ↓ (SaveDialog: 保存为模板)
Template (typed, new)
  ↓ (TemplateManager: 从模板创建)
EditorDraft (typed)
```

Template 与 EditorDraft 的关系是快照复制，而非引用共享。模板修改不影响已派生的草稿。

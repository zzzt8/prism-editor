## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/shared-types/` | 扩展 `published.ts`（PublishedParamDefinition 新增字段） |
| editor | `apps/dev-tool/` | 扩展 workflowToPublished mapper、PublishDialog 参数配置 UI、canvasStore publishSlice |
| runtime | `apps/user-app/` | ParamsSection 重构，按 PublishedParamDefinition 渲染控件 |
| backend | `server/` | 暂时不受影响（当前发布物存 IndexedDB） |
| ui-skin | `packages/shared-ui/` | 若有参数控件共享组件则涉及 |

---

## 相关目录

```
affected/
├── packages/shared-types/src/
│   └── published.ts          ← 扩展 PublishedParamDefinition
├── apps/dev-tool/src/
│   ├── modules/editor/
│   │   ├── mappers/
│   │   │   └── workflowToPublished.ts   ← 扩展参数推断逻辑
│   │   └── stores/
│   │       └── publishSlice.ts          ← 新增
│   └── components/
│       └── header/
│           └── PublishDialog.tsx        ← 重构参数配置 UI
├── apps/user-app/src/
│   └── components/
│       └── ParamsSection/               ← 重构，接入 PublishedParamDefinition
```

---

## 关键模块

### PublishedParamDefinition（新增字段，published.ts）

- **位置**: `packages/shared-types/src/published.ts`
- **职责**: 完整的发布态参数抽象，替代现有的 PublishedParamConfig
- **新字段**:
  - `controlType`: 推断自节点定义（select / number / string / boolean / image-file）
  - `options`: select 类型专用（label + value 列表）
  - `defaultValue`: 用户未填时的默认值
  - `validation`: 校验规则（type / min / max / required / pattern）
  - `visibility`: visible / hidden / locked（已存在于 PublishedParamVisibility）
  - `description`: 参数说明文本
- **复用**: 复用现有 `PortDataType` 推断 `controlType`

### workflowToPublished mapper（扩展）

- **位置**: `apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts`
- **职责**: 发布时从 EditorDraft 构建 PublishedWorkflow，自动推断各参数的控件类型和默认值
- **复用**: 复用 node-definitions 中的参数 schema 推断 controlType

### PublishDialog 参数配置 UI（重构）

- **位置**: `apps/dev-tool/src/components/header/PublishDialog.tsx`
- **职责**: 每个 exposedParams 项提供：显示名编辑、控件类型选择、默认值设置、可见性切换、校验规则配置
- **调用链**: PublishDialog → publishSlice → TemplateRepository / WorkflowRepository

### ParamsSection（user-app 端）

- **位置**: `apps/user-app/src/components/ParamsSection/`
- **职责**: 按 PublishedParamDefinition 渲染对应控件（Select / NumberInput / TextInput / Switch / ImageUpload）
- **调用链**: PublishedWorkflow.config.exposedParams[] → ParamsSection → 渲染控件

---

## 复用点

- `node.ts` 中的 `NodeDefinition.paramSchema`：参数类型定义，可从中推断 controlType
- `PublishedParamVisibility`：visibility 字段复用已有类型
- `execution.ts` 中的 `ExecutionContext`：发布后的执行上下文
- 现有 PublishDialog UI 框架：增量扩展，不重写

---

## 现有问题

1. **PublishedParamConfig 太简陋**：只有 nodeId + paramId + label，user-app 无法推断控件类型
2. **exposedParams 为空数组**：架构师指出的核心阻塞——用户端无可配置参数
3. **workflowToPublished 无参数推断**：发布时不会自动从节点定义推断控件类型
4. **user-app 参数渲染缺失**：ParamsSection 还未接入 PublishedParamDefinition

---

## Impact Summary

本次 change 影响：

- **新增依赖**: 无
- **破坏性变更**: 无（PublishedParamDefinition 是新字段，现有 PublishedParamConfig 字段兼容）
- **向后兼容**: 旧 PublishedConfig 数据中 exposedParams 仍为空或旧格式，通过默认值降级
- **数据流变化**: EditorDraft → workflowToPublished → PublishedWorkflow（含完整参数模型） → user-app ParamsSection

---

## 数据流变化

```
[Before]

EditorDraft
  → workflowToPublished (无参数推断)
  → PublishedConfig { exposedParams: [] }
  → user-app ParamsSection (无可渲染参数)

[After]

EditorDraft
  → workflowToPublished (自动推断 controlType/defaultValue)
  → PublishedConfig { exposedParams: PublishedParamDefinition[] }
  → user-app ParamsSection (按控件类型渲染)
```

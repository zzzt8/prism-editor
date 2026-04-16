## Context

当前 `PublishedParamConfig`（nodeId + paramId + label）不足以支撑 user-app 的参数渲染需求。user-app 需要知道每个参数应该渲染成什么控件（select / number / string / boolean / image-file），默认值是什么，是否必填，如何校验。

架构约束 2.1（三态分离）、6.1（发布协议统一）、6.3（发布输入不得依赖作者知识）都要求参数 schema 必须由系统显式生成，而非靠作者手动描述。

---

## Goals / Non-Goals

**Goals:**

- 将 `PublishedParamConfig` 升级为 `PublishedParamDefinition`，支持完整参数元信息
- `workflowToPublished` 自动推断参数控件类型和默认值，减少作者手动配置成本
- user-app 端按 `PublishedParamDefinition` 渲染参数控件，实现"非开发者也能跑链路"
- 发布对话框提供参数可见性/锁定的配置 UI

**Non-Goals:**

- 复杂校验 DSL（仅布尔/范围/正则）
- 条件可见性/动态选项（未来扩展）
- 服务端存储升级（继续 IndexedDB）

---

## Decisions

### Decision 1: PublishedParamDefinition 字段设计

保留 `nodeId + paramId` 作为来源映射的定位锚，新增字段：

```typescript
interface PublishedParamDefinition {
  nodeId: string;
  paramId: string;
  label: string;                    // 显示名
  controlType: 'select' | 'number' | 'string' | 'boolean' | 'image-file';
  options?: Array<{ label: string; value: unknown }>;  // 仅 select
  defaultValue?: unknown;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;   // 仅 string
  };
  visibility: 'visible' | 'hidden' | 'locked';
  description?: string;
}
```

**选择理由**：最小可行集合，满足 user-app 渲染需求，不过度设计。

---

### Decision 2: 控件类型推断逻辑

`workflowToPublished` 发布时，从 `NodeDefinition.paramSchema` 推断 `controlType`：

| paramSchema.type | 推断 controlType |
|-------------------|-----------------|
| enum / select | select |
| number / integer | number |
| boolean | boolean |
| string (file) | image-file |
| string (其他) | string |

**选择理由**：自动推断减少作者配置负担，符合架构约束 6.3。

---

### Decision 3: 与现有 PublishedParamConfig 的兼容性

**选择：保留现有字段，新增 `paramDefinitions` 字段**

```typescript
// published.ts
export interface PublishedConfig {
  // 旧字段（兼容已有数据）
  exposedParams: PublishedParamConfig[];
  // 新字段
  paramDefinitions?: PublishedParamDefinition[];
}
```

**选择理由**：完全向后兼容，旧的 exposedParams 数据降级处理（视为 `controlType: 'string'`）。

---

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 控件类型推断不准确（某些节点 paramSchema 不完整） | 降级为 string + 手工覆盖 |
| 旧数据 paramDefinitions 为空 | UI 读取时优先 paramDefinitions，降级 fallback 到 exposedParams |
| 校验规则 DSL 未来需扩展 | 当前仅三种简单规则，预留 `validation.extra?: unknown` 扩展口 |

---

## Architecture Review（技术方案评审）

### 目标

定义完整的 `PublishedParamDefinition` 参数模型，升级发布态协议，使 user-app 能按参数类型渲染控件，实现"非开发者也能跑链路"。

### 约束

- 技术约束: 向后兼容旧 PublishedConfig；TypeScript 类型安全；不引入运行时额外依赖
- 时间约束: 一次性交付
- 不变量: 现有 PublishedConfig.exposedParams 字段保留；nodeId + paramId 定位锚不变

### 候选方案

#### 方案 A: 直接替换 PublishedParamConfig

**Pros**: 数据结构干净

**Cons**: 破坏现有数据；需要数据迁移脚本

#### 方案 B: 新增 paramDefinitions 字段，保留 exposedParams

**Pros**: 完全向后兼容；渐进迁移

**Cons**: 两种字段并存增加理解成本

### 决策

**选择方案 B**。

原因：当前 IndexedDB 中可能已有 PublishedConfig 数据，直接替换会导致现有发布物失效。采用共存策略，旧数据降级处理，新数据使用 paramDefinitions。

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 两种字段并存导致 UI 读取逻辑复杂 | 低 | 中 | UI 统一封装读取函数，优先 paramDefinitions |
| 推断逻辑不准确 | 中 | 低 | 支持作者手工覆盖推断结果 |

**回滚方案**: 删除 `paramDefinitions` 字段，恢复为仅使用 `exposedParams`。revert mapper 和 UI 文件即可。

### Migration Strategy（迁移策略）

1. **数据迁移**: 无（新增字段，默认 undefined，现有数据不受影响）
2. **灰度发布**: 新字段仅在新发布时填充；旧发布物保持 exposedParams 格式
3. **回滚触发**: user-app 参数渲染失败率 > 5% 则回滚

---

## change_class = high 测试指南

### Test Plan（测试设计）

#### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 + golden fixture | `pnpm typecheck --filter=@prism/shared-types` |
| editor | Smoke test | 手工验收 |
| runtime | Smoke test | 手工验收 |

#### Test Cases

##### TC-1: workflowToPublished 自动推断控件类型

- **Given**: 编辑器中 LoadImage 节点的 `blur` 参数（number 类型）和 `mode` 参数（enum: 'normal' | 'multiply'）
- **When**: 执行发布
- **Then**: `PublishedConfig.paramDefinitions` 中，`blur` 的 controlType 为 `'number'`，`mode` 的 controlType 为 `'select'` 且 options 包含两个选项

##### TC-2: user-app 按控件类型渲染

- **Given**: PublishedWorkflow.config.paramDefinitions 中有一个 boolean 参数（opacity: true/false）
- **When**: user-app 渲染参数面板
- **Then**: 该参数渲染为 Switch 控件，非 TextInput

##### TC-3: 降级兼容

- **Given**: 旧的 PublishedConfig（仅有 exposedParams，无 paramDefinitions）
- **When**: user-app 读取参数
- **Then**: 参数降级渲染为 TextInput，不崩溃

##### TC-4: 可见性 locked 参数不可编辑

- **Given**: PublishedConfig.paramDefinitions 中某参数 visibility 为 `'locked'`
- **When**: user-app 渲染参数
- **Then**: 控件为 disabled 状态

#### Backward Compatibility（向后兼容）

- [ ] 旧 PublishedConfig（无 paramDefinitions）可正常读取
- [ ] 旧 EditorDraft 发布路径不受影响
- [ ] user-app 现有参数渲染逻辑不受影响（新增字段不影响旧字段）

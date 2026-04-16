## Context

Prism Editor 当前已有 `EditorDraft`（编辑态）和 `PublishedConfig`（发布态）两个核心类型，数据契约相对清晰。但 `Template`（模板态）完全缺失，导致"模板复用"（P0-7）能力只能停留在"复制 JSON"的层面，无法构建类型安全的模板管理路径。

技术架构约束清单 2.1 明确要求"三态模型必须分离"，且"模板不是草稿别名"。Template 必须是一个独立的快照对象，而非 EditorDraft 的软链接。

---

## Goals / Non-Goals

**Goals:**

- 定义完整的 `Template` 类型，与 EditorDraft、PublishedConfig 三态并行
- 实现 `ITemplateRepository` 接口，封装模板的持久化
- 打通"保存为模板"和"从模板创建"两条关键路径
- 模板数据必须快照节点 graph，与源草稿解耦

**Non-Goals:**

- 模板版本管理（→ C4）
- 模板分类/标签/搜索 UI（→ C4）
- 模板发布态映射（→ C2）
- 服务端持久化（当前阶段继续用 IndexedDB）

---

## Decisions

### Decision 1: Template 存储策略——独立 Repository

**选项 A**: 共用 `WorkflowRepository`（在现有 `workflows` store 中加 `type` 字段区分）

**选项 B**: 独立的 `TemplateRepository`（独立的 IndexedDB object store）

**选择: B**

理由：架构约束 2.1 要求"模板不是草稿别名"，共用 Repository 会导致类型混用，且模板和草稿的生命周期管理（删除、版本策略）完全不同。独立 store 更清晰，符合单一职责原则。

**代价**: 多一个 IndexedDB object store，当前阶段数据量小，不构成性能问题。

---

### Decision 2: Template 内部节点结构——快照 EditorCanvasNode

**选项 A**: 直接存储 `EditorCanvasNode[]`（保留画布位置）

**选项 B**: 只存 `WorkflowNode[]`（去掉画布坐标，变成纯逻辑 graph）

**选择: A**

理由：

1. 用户保存模板后，从模板创建时希望能继承节点位置，减少重排成本
2. EditorCanvasNode 已是 EditorDraft 的标准节点类型，直接复用无需额外映射
3. 画布坐标在"从模板创建"时可以由 EditorCanvas 生成新的，或保留模板快照坐标

---

### Decision 3: Template 输入输出 schema——复用 WorkflowInput/WorkflowOutput

**选择: 直接复用，不新建独立 schema**

理由：Template 是 EditorDraft 的快照，EditorDraft 中并无显式 I/O schema 定义（这部分是 P0-5 的任务）。当前阶段模板的输入输出在保存时为空占位，后续由 C2 的发布态参数模型填充。

---

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 模板快照导致存储体积大 | 未来可做节点 graph 压缩（低优先级） |
| 从模板创建时节点 ID 全部重新生成 | 这是预期行为，不应复用模板中的 UUID |
| IndexedDB 存储上限 | 第一阶段数据量小；未来迁移到 server |

---

## Architecture Review（技术方案评审）

### 目标

定义 Template 类型，实现模板态与编辑态的清晰分离，满足架构约束 2.1（三态必须分离）。

### 约束

- 技术约束: 仅新增，不修改现有类型；TypeScript 类型安全；IndexedDB 存储
- 时间约束: 一次性交付，不做分期
- 不变量: Template 快照后不可变；模板修改不影响已派生的草稿

### 候选方案

#### 方案 A: 最小化 Template（仅 id/name/workflowId 引用）

**Pros**:
- 最轻量，改动最少

**Cons**:
- 本质上还是"模板是草稿的别名"，违反架构约束 2.1
- 无法支持离线/独立版本

#### 方案 B: 完整快照 Template（完整节点 graph + 元数据）

**Pros**:
- 符合架构约束"模板不是草稿别名"
- 支持离线模板
- 未来可独立版本化

**Cons**:
- 存储体积比引用方案大

### 决策

**选择方案 B**。

原因：架构师明确要求 Template 提升到资产模型层级，而非简单的草稿别名。完整快照是实现模板真正独立复用的基础。

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 新增类型引入循环依赖 | 低 | 中 | Template 只依赖 EditorCanvasNode，不反向依赖 |
| 存储体积增长 | 中 | 低 | IndexedDB 当前够用；未来优化 |

**回滚方案**: 删除 `template.ts` 和 `templateRepository.ts`，revert `index.ts` 导出即可。UI 层改动独立，无耦合。

### Migration Strategy（迁移策略）

1. **数据迁移**: 无（全新对象类型，IndexedDB store 首次创建）
2. **灰度发布**: 模板功能作为新增入口，不影响现有保存/发布路径
3. **回滚触发**: 模板列表页加载失败率 > 5% 则回滚

---

## change_class = high 测试指南

> C1 属于 high change_class，使用完整测试章节。

### Test Plan（测试设计）

#### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 | `pnpm typecheck --filter=@prism/shared-types` |
| editor | Smoke test | 手工验收 |

#### Test Cases

##### TC-1: 保存工作流为模板

- **Given**: 编辑器中有若干节点和连线的工作流
- **When**: 点击"保存为模板"，填写名称/描述/标签后确认
- **Then**: 模板出现在模板列表中，包含正确的节点快照和元数据

##### TC-2: 从模板创建新工作流

- **Given**: 存在已保存的模板
- **When**: 点击"从模板创建"
- **Then**: 编辑器加载模板节点快照，生成新的节点 ID，用户进入编辑状态

##### TC-3: 删除模板不影响已有草稿

- **Given**: 从某模板派生了工作流 A
- **When**: 删除该模板
- **Then**: 工作流 A 正常可编辑，节点内容未变

##### TC-4: 类型安全验证

- **Given**: 任意 Template 实例
- **When**: 访问 `template.nodes`、`template.workflowMeta`
- **Then**: TypeScript 类型检查通过

#### Backward Compatibility（向后兼容）

- [ ] 现有 EditorDraft 仍可正常保存和加载
- [ ] 现有 PublishedConfig 导出/导入不受影响
- [ ] 现有 IndexedDB 数据不因新增 store 而损坏

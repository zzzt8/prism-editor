# Design: ProductTemplate Lifecycle

## Goals

- 让 dev-tool 可以创建、编辑、保存 ProductTemplate
- 保持现有 `Workflow` / `PublishedWorkflow` 链路可继续工作
- 通过子 change 分层推进，避免一次性跨层大爆炸
- 让 `ProductTemplate` 先成为可管理的业务对象，再逐步接入发布与 user-app

## Non-Goals

- 不改 `workflow-core` 执行模型
- 不让 production flow 在本轮变成可执行引擎
- 不在本轮引入 marketplace / template sharing / complex versioning
- 不迁移所有历史 `PublishedWorkflow` 数据

## Decisions

### 1. 先做对象生命周期，再做运行时消费

`ProductTemplate` 当前最大缺口不是类型，而是"对象不存在"。因此第一阶段先补：

- 创建入口
- 编辑表单
- 本地持久化
- server CRUD

只有对象生命周期稳定后，user-app 才有可靠的消费目标。

### 2. dev-tool 先使用独立的 ProductTemplate 存储，不把它塞进现有 Workflow store

现有 `useCanvasStore` 明显以 `Workflow` 为中心：

- `newWorkflow()` 直接创建空 Workflow
- `toWorkflow()` 只序列化 nodes / edges / metadata
- `loadFromTemplate()` 针对的是旧 Template 快照体系

如果硬把 `ProductTemplate` 塞进 `canvasStore`，会导致 store 语义混乱。

决策：

- 新增 `ProductTemplateStore` 或等价的 editor state slice
- `canvasStore` 继续只管理 canvas/workflow
- ProductTemplate 通过引用 `preview.flow` / `production.flow` 连接到 Workflow

### 3. 发布阶段保持兼容：ProductTemplate 不替代 PublishedWorkflow，而是包装/绑定它

过渡期最稳妥的策略：

- `preview.flow` 继续优先引用 `PublishedWorkflow`
- 发布时先验证 ProductTemplate 顶层共享层与 preview.flow 绑定是否完整
- user-app 可以先通过 ProductTemplate 入口，再转到底层 `PublishedWorkflow` 运行

这样能够最大程度复用现有 executor 与 public API。

### 4. 子 change 分拆按 layer 依赖排序

拆分依据：

- `editor` 子 change 可先在本地完成，不依赖 Prisma/schema
- `backend` 子 change 需要稳定的类型契约与保存对象结构
- `runtime` 子 change 需要 server 提供稳定 API

因此顺序固定为：`editor` → `backend` → `runtime`。

---

## Architecture Review

### 方案 A：直接扩展现有 Workflow / PublishedWorkflow 模型

**做法**：在现有 `Workflow` / `PublishedWorkflow` 内部不断追加 `productTemplate` 字段。

**优点**：
- 改动路径少
- 部分现有 API 可复用

**缺点**：
- 污染 legacy contract
- 无法清晰表达 `ProductTemplate` 是业务层对象
- editor/store 语义会更混乱

**结论**：不采用。

### 方案 B：把 ProductTemplate 作为独立业务对象，引用现有 Workflow / PublishedWorkflow

**做法**：新增独立 ProductTemplate entity，显式持有：

- 顶层共享层（inputs / designParams / assets）
- `preview.flow` 引用现有 `PublishedWorkflow` / `Workflow`
- `production.flow` 保留占位

**优点**：
- 和 `docs/product-template-v1.md` 一致
- 便于后续演化到 v2 / v3
- 可分阶段接入，不强行重构 existing runtime

**缺点**：
- CRUD / API / UI 都要补
- 初期会出现两套对象并行（Workflow / ProductTemplate）

**结论**：采用。

---

## Target Architecture

```text
ProductTemplate
  ├── shared layer
  │     ├── inputs
  │     ├── designParams
  │     └── assets
  │
  ├── preview
  │     ├── canvas spec
  │     └── flow ref -> PublishedWorkflow | Workflow
  │
  └── production
        ├── output spec
        └── flow ref -> workflow | external | none
```

运行期分层：

```text
dev-tool
  ├── Workflow editor (existing)
  ├── ProductTemplate editor (new)
  └── ProductTemplate repository (IndexedDB first)

server
  ├── ProductTemplate Prisma model
  ├── ProductTemplate CRUD API
  └── ProductTemplate publish endpoint

user-app
  ├── ProductTemplate list/detail
  └── bridge to PublishedWorkflow runner
```

---

## Review Checklist

- [ ] `ProductTemplate` 是否保持独立业务对象，而非污染 legacy workflow contract
- [ ] dev-tool store 是否与 `canvasStore` 职责清晰分离
- [ ] Prisma schema 是否避免和 `Workflow` / `PublishedWorkflow` 形成模糊 ownership
- [ ] server API 是否提供最小但完整的 CRUD 能力
- [ ] 发布链是否继续兼容既有 `PublishedWorkflow` 执行模型
- [ ] user-app 是否可以逐步接入，而不是一次性替换全部入口
- [ ] 子 change 顺序是否能降低回滚成本

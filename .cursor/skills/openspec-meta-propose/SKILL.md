---
name: openspec-meta-propose
description: 创建规划总览 change，解析专家规划文档，产出 change-index 拆分结果，支持后续批量派生子 change。
---

> **前置共享片段：** layer 映射见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心职责

- 接收专家规划文档（长文分析 / 分析报告 / 重构规划等）
- 做一次全局 repo-analysis（只扫一遍，不重复）
- 产出 `change-index.md`：候选子 change 列表 + 依赖 + 优先级
- 定义全局约束和拆分原则
- 为后续子 change 生成提供统一的分析结论

## 与普通 propose 的区别

| 对比维度 | 普通 propose | meta-propose |
|---------|-------------|-------------|
| 目标 | 解决一个具体问题 | 将大规划拆成多个子 change |
| 产出 | 带 tasks 的 change | 带 change-index 的规划 change |
| 子 change 目录 | 独立目录（如 `mapper-contract/`） | 在 meta-change 目录下，带 `C#-` 前缀（如 `architecture-convergence/C1-mapper-contract/`） |
| tasks | implementation tasks | 拆分 + 依赖分析任务 |
| 后续 | 直接 apply | 从 change-index 批量派生子 change |

## 执行流程

### 1. 判断输入类型

**如果用户提供了外部文档路径：**
```bash
# 读取专家规划文档
cat "<path-to-expert-plan>"
```

**如果用户在聊天中粘贴了规划内容：**
直接解析聊天上下文中的规划文本。

**如果用户说"我要对整个项目做一次重构"：**
询问或扫描项目结构，主动生成一份全局分析作为规划输入。

### 2. 全局结构分析（只做一次）

```bash
# 快速扫描代码库结构
openspec list --json  # 了解当前 active changes
```

扫描以下目录，生成全局 `## Impact Map`：

- `packages/workflow-core/`、`packages/image-ops/`、`packages/node-definitions/`
- `apps/dev-tool/`、`apps/user-app/`
- `server/src/`、`server/prisma/`
- `packages/shared-ui/`、`packages/shared-types/`

**全局 Impact Map 输出示例：**

```
## Global Impact Map

| 模块 | Layer | 当前状态 | 关联模块 |
|------|-------|---------|---------|
| workflow-core | engine | 核心依赖，所有 app 共用 | image-ops, node-definitions |
| server/prisma | backend | schema 尚未支持 PublishedWorkflow 协议 | workflow-core |
| dev-tool canvas | editor | canvasStore 耦合重 | 无 |
| user-app loader | runtime | 加载逻辑与 dev-tool 高度耦合 | dev-tool |
```

### 3. 生成 meta-change artifacts

按依赖顺序生成 4 个 artifact，不生成普通 tasks：

**proposal.md（规划总览）：**
- **Why**：这份专家规划要解决什么大问题，为什么要拆分执行
- **What Changes**：整体规划范围（不是具体实现）
- **Impact Summary**：全局影响面
- **拆分背景**：为什么需要多个 change 而不是一个

**repo-analysis.md（全局分析）：**
- 扫描所有相关模块，标注当前状态
- 识别核心依赖链
- 识别高耦合区域（这些区域决定了 change 边界）
- 识别跨层联动点
- **重要**：这份分析结论所有子 change 共享，不要在每个子 change 中重复扫描

**design.md（拆分原则）：**
- change 的切分维度（按 layer？按模块？按依赖？）
- 允许跨层还是按 layer 切
- 如何保证协议一致性（如 published workflow 协议）
- 全局约束（如 server schema 必须在所有 app 之前改）
- 依赖优先级矩阵

**change-index.md（核心产出）：**

```markdown
# Change Index

> 本 index 由 meta-change `<name>` 全局分析生成。
> 所有子 change 均派生自本 index，请勿单独定义不在本 index 中的 change。

## 拆分原则

- 按 Layer 优先级：engine > backend > editor > runtime > ui-skin
- 跨 Layer 的协议改动单独成 change
- 避免跨 change 的循环依赖
- P0 = 核心依赖 / 阻塞性改动；P1 = 重要但不阻塞；P2 = 可延后

---

## C1 <change-name>

- **goal**: <一句话描述目标>
- **layer**: <engine / backend / editor / runtime / ui-skin，多个用逗号分隔>
- **depends_on**: <none / C2 / C3...>
- **priority**: <P0 / P1 / P2>
- **risk**: <low / medium / high>
- **scope**: <涉及哪些模块>
- **reason**: <为什么需要这个 change>
- **blocked_by**: <前置条件，未满足前不可开始>
- **status**: <planned>

---

## C2 <change-name>

- **goal**: ...
- **layer**: ...
- **depends_on**: <C1>
- **priority**: <P0 / P1 / P2>
- **risk**: <low / medium / high>
- **scope**: ...
- **reason**: ...
- **blocked_by**: ...
- **status**: <planned>
```

### 4. 推荐执行顺序

在 change-index 末尾生成执行顺序建议：

```markdown
## Recommended Execution Order

### Phase 1: 基础设施（P0，必须先做）
1. C1: <name> — 解除核心依赖
2. C2: <name> — 依赖 C1

### Phase 2: 核心实现（P0/P1，可并行）
3. C3: <name> — 无依赖，独立
4. C4: <name> — 无依赖，独立（可与 C3 并行）

### Phase 3: 界面落地（P1，可延后）
5. C5: <name> — 依赖 C3
6. C6: <name> — 依赖 C4

### Phase 4: 收尾（P2）
7. C7: <name> — 低优先级，可跳过或延后
```

### 5. 显示状态

```bash
openspec status --change "<name>"
```

## 切分维度的判断原则

如何决定把一个规划拆成几个 change：

| 切分维度 | 触发条件 | 示例 |
|---------|---------|------|
| **按 layer** | 改动分布在不同 app/package | dev-tool 改动 + user-app 改动分成两个 change |
| **按协议** | 涉及跨系统的接口/协议变更 | published workflow 协议单独成 change |
| **按依赖链** | A 改动是 B 改动的前置 | C1 先改 server schema，C2 再改 app |
| **按风险** | 某部分改动风险极高需隔离 | 数据库 schema 迁移单独成 change |
| **按团队** | 不同模块归属不同维护者 | server 和 editor 分开 |
| **按原子性** | 可独立验证的最小单元 | 一个 node type 的完整实现（定义+实现+测试） |

## Guardrails

- **强制**只做一次全局 repo-analysis，所有子 change 共享结论
- **强制**生成 change-index.md 作为核心产出
- **强制**所有子 change 在 change-index 的 `## C# <name>` 标题中使用带编号的目录名（如 `C1-mapper-contract`），并在 change-index 中注明"派生自 meta-change 目录"
- **禁止**在 meta-propose 阶段生成 implementation tasks
- **禁止**跳过全局分析直接脑补 change 列表
- **强制**change-index 中每个子 change 必须包含 `depends_on`、`priority`、`reason`
- **强制**在 design.md 中明确定义拆分原则
- **强制**推荐执行顺序含 Phase 分组

---

## 后续：派生子 change

Meta-change 创建完成后，用户可运行 `/opsx-change-index` 从 change-index 批量派生子 change（参见 `openspec-change-index` skill）。

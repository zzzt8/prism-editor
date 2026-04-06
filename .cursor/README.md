# .cursor 目录说明

本目录包含 Cursor AI 助手在 Prism Editor 项目中使用的 Skill（技能）和 Command（命令），用于规范 OpenSpec change 的全生命周期管理。

---

## 目录结构

```
.cursor/
├── skills/                        # Skill 定义文件（AI 执行逻辑）
│   ├── _shared/
│   │   └── SHARED-LAYERS.md       # 共享层：layer 映射、验证命令、增量测试策略
│   ├── openspec-propose/          # 创建 change，生成 artifacts
│   ├── openspec-meta-propose/     # 创建规划总览 change，产出 change-index 拆分结果
│   ├── openspec-change-index/     # 从 change-index 批量派生子 change
│   ├── openspec-explore/          # 探索代码库，澄清需求
│   ├── openspec-apply/            # 按 task 实现代码，支持断点续传
│   ├── openspec-verify/           # 验证实现一致性（completeness / correctness / coherence）
│   ├── openspec-archive/          # 归档完成的 change
│   └── openspec-debug/            # 调试 apply 阶段遇到的问题
│
└── commands/                      # 命令入口（触发对应 Skill）
    ├── opsx-propose.md            # /opsx-propose
    ├── opsx-meta-propose.md      # /opsx-meta-propose
    ├── opsx-change-index.md       # /opsx-change-index
    ├── opsx-explore.md            # /opsx-explore
    ├── opsx-apply.md              # /opsx-apply
    ├── opsx-verify.md             # /opsx-verify
    ├── opsx-archive.md            # /opsx-archive
    └── opsx-debug.md              # /opsx-debug
```

---

## 命令速查表

| 命令 | Skill | 阶段 | 作用 |
|------|-------|------|------|
| `/opsx-explore` | `openspec-explore` | 探索 | 扫描代码库结构，澄清需求，量化切换标准 |
| `/opsx-propose` | `openspec-propose` | 提案 | 创建 change，生成 repo-analysis / proposal / design / tasks |
| `/opsx-meta-propose` | `openspec-meta-propose` | 规划 | 解析专家规划，产出 change-index 拆分结果 |
| `/opsx-change-index` | `openspec-change-index` | 派生 | 从 change-index 批量创建子 change |
| `/opsx-apply` | `openspec-apply` | 实现 | 按 task 元数据执行代码，支持断点续传 |
| `/opsx-verify` | `openspec-verify` | 验证 | 检查 completeness / correctness / coherence |
| `/opsx-archive` | `openspec-archive` | 归档 | 最终检查后归档 change |
| `/opsx-debug` | `openspec-debug` | 调试 | 诊断错误，提供修复方案 |

---

## Change 生命周期

### 标准模式（单一 Change）

```
┌─────────────────────────────────────────────────────────┐
│  /opsx-explore                                             │
│  探索代码库 → 澄清需求 → 量化标准判断                      │
│  ↓ 条件成熟后                                              │
│  /opsx-propose                                             │
│  创建 change → 生成 artifacts                              │
│  ↓ 获得 task 清单                                           │
│  /opsx-apply                                               │
│  按 layer 优先级执行 → 增量验证 → 断点续传                  │
│  ↓ 遇到问题                                                 │
│  /opsx-debug                                               │
│  诊断 → 修复 → 继续 apply                                   │
│  ↓ 所有 task 完成                                           │
│  /opsx-verify                                              │
│  Completeness + Correctness + Coherence                   │
│  ↓ 全部通过                                                 │
│  /opsx-archive                                             │
│  Git 检查 → 最终确认 → 归档                                 │
└─────────────────────────────────────────────────────────┘
```

### 规划模式（Meta-change 驱动，适用于专家规划拆解）

当专家提供了长篇项目分析/重构规划时，使用 meta-change 流程：

```
┌─────────────────────────────────────────────────────────┐
│  /opsx-meta-propose                                      │
│  解析专家规划 → 全局 repo-analysis → 产出 change-index    │
│  ↓ 获得子 change 列表                                       │
│  /opsx-change-index                                      │
│  按优先级/依赖过滤 → 批量创建子 change                      │
│  ↓ 获得多个子 change                                        │
│  对每个子 change 循环：                                     │
│    /opsx-apply → /opsx-verify → /opsx-archive            │
│                                                         │
│  可选：/opsx-batch-apply（按依赖顺序批量执行）             │
└─────────────────────────────────────────────────────────┘
```

**适用场景：**
- 专家提供了重构规划文档
- 项目规模大，需要拆成多个独立的 change 并行推进
- 需要统一拆分原则和依赖关系
- 避免每个子 change 重复扫描代码库

---

## Layer 映射（影响层）

所有 change 的 task 和 artifacts 都需要标注影响层，用于增量验证和执行优先级判断。

| Layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |

**影响层判定规则：**
- 修改 `workflow-core` / `image-ops` / `node-definitions` → `engine`
- 修改 `dev-tool` → `editor`
- 修改 `user-app` → `runtime`
- 修改 `server` / `prisma` → `backend`
- 修改 `shared-ui` → `ui-skin`
- 跨 app 改动 → 必须包含 Architecture Review
- 涉及协议 / 数据迁移 → Architecture Review + Test Plan

---

## Task 元数据规范

每个 task 必须包含 `<!-- opsx-meta -->` HTML 注释块：

```html
<!-- opsx-meta
id: T1
layer: engine
risk: high
verify:
  - unit-tests
  - golden-fixture
files:
  - packages/workflow-core/src/executor.ts
  - packages/image-ops/src/ops/resize.ts
status: todo
-->
```

| 字段 | 取值 | 说明 |
|------|------|------|
| `id` | `T1`, `T2`, ... | 任务唯一标识 |
| `layer` | `engine` / `backend` / `editor` / `runtime` / `ui-skin` | 影响层 |
| `risk` | `low` / `medium` / `high` | 风险等级 |
| `verify` | `unit-tests` / `golden-fixture` / `api-tests` / `smoke-test` / `visual-check` | 验证方式 |
| `files` | 文件路径列表 | 本 task 会修改的文件 |
| `status` | `todo` / `in-progress` / `done` | 任务状态（用于断点续传） |

---

## 增量验证策略

不要每次改动都跑全量测试。根据 `<!-- opsx-meta -->` 中的 `files` 字段判断影响的 layer，执行针对性验证：

```
改动涉及哪些 layer？
│
├─ engine
│    └─ pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops --filter=@prism/node-definitions
│    └─ pnpm test --filter=@prism/workflow-core
│    └─ pnpm test --filter=@prism/image-ops
│
├─ backend
│    └─ pnpm typecheck --filter=@prism/server
│    └─ pnpm test --filter=@prism/server
│    └─ pnpm --filter=@prism/server exec prisma migrate status
│
├─ editor
│    └─ pnpm typecheck --filter=@prism/dev-tool
│    └─ pnpm build --filter=@prism/dev-tool --dry-run
│
├─ runtime
│    └─ pnpm typecheck --filter=@prism/user-app
│    └─ pnpm build --filter=@prism/user-app --dry-run
│
├─ ui-skin
│    └─ pnpm typecheck --filter=@prism/shared-ui
│
└─ 跨多个 layer 或无法判断
     └─ 全量验证：pnpm typecheck && pnpm test
```

**全量验证命令（保底）：**
```bash
pnpm typecheck
pnpm test
```

---

## 各 Skill 详解

### 1. `/opsx-explore` → `openspec-explore`

**作用：** 在正式创建 change 之前，探索代码库结构、澄清需求和未知问题。

**执行流程：**
1. 快速检查 OpenSpec 状态：`openspec list --json`
2. **结构分析优先**：扫描相关目录，生成 `## Impact Map`
3. 追问澄清问题，可视化现有架构（ASCII diagrams）
4. 量化判断是否具备切换到 propose 的条件

**切换到 propose 的量化标准：**

| 条件类型 | 必须满足（全部） | 强烈建议切换 | 可以考虑切换 |
|---------|----------------|-------------|-------------|
| 条件 | 核心问题有清晰技术理解 | 有 3+ unknowns 已被回答 | 有 1-2 个 unknowns |
|  | 改动范围标注到 layer 级别 | 已画出 1+ ASCII 架构图 | 用户说"差不多清楚了" |
|  | 用户明确表示要开始实现 | 可能影响其他 active change | 实验性想法需快速验证 |

**Guardrails：**
- 禁止在 explore 阶段实现代码
- 禁止跳过结构分析直接讨论方案
- 强制在进入 propose 前完成 repo analysis

---

### 2. `/opsx-propose` → `openspec-propose`

**作用：** 创建新的 change，自动生成所有 artifacts。

**执行流程：**
1. 从用户输入推断 change name（kebab-case）
2. 执行 `openspec new change "<name>"`
3. 按依赖顺序生成 artifacts：
   - **repo-analysis**（结构分析 + Impact Map）
   - **proposal**（Why / What Changes / Impact）
   - **design**（技术方案，含 Architecture Review 章节时需要）
   - **tasks**（带 `<!-- opsx-meta -->` 的任务清单，含 Test Plan 章节时需要）
4. 判断工作流模式：
   - **标准模式（Full Spec）**：完整流程
   - **MVP Draft 模式**：跳过 Architecture Review 和 Test Plan，快速验证
5. 如有已有代码改动，标注 `status: done` 并反映在 Impact Summary
6. 显示 `openspec status --change "<name>"`

**Guardrails：**
- 强制先完成 repo-analysis 再生成 proposal
- 禁止跳过 repo-analysis 直接脑补 proposal
- 强制每个 task 必须有 `<!-- opsx-meta -->` 块

---

### 3. `/opsx-meta-propose` → `openspec-meta-propose`

**作用：** 接收专家规划文档，做一次全局分析，产出 `change-index.md` 拆分结果。为后续批量派生子 change 奠定基础。

**与普通 propose 的区别：**

| 对比维度 | 普通 propose | meta-propose |
|---------|-------------|-------------|
| 目标 | 解决一个具体问题 | 将大规划拆成多个子 change |
| 产出 | 带 tasks 的 change | 带 change-index 的规划 change |
| tasks | implementation tasks | 拆分 + 依赖分析任务 |
| 后续 | 直接 apply | 从 change-index 批量派生子 change |

**执行流程：**
1. **接收输入**：外部文档路径 / 聊天粘贴的规划文本 / 项目扫描
2. **全局结构分析**（只做一次）：扫描所有模块，生成全局 `## Impact Map`，所有子 change 共享
3. **生成 4 个 artifacts**（不生成普通 tasks）：
   - **proposal.md**：规划总览 Why / What Changes / Impact
   - **repo-analysis.md**：全局结构分析结论（复用，不重复扫描）
   - **design.md**：拆分原则、切分维度、全局约束
   - **change-index.md**：候选子 change 列表 + depends_on + priority + risk
4. **推荐执行顺序**：按 Phase 分组（P0 先行，无依赖可并行）

**change-index.md 结构：**

```markdown
# Change Index

## C1 <change-name>
- **goal**: <一句话目标>
- **layer**: <engine / backend / editor / runtime / ui-skin>
- **depends_on**: <none / C2 / C3...>
- **priority**: <P0 / P1 / P2>
- **risk**: <low / medium / high>
- **scope**: <涉及哪些模块>
- **reason**: <为什么需要这个 change>
- **blocked_by**: <前置条件>
- **status**: <planned>
```

**切分维度判断原则：**

| 切分维度 | 触发条件 | 示例 |
|---------|---------|------|
| 按 layer | 改动分布在不同 app/package | dev-tool + user-app 分成两个 change |
| 按协议 | 涉及跨系统接口变更 | published workflow 协议单独成 change |
| 按依赖链 | A 是 B 的前置 | C1 先改 server schema，C2 再改 app |
| 按风险 | 高风险部分需隔离 | 数据库 schema 迁移单独成 change |
| 按原子性 | 可独立验证的最小单元 | 一个 node type 完整实现 |

**Guardrails：**
- 强制只做一次全局 repo-analysis，所有子 change 共享结论
- 强制生成 change-index.md 作为核心产出
- 禁止在 meta-propose 阶段生成 implementation tasks
- 强制 change-index 中每个子 change 必须包含 `depends_on`、`priority`、`reason`

---

### 4. `/opsx-change-index` → `openspec-change-index`

**作用：** 从 meta-change 的 `change-index.md` 批量派生子 change，按依赖拓扑顺序创建。

**前置条件：** 存在已完成的 meta-change，其下有 `change-index.md`。

**执行流程：**
1. 读取 `change-index.md`
2. 按条件过滤（`--all` / `--priority P0` / `--phase 1` / `--no-blocked` / `--skip C3`）
3. 拓扑排序（按 `depends_on` 确保依赖在前）
4. 检测循环依赖（有则报错）
5. 批量创建子 change：`openspec new change <name>`
6. 为每个子 change 生成标准 artifacts，复用 meta 的 repo-analysis
7. 显示创建摘要

**子 change tasks.md 中的 repo-analysis 引用：**

不重复做 repo-analysis，改为引用 meta-change 的分析结论：

```markdown
> **Repo Analysis**：见 [`<meta-change>/repo-analysis.md`](../<meta-change>/repo-analysis.md)
```

**Guardrails：**
- 强制按依赖拓扑顺序创建子 change
- 强制检测并报错循环依赖
- 禁止创建不在 change-index 中的 change
- 禁止在子 change 的 design.md 中违背 meta-change 的拆分原则

---

### 5. `/opsx-apply` → `openspec-apply`

**作用：** 实现 tasks.md 中的任务，支持断点续传和增量验证。

**执行流程：**
1. 选择 change：`openspec status --change "<name>" --json`
2. 获取任务列表：`openspec instructions apply --change "<name>" --json`（带 fallback 直接读 tasks.md）
3. 解析 `<!-- opsx-meta -->` 块
4. 过滤已完成的 task（`status: done` 或 `- [x]` → 跳过；`status: in-progress` → 询问继续还是重新开始）
5. **按 layer 优先级执行**：

   | 优先级 | Layer | 策略 |
   |-------|-------|------|
   | 1 | engine | 先跑测试，确保基础稳固 |
   | 2 | backend | 先验证 Prisma schema 兼容性 |
   | 3 | editor | 后执行 |
   | 4 | runtime | 后执行 |
   | 5 | ui-skin | 最后执行 |

6. 增量验证（根据 `files` 字段判断验证范围，不跑全量）
7. 每个 task 完成后更新状态
8. 失败时转交 `openspec-debug`

**大 task 拆分原则：** 预判需改 5+ 文件或跨 3+ 子模块时，拆分为 T1a / T1b / T1c 等独立子 task。

**Guardrails：**
- 禁止在 apply 阶段探索代码库
- 禁止跳过 verify（每个 task 完成后必须验证）
- 禁止用关键词判断任务类型，改为解析 task 元数据
- 禁止忽略 layer 优先级
- 强制失败时转 debug skill

---

### 6. `/opsx-verify` → `openspec-verify`

**作用：** 系统性检查 change 的实现一致性。只做检查，不做修复。

**职责边界：**
```
apply 负责：执行 + 增量验证
verify 负责：Completeness + Correctness + Coherence
              ↓
        发现问题 → 返回 apply 修复 → 重新 verify
```

**执行流程：**

**Completeness 检查：**
- 所有 task 都是 `- [x]` 或 `status: done`
- architecture-review 章节已填写（当需要时）
- test-plan 章节已填写（当需要时）
- 所有 `<!-- opsx-meta -->` 中声明的 `files` 都有实际改动

**Correctness 检查：**
- 按 layer 聚合所有 task 的 `files` 字段
- 执行增量验证（不跑全量）
- 验证类型检查通过 + 相关 layer 测试通过

**Coherence 检查（实现与设计一致）：**
- Step 1：对照 design.md 的每个技术决策，读取对应文件验证是否落地
- Step 2：对照 tasks.md 的 Test Plan，验证每个测试用例都有对应测试文件
- Step 3：检查边界值测试（空输入、极大图片、循环依赖等）

**输出格式：**
```
## Verify Result

| 检查项       | 状态  | 详情                             |
|-------------|-------|----------------------------------|
| Completeness | ✓/✗   | N/N tasks done, N/N artifacts   |
| Correctness  | ✓/✗   | N/N layers passed, N errors     |
| Coherence    | ✓/✗   | N/N design decisions matched    |

发现的问题：
1. [Correctness] T2: test 失败...
2. [Coherence] T5: design.md 承诺...但实现中未见...
3. [Completeness] T7: architecture-review 章节缺失...

下一步：
- 全部通过 → 可以 archive
- 有问题 → 转回 apply 修复，修复后重新 verify
```

**Guardrails：**
- 强制在 archive 前执行 verify
- 禁止跳过 verify 直接 archive
- 禁止在 verify 阶段修复代码，只负责发现问题

---

### 7. `/opsx-archive` → `openspec-archive`

**作用：** 归档已完成的 change，调用官方 CLI 并做最终检查。

**执行流程：**
1. 检查完成状态：`openspec status --change "<name>" --json`
2. Git 工作区检查：`git status`（未提交的代码应先 commit）
3. 执行最终检查清单：

   ```
   最终检查清单 — <change-name>
   │
   ├─ [ ] Completeness：tasks.md 所有 task 都是 - [x] 或 status: done
   ├─ [ ] Completeness：architecture-review 章节已填写（当需要时）
   ├─ [ ] Completeness：test-plan 章节已填写（当需要时）
   ├─ [ ] Correctness：相关 layer 的测试全部通过
   ├─ [ ] Coherence：design.md 的每个技术决策都有对应实现
   ├─ [ ] Git：工作区干净，无未提交的代码
   ├─ [ ] No Secrets：没有 .env 或凭据混入 change
   └─ [ ] User Confirm：用户确认上述检查结果
   ```

4. 提示确认（如有未完成任务）
5. 调用官方 CLI：`openspec archive --change <name> --yes`
6. 显示归档摘要

**Guardrails：**
- 禁止手搓 `mkdir` + `mv` 命令
- 强制使用官方 `openspec archive` 命令
- 强制无 git commit 时提示用户先 commit 再归档

---

### 8. `/opsx-debug` → `openspec-debug`

**作用：** 调试 apply 阶段遇到的问题，提供诊断和修复方案。

**执行流程（优先级排序）：**

**Step 1：项目输出优先** — 先读取 `pnpm test` / `pnpm typecheck` / `pnpm build` 输出，不要上来就检查环境。

常见错误分类：

| 错误关键词 | 最可能原因 | 第一步检查 |
|-----------|-----------|-----------|
| `Cannot find module '@prisma/client'` | Prisma Client 未生成 | `pnpm --filter=@prism/server exec prisma generate` |
| `Type error: ... is not assignable` | TypeScript 类型不匹配 | `pnpm typecheck` 查看具体文件和行号 |
| `expect(received).toEqual(expected)` | 像素级测试 regression | 对比 test fixture 和实际输出 |
| `Cannot read properties of undefined` | 运行时 null 访问 | 读取相关代码，检查数据流 |
| `Validation error` | Prisma schema 与 DB 不同步 | Prisma 环境诊断步骤 |
| `ENOENT: no such file or directory` | 文件路径问题 | 检查 working directory |

**Step 2：分析相关代码** — 根据错误类型读取相关文件和 `<!-- opsx-meta -->` 中的 `files` 字段。

**Step 3：环境诊断**（仅当项目输出无法定位问题，或涉及 Prisma / 数据库时）：

```
Step 3.1: Prisma Client 生成状态
├─ ls server/node_modules/.prisma/client/
│    └─ 如缺失 → pnpm --filter=@prism/server exec prisma generate

Step 3.2: 数据库文件存在性
├─ ls server/prisma/*.db
│    └─ 如缺失 → pnpm --filter=@prism/server exec prisma migrate dev

Step 3.3: Migration 同步状态
├─ pnpm --filter=@prism/server exec prisma migrate status
│    └─ 如有 pending → pnpm --filter=@prism/server exec prisma migrate deploy

Step 3.4: .env 环境变量
├─ cat server/.env
│    └─ 缺失或 DATABASE_URL 错误 → 修复 .env

Step 3.5: 基础运行时环境
├─ node --version / pnpm --version
└─ pnpm install --dry-run（检查依赖完整性）
```

**Step 4：给出修复方案** — 包含精确的文件 + 行号 + 命令 + 风险提示。

**Guardrails：**
- 禁止跳过项目输出直接环境诊断
- 禁止写死 Windows-only 命令
- 强制先读取 test/typecheck 输出再分析代码
- 强制诊断完成后报告根因 + 修复方案 + 验证命令

---

## Prisma / 数据库环境检查

当遇到 Prisma 相关错误时，执行以下诊断：

```bash
# 检查 Prisma Client 是否已生成
ls server/node_modules/.prisma/client/

# 检查数据库文件是否存在
ls server/prisma/*.db

# 检查 Prisma schema 是否同步
pnpm --filter=@prism/server exec prisma migrate status

# 重新生成 Prisma Client（如遇类型错误）
pnpm --filter=@prism/server exec prisma generate

# 环境变量检查
cat server/.env
```

常见数据库问题：

| 症状 | 诊断命令 | 修复方案 |
|------|----------|----------|
| `Cannot find module '@prisma/client'` | `prisma generate` | 重新生成 Prisma Client |
| `Can't open database` | `ls server/prisma/*.db` | 运行 `prisma migrate dev` |
| `Migration missing` | `prisma migrate status` | 确认 migration 历史一致 |
| `.env` 缺失 | `cat server/.env` | 复制 `.env.example` 并填写变量 |

---

## 工作流模式

| 模式 | 适用场景 | 流程 |
|------|---------|------|
| **标准模式（Full Spec）** | 用户有明确需求、有充足时间、从零开始 | explore → propose（完整 artifacts）→ apply → verify → archive |
| **MVP Draft 模式** | 小型实验性变更、用户只想快速验证想法、已有部分代码 | propose（跳过 Architecture Review 和 Test Plan）→ apply（逐步补充）→ verify → archive |
| **规划模式（Meta-change）** | 专家提供了长篇项目分析/重构规划，需拆成多个子 change 并行推进 | meta-propose（全局分析 + change-index）→ change-index（批量派生）→ 对每子 change：apply → verify → archive |

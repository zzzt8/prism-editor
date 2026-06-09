# .cursor 目录说明

> **v4.0 变更：** 在 OpenSpec 主流程上增加 ECC Bridge 与 lane skills；`opsx-meta` 新增 `task_type`，优先驱动 apply / verify 阶段的稳定自动路由。

---

## 目录结构

```
.cursor/
├── skills/                        # Skill 定义文件（AI 执行逻辑）
│   ├── _shared/
│   │   ├── SHARED-LAYERS.md       # 共享层：layer 映射、验证命令
│   │   ├── SKILL-INDEX.md         # 自动生成的 Skill 索引
│   │   └── SKILL-SCHEMA.md        # 元数据 Schema 定义
│   ├── openspec-explore/          # 探索代码库，澄清需求
│   ├── openspec-propose/          # 创建 change，生成 artifacts
│   ├── openspec-apply/            # 按 task 实现代码，断点续传基于 checkbox
│   ├── openspec-verify/           # 验证实现一致性（Full + coherence-lite）
│   ├── openspec-archive/          # 归档完成的 change
│   ├── ecc-openspec-bridge/       # OpenSpec → ECC lane 路由层
│   ├── ecc-api-design/            # API / schema / contract lane
│   ├── ecc-tdd-workflow/          # 测试优先 / feature lane
│   └── ecc-build-error-resolver/  # build / typecheck / lint / CI 修复 lane
│
├── commands/                      # 命令入口（触发对应 Skill）
│   ├── opsx-*.md                  # OpenSpec 与 OpenSpec+ECC 命令
│   └── ecc-*.md                   # 手动 lane 命令
│
├── rules/                         # 项目本地 Cursor 规则
├── scripts/                       # 本地 hook / helper 脚本
└── hooks.json                     # Cursor hooks 注册
```

---

## 命令速查表（v4.0）

| 命令 | Skill | 阶段 | 作用 |
|------|-------|------|------|
| `/opsx-explore` | `openspec-explore` | 探索 | 扫描代码库结构，澄清需求，量化切换标准 |
| `/opsx-propose` | `openspec-propose` | 提案 | 创建 change，生成 artifacts；change_class 推断触发 review/测试模板；支持 change-splitting |
| `/opsx-apply` | `openspec-apply` | 实现 | 按 layer 优先级执行 task，断点续传基于 checkbox；内置 failure-handling 诊断 |
| `/opsx-ecc-apply` | `openspec-apply` + `ecc-openspec-bridge` | 实现 | 在 OpenSpec apply 之上，为每个 task 按 `task_type` 自动匹配 ECC 专业 SOP lane |
| `/opsx-verify` | `openspec-verify` | 验证 | Full 验证 + coherence-lite checklist |
| `/opsx-ecc-verify` | `openspec-verify` + `ecc-openspec-bridge` | 验证 | Full 验证之外，追加 ECC review / failure attribution lanes |
| `/opsx-archive` | `openspec-archive` | 归档 | 最终确认后归档 change |
| `/ecc-api-design` | `ecc-api-design` | 实现 | 手动执行 API / schema / contract lane |
| `/ecc-tdd-workflow` | `ecc-tdd-workflow` | 实现 | 手动执行测试优先 / feature lane |
| `/ecc-build-error-resolver` | `ecc-build-error-resolver` | 调试 | 手动执行 build / typecheck / lint / CI 修复 lane |

---

## Task 元数据升级

`tasks.md` 中的 `opsx-meta` 从 v4.0 开始推荐显式写 `task_type`：

```html
<!-- opsx-meta
id: T2
layer: backend
task_type: api-design | tdd
verify:
  - typecheck
  - api-tests
dependencies:
  - type: task
    refs: ["T1"]
-->
```

规则：
- `task_type` 第一项为主 lane
- 其余项为辅助 lane
- 未显式填写时，`ecc-openspec-bridge` 才使用 fallback 推断

---

## Change 生命周期

### 标准路径

```
/opsx-explore
  ↓
/opsx-propose
  ↓
/opsx-apply 或 /opsx-ecc-apply
  ↓
/opsx-verify 或 /opsx-ecc-verify
  ↓
/opsx-archive
```

### ECC 增强路径

```
OpenSpec 负责：change / proposal / design / tasks / acceptance boundary
ECC 负责：apply / verify 阶段的专业 SOP、lane 路由、故障归因
```

---

## Layer 映射

| Layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |
| `meta` | `.cursor/skills/` | OpenSpec / ECC workflow 元层 |

**执行优先级：** `engine > backend > editor > runtime > ui-skin > meta`

---

## OpenSpec 与 ECC 的关系

- **OpenSpec 是主流程**：管理 change、proposal、design、tasks、verify、archive
- **ECC 是增强层**：只增强 apply / verify，不替代 proposal artifacts
- **`task_type` 是路由锚点**：优先按 `task_type` 路由，减少模糊关键词猜测
- **lane skills 是闭环**：`ecc-api-design`、`ecc-tdd-workflow`、`ecc-build-error-resolver` 已可独立执行

---

## 使用建议

- 新建或维护 `tasks.md` 时，优先显式填写 `task_type`
- 复杂任务直接用 `/opsx-ecc-apply <change-name>`
- full verify 想要附加故障归因与 review lane 时，用 `/opsx-ecc-verify <change-name>`
- 想单独执行某个专业 lane 时，用 `/ecc-api-design`、`/ecc-tdd-workflow`、`/ecc-build-error-resolver`

# Proposal: 架构收敛

## Why

Prism Editor 当前已搭建出"浏览器原生的图像工作流产品骨架"，具备前端工作流内核、类型系统、UI、版本管理、发布流程和自定义节点支持。但核心问题不是功能不够，而是**架构收敛尚未完成**——"唯一真源、状态边界、发布协议、存储策略"没有彻底统一，导致以下症状：

1. **存储边界分裂**：dev-tool 用 LocalStorage/IndexedDB，user-app 用另一个 IndexedDBStorageAdapter，而 server 已有 Workflow/WorkflowVersion/PublishedWorkflow 完整 CRUD。
2. **canvasStore.ts 膨胀**：1073 行，同时承担画布状态、自动保存、导入导出、执行、动态端口等职责，是典型的"总控器"反模式。
3. **publishedStore.ts 职责耦合**：加载、选择、运行态、节点包加载、executor 解析全混在一起。
4. **保存/发布/版本化的数据流未统一**：saveWorkflow() 里"算新版本"和"保存旧版本字段"分离；发布按钮仍有 setTimeout(..., 800) 的假 loading。
5. **PublishedWorkflowExecutor 同时兼容 legacy pw.inputs[] 和 v2 config.inputs[]**：说明协议仍在演化，未稳定。
6. **文档漂移**：server/README 写 PostgreSQL 示例，实际是 SQLite。

这些问题积少成多，会制约项目继续成长为"平台"。

## What Changes

本次规划不新增功能，而是对现有架构做**收敛性重构**，分为 4 个域：

| 域 | 职责 | 目标文件 |
|---|---|---|
| **编辑器域** (editor) | 画布编辑、编辑态状态 | `apps/dev-tool/src/modules/editor/stores/*.ts` |
| **持久化/发布域** (editor+backend) | 保存、版本、发布、导入导出、唯一真源映射 | `apps/dev-tool/src/modules/repositories/*.ts` |
| **运行时域** (runtime) | 加载发布物、装载节点包、执行 | `apps/user-app/src/modules/*/` |
| **共享内核** (engine) | 执行引擎、类型、节点注册、图像算子 | `packages/workflow-core/`, `packages/core/` |

迁移顺序（Phase 0 → 6）：
- Phase 0：冻结契约，定义 EditorDraft / StoredWorkflow / PublishedWorkflowV2 三个唯一真源
- Phase 1：收口持久化边界，引入 Repository 层
- Phase 2：拆 canvasStore.ts 为 Zustand slices
- Phase 3：把版本号和发布流程从前端 UI 中移除，服务端生成版本号
- Phase 4：收紧 PublishedWorkflow 协议，统一输出 V2
- Phase 5：把自定义节点加载从 store 中移出，上安全边界
- Phase 6：最后做 Worker 化和性能层

## Impact Summary

### 直接影响（改动范围）

| 模块 | Layer | 影响 |
|------|-------|------|
| `apps/dev-tool/src/store/canvasStore.ts` | editor | 从 1073 行拆成 5 个 slice + 1 个组合器 |
| `apps/dev-tool/src/store/workflowStore.ts` | editor | 改用 Repository 层 |
| `apps/user-app/src/store/publishedStore.ts` | runtime | 拆成 catalog / selection / node-runtime / runner 四个 store |
| `server/prisma/schema.prisma` | backend | Schema 已有正确模型，后续迁移 API adapter |
| `packages/workflow-core/src/published-executor.ts` | engine | 移除 legacy 兼容，统一 V2 |

### 间接影响（契约变更）

| 契约 | 变更 |
|------|------|
| Workflow / PublishedWorkflow / WorkflowVersion 映射关系 | 统一为唯一 mapper，无散在转换逻辑 |
| 存储层 | 所有 app 层只调 Repository，Repository 内部包 adapter |
| 版本号生成 | 前端不再自增，服务端生成 |
| PublishedWorkflow 协议 | 只写 V2，runtime 保留 legacy 读兼容 |

### 全局约束

1. **Phase 0 必须先完成**：契约不稳定时拆组件会导致"能编辑、不能发布"或"能发布、不能运行"回归
2. **Server schema 先于 app 改**：跨层协议改动必须 architecture-review
3. **Golden fixtures**：重构前后用 5~10 个代表性 workflow 做 round-trip snapshot 测试

## 拆分背景

为什么需要多个 change 而不是一个：

1. **依赖链**：Phase 0 → Phase 1 → Phase 2，不能跳步
2. **风险隔离**：Phase 4（协议收紧）和 Phase 5（节点安全）是高风险改动，必须单独成 change
3. **按 layer 执行**：engine > backend > editor > runtime > ui-skin，不同 layer 可并行验证
4. **团队/职责边界**：Repository 层改 dev-tool，自定义节点加载改 user-app，协议改 packages/shared-types

详见 `change-index.md`。
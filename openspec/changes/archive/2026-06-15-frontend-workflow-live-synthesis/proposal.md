# proposal: frontend-workflow-live-synthesis

**change_class: high**

reason: 触及 `useCanvasStore`（Zustand store）与 `executionService` 的执行触发逻辑，并在 `WorkflowHeader` 增加 Live 状态指示。需新增响应式调度、平台分支、防抖、Abort 取消链路，会改变 dev-tool 内 frontend 工作流的执行模型，跨多文件、多 slice，属于 high class。

---

## Task Anchor Echo

- **原始任务**：现在 dev-tool 里面的 frontend 工作流可以做到实时合成了吗？需求：Frontend 工作流支持实时执行，Backend 工作流保持手动执行
- **change 名称**：`frontend-workflow-live-synthesis`
- **change 名称是否服务于原始任务**：是
- **约束/非目标追加（来自用户）**：
  - [x] 本需求只针对 frontend 工作流
  - [x] 不做 AI 推理、服务端任务、长耗时计算
  - [x] 不做 backend 工作流实时化
  - [x] 不影响现有工作流保存、发布和 user-app 使用逻辑
  - [x] frontend 工作流中可保留"执行"按钮，但实时预览不应依赖该按钮
  - [x] backend 工作流继续保留"点击执行"交互方式
  - [x] 实现方向不要求完整重构，可在现有架构基础上选择合适方式（自动触发、局部更新、缓存或防抖）

## Why

dev-tool 内 frontend 工作流（`workflowMeta.targetPlatform === 'browser'`）当前是"必须点 Execute 按钮"的手动模式：

- 输入图片变化（拖拽替换 LoadImage）后，预览不刷新
- 参数变化（composite opacity、blendMode、overlayX/Y、mask 配置等）后，预览不刷新
- 用户必须显式点击 `WorkflowHeader` 的 "Execute" 按钮才能看到结果

这与 frontend 工作流的"轻量实时合成"场景不符。backend 工作流（`targetPlatform === 'nodejs'`）保持现状不变——仍由用户手动触发，且 user-app 的执行入口也不动。

`packages/workflow-core` 的 `WorkflowExecutor` 已是纯函数式无状态调用，缓存机制完备，frontend 实时合成本质是"上层增加反应式调度"，**无需改动 engine 层或 capability 层**。

## What Changes

1. **`apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`**
   - 新增反应式执行触发器（store subscription / middleware）
   - 监听 frontend 工作流的"输入/参数变化"，防抖 200ms 后自动调用既有 `executeWorkflow()`
   - 防抖期内新一次触发取消（abort）上一次未完成的执行
   - 实时模式不写 ExecutionLog（避免噪声；现有 `_currentLog` 路径有条件跳过）

2. **`apps/dev-tool/src/modules/editor/services/executionService.ts`**
   - 增加"按平台分支"逻辑：执行前检查 `workflowMeta.targetPlatform`
   - frontend 平台走轻量路径（保留 `DEFAULT_LANE_CONFIG`，`enableWorkerLane: true` 不变）
   - 新增 `liveAutoExecute` 选项（与显式 `Execute` 按钮复用同一执行体，但标识来源）
   - 不改动 `WorkflowExecutor` 接口签名

3. **`apps/dev-tool/src/components/header/WorkflowHeader.tsx`**
   - Execute 按钮文案在 frontend 模式下变为"重跑"（语义），在 running 状态仍为"停止"
   - 标题旁增加 Live 状态指示器（仅 frontend 工作流显示）
     - idle：灰点
     - debouncing：黄色"Live · 等待稳定中"
     - running：紫色脉冲"Live · 合成中…"
   - backend 工作流不显示 Live 指示器，按钮文案保持"Execute"

4. **`apps/dev-tool/src/modules/editor/stores/appStore.ts`**（如不存在则新增到合适位置）
   - 新增 `livePreviewEnabled: boolean`（默认 `true`）
   - 新增 `livePreviewDebounceMs: number`（默认 `200`，可被 settings 覆盖）
   - 用户可在 SettingsPage 关闭 Live Preview（性能敏感场景）

5. **`apps/dev-tool/src/pages/SettingsPage.tsx`**（如已存在）
   - 增加"Live Preview"开关与防抖时长输入

## Capabilities

### Modified Capabilities

- `frontend-workflow-execution`：从"手动触发"升级为"输入/参数变化自动触发 + 仍支持手动重跑"
- `backend-workflow-execution`：保持现状，手动触发
- `execution-cancellation`：防抖期内的上一次执行必须被 abort（基于既有 `_executionAbort` 机制）
- `execution-status-indicator`：增加 Live 状态指示

## Impact

| layer | 影响 |
|-------|------|
| `apps/dev-tool` (Application) | `useCanvasStore`、`executionService`、`WorkflowHeader`、可选 `SettingsPage` |
| `apps/user-app` | **无**（实时化仅在 dev-tool 内启用） |
| `apps/dev-tool/server` (publish) | **无**（不影响发布协议与后端存储） |
| `packages/workflow-core` (Engine) | **无**（`WorkflowExecutor` 接口不变，行为不变） |
| `packages/image-ops` (Capability) | **无**（composite/transform/apply-mask 节点已支持纯前端执行） |
| `packages/shared-types` | **无**（`targetPlatform` 字段已存在） |

跨包接口：零变更。Node schema：零变更。Prisma schema：零变更。PublishedWorkflow 协议：零变更。

## Out of Scope

- ❌ backend (`targetPlatform === 'nodejs'`) 工作流实时化
- ❌ user-app 内实时合成（保持显式 Run 入口）
- ❌ 实时执行写 ExecutionLog（实时模式不写，避免噪声）
- ❌ AI 推理、worker 强制、lane 改写
- ❌ PublishDialog / 发布协议变更
- ❌ 部分重算 / 脏节点追踪（依赖既有"全工作流重跑 + LRU 缓存"足够）
- ❌ 修改 `WorkflowExecutor` 接口
- ❌ 修改 `Workflow` / `WorkflowMetadata` / `EditorWorkflowMeta` 的类型
- ❌ 修改 composite / transform / apply-mask 等节点的 executor 实现
- ❌ 修改 NewWorkflowModal 的 targetPlatform Radio（已经存在，不重做）

---

## 质量与测试规范要求

本需求严格遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 本需求的执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | 沿用 `WorkflowExecutor` |
| 节点级错误隔离 | 否 | 沿用既有 per-node try/catch |
| Cancellation 完整性 | **是** | 防抖期 abort 上一次执行；需 E2E 验证 |
| Canvas 状态一致性 | **是** | `executionResult` / `_executionStatus` 切换期间不能出现脏读 |
| Node Registry 不变量 | 否 | `globalRegistry` 不变 |
| API 契约稳定性 | 否 | 无 API 变更 |
| Node Package 安全 | 否 | 无新包 |
| 交互完整性 | **是** | 防抖/取消/重跑/重入四个交互路径需单测覆盖 |

### 验收要求

- [ ] 本需求已覆盖所有涉及的质量检查维度
- [ ] 新增执行触发路径包含 abort 旧 controller（与 FIX-4 同行要求）
- [ ] 涉及取消/状态机的逻辑已规划测试方案

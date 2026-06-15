# design: frontend-workflow-live-synthesis

## Goals

1. frontend (`targetPlatform === 'browser'`) 工作流实现反应式合成：输入图片变化或节点参数变化后，结果自动更新
2. backend (`targetPlatform === 'nodejs'`) 工作流保持手动执行，行为完全不变
3. 不改动 `WorkflowExecutor` 接口、不改动 image-ops 执行器、不改动发布协议、不影响 user-app
4. 实时模式与显式 Execute 按钮复用同一执行体，UX 上提供 Live 状态指示
5. 防抖期内新一次触发 abort 上一次执行，避免队列堆积
6. 实时模式不写 ExecutionLog（避免噪声），保持日志语义聚焦"显式执行"
7. 提供可关闭的开关（settings）和可配的防抖时长，作为性能敏感场景的安全阀

## Non-Goals

- ❌ 不做部分重算（依赖全工作流重跑 + `WorkflowExecutor` 既有 LRU 缓存）
- ❌ 不改 backend 工作流行为
- ❌ 不改 user-app 行为
- ❌ 不动 published protocol / Prisma schema / 节点 schema
- ❌ 不动 `WorkflowExecutor` 接口签名
- ❌ 不引入新的状态管理库（沿用 Zustand）
- ❌ 不引入新的执行后端（Web Worker / OffscreenCanvas 等）

---

## Architecture Review

### 当前架构（节选与本 change 相关部分）

```
┌──────────────────────────────────────────────────────────────────┐
│  WorkflowHeader (button click)                                    │
│      │                                                             │
│      │ handleExecute()                                             │
│      ▼                                                             │
│  useCanvasStore.executeWorkflow()                                 │
│      │                                                             │
│      ├─ _currentLog = start ExecutionLog                           │
│      ├─ set state._executionStatus = 'running'                     │
│      ├─ _executionAbort?.()   ← abort 旧 controller               │
│      ├─ new AbortController()                                      │
│      └─ executionService.execute(workflowMeta, nodes, edges, opts) │
│              │                                                     │
│              ▼                                                     │
│      WorkflowExecutor.execute(_workflow, { signal, onProgress })   │
│              │                                                     │
│              ├─ topological sort                                   │
│              ├─ per node: executor (composite/transform/apply...)  │
│              ├─ laneConfig: main-thread | worker                    │
│              └─ LRU cache (workflowId:nodeId:inputsHash)           │
│              │                                                     │
│              ▼                                                     │
│      node.data.executionResult ← set by progressCallback          │
│              │                                                     │
│              ▼                                                     │
│      PreviewPanel (subscribes node.data.executionResult)           │
└──────────────────────────────────────────────────────────────────┘

输入/参数变化路径（无执行触发）：
ParametersPanel.handleChange → updateNodeParams → set({ nodes }) + _triggerAutoSave
useCanvasDragDrop           → updateNodeParams → set({ nodes }) + _triggerAutoSave
onNodesChange (position)    → set({ nodes })  + _triggerAutoSave
```

**关键事实**：
1. 唯一执行入口是 `executeWorkflow()`，由 `WorkflowHeader` 按钮触发
2. 输入/参数变化路径**只更新 nodes + autosave**，不触发执行
3. `WorkflowExecutor` 已是纯函数调用，可任意次数调用
4. 既有 `_executionAbort` 机制已经支持 abort 旧执行（见 `useCanvasStore.ts:975-977`）
5. 既有 LRU 缓存可避免重复计算（同一 input hash 直接命中）

### 目标架构（增加的反应式调度）

```
┌──────────────────────────────────────────────────────────────────┐
│  Trigger sources:                                                  │
│    ParametersPanel.handleChange ─┐                                │
│    useCanvasDragDrop            ─┤                                │
│    onNodesChange (position)     ─┤                                │
│                                  │                                │
│                                  ▼                                │
│                       graphSlice mutation                         │
│                       (updateNodeParams/Position)                 │
│                                  │                                │
│                                  ▼                                │
│       ┌─────────────────────────────────────────────────┐         │
│       │  useCanvasStore middleware/subscription         │         │
│       │  (新增)                                          │         │
│       │  • 判定 platform === 'browser'                   │         │
│       │  • 判定 livePreviewEnabled === true             │         │
│       │  • debounce(livePreviewDebounceMs)              │         │
│       │  • 期间内新触发 → clearTimer + abort prev        │         │
│       │  • 触发 executeWorkflow({ source: 'live' })     │         │
│       └─────────────────────────────────────────────────┘         │
│                                  │                                │
│                                  ▼                                │
│       useCanvasStore.executeWorkflow(opts)                       │
│       • _currentLog = start (if source !== 'live')                │
│       • abort prev, new AbortController                           │
│       • executionService.execute(...)                              │
│                                  │                                │
│                                  ▼                                │
│       executionService.execute                                    │
│       • 加 platform 分支 (frontend 后端路径一致，不切路径)        │
│       • 透传 WorkflowExecutor.execute                            │
│                                  ▼                                │
│       node.data.executionResult → PreviewPanel                    │
└──────────────────────────────────────────────────────────────────┘
```

### 候选方案

#### 方案 A：Zustand 中间件 + 防抖调度（推荐）

**做法**：在 `useCanvasStore` 内挂一个 subscription，订阅 `nodes` 数组浅变化 + `workflowMeta.targetPlatform` 变化，debounce 200ms 后调用 `executeWorkflow({ source: 'live' })`。

**Pros**：
- 改动局部（仅 dev-tool 内 4 个文件）
- 完全复用既有 `executeWorkflow()` 入口
- 自动享受 `_executionAbort` 取消机制
- 自动享受 LRU 缓存
- 不改 `WorkflowExecutor` 接口

**Cons**：
- 需要小心 selector 引用稳定性（避免每帧 setState 都触发）
- 防抖期内的取消语义需要测试覆盖

#### 方案 B：useEffect 监听 nodes

**做法**：在 `EditorPage` 加一个 `useEffect`，依赖 `nodes` + `targetPlatform`，debounce 后调用 `executeWorkflow()`。

**Pros**：
- 实现简单
- React 生命周期内自然清理

**Cons**：
- `EditorPage` 是路由层组件，与 store 解耦不够干净
- `useEffect` 难以精确控制"什么变化触发"，selector 不稳定
- 取消语义需要手动管 timer

#### 方案 C：改造 `executeWorkflow` 让其在 frontend 模式下自驱动

**做法**：在 `executeWorkflow()` 内部挂"自动重跑" flag，每次执行完成后 200ms 内如有 dirty 节点则自动再跑。

**Pros**：
- 概念统一（一个"执行循环"）

**Cons**：
- 与既有"显式触发"模型耦合
- 难以在外部关停
- dirty 追踪本身又是一个新机制

### 决策

采用**方案 A**：Zustand subscription + 防抖调度。

**理由**：
1. 改动可控：仅在 dev-tool Application 层，不跨包
2. 复用既有执行栈：cancellation、progress、preview、cache 都自然继承
3. 易于关闭：subscription 内部读 `livePreviewEnabled` 即可
4. 易测试：store mutation → timer → execute 三段都可单元测

### 防抖与取消语义

```
T0: 用户开始拖动 composite.opacity 滑块
T0   updateNodeParams({ opacity: 0.5 })
T0+1 updateNodeParams({ opacity: 0.55 })
T0+2 updateNodeParams({ opacity: 0.6 })
    ...
T0+200ms (debounce 结束)
    → executeWorkflow({ source: 'live' })
    → abort old controller (if any running)
    → new AbortController
    → WorkflowExecutor.execute

T0+250ms 用户继续拖动 → opacity: 0.65
    → if previous still running: abort + restart with new params
    → else: debounce again 200ms
```

**关键不变量**：
- 同一时间最多一个 frontend 实时执行在跑
- backend 实时执行永远不发生（subscription 内部判定 platform）
- 显式 Execute 按钮与实时执行互斥（按钮按下时 disable live re-trigger；或 live re-trigger 仅在 `_executionStatus === 'idle' | 'done' | 'error' | 'cancelled'` 时才触发）
- Live 状态指示器与 `_executionStatus` 解耦（live 包含"debouncing 等待中"和"running"两种状态）

### 状态机

```
LivePreview FSM (frontend workflow only):

  idle ──(params changed)──► debouncing
  debouncing ──(more changes)──► debouncing (reset timer)
  debouncing ──(timer fires)──► running
  running ──(done|error|cancelled)──► idle
  running ──(params changed during running)──► abort → debouncing

  ※ 当 _executionStatus 已是 'running' (来自按钮) 时：
    - live subscription 检测 status 已是 running → 跳过 debouncing，不抢控制权
    - 显式按钮按下后，live 仍可在按钮执行完成后再触发
```

### 触发源与 sink 的对照

| Source | Path | Live trigger? |
|--------|------|---------------|
| ParametersPanel text/number/select input | `updateNodeParams` | ✅ |
| ParametersPanel image-file upload | `updateNodeParams` | ✅ |
| useCanvasDragDrop (image replace) | `updateNodeParams` | ✅ |
| onNodesChange (position change) | `set({ nodes })` | ❌（不触发实时）— 节点位置不直接进入 composite 输入；如 composite 有 overlayX/overlayY 参数，变化会走 updateNodeParams 路径被覆盖 |
| addNode / removeNode / onConnect | `set({ nodes/edges })` | ❌（结构性变化不适合实时） |
| 显式 Execute 按钮 | `handleExecute` → `executeWorkflow({ source: 'manual' })` | n/a（不通过 live 路径） |

> **澄清**：composite 节点的位置相关参数（overlayX、overlayY）在定义中属于 `params` 字段（`compositeDefinition.params`），UI 上是 inspector 中的 number input/slider，调它们会走 `updateNodeParams`，**已被覆盖**。React Flow 的 `node.position` 是 canvas 视图位置，**不**影响合成结果（composite 用 params 决定位置，不读 node.position）。

---

## Decisions

### D1: 防抖时长默认 200ms

**Decision**：默认 200ms，可在 SettingsPage 调整为 0-1000ms。

**Rationale**：
- 与滑块/输入框的用户习惯一致（200ms 内认为是"同一个动作"）
- LRU 缓存保证：debounce 期间多次 update 不会触发多次执行
- 200ms 兼顾"实时感"与"性能"

### D2: 实时执行不写 ExecutionLog

**Decision**：实时执行（`source === 'live'`）跳过 `_currentLog` 初始化和写入。

**Rationale**：
- 用户主要关心"显式执行的日志"用于回溯
- 实时执行一秒可能触发几十次，写日志会产生大量噪声
- 节点状态可视化（running pulse、done green border）已有，对调试足够

### D3: 实时执行可被用户关闭

**Decision**：`useAppStore.livePreviewEnabled: boolean`（默认 `true`），SettingsPage 提供开关。

**Rationale**：
- 性能敏感场景（低配设备、超大图）下可关闭
- 关闭后行为完全等同改造前
- 不影响 backend 工作流

### D4: Execute 按钮在 frontend 模式下保留，文案变为"重跑"

**Decision**：保留按钮，文案动态化（`targetPlatform === 'browser' ? '重跑' : 'Execute'`），行为不变。

**Rationale**：
- 用户明确要求"frontend 工作流中可保留'执行'按钮"
- "重跑" 表达"跳过防抖立即执行"的语义
- 不破坏既有快捷键、UI 布局

### D5: Live 状态指示器位置

**Decision**：放在 `WorkflowHeader` 标题旁（与 save badge 同位置策略），仅 frontend 工作流显示。

**Rationale**：
- 用户视线焦点在标题区，状态可见性最高
- 不与右上角"已发布"徽章冲突
- 实现成本低（一个 <span> + 三个 CSS state）

### D6: 触发源识别（source 字段）

**Decision**：`executeWorkflow` 增加可选 `source: 'manual' | 'live'` 标识，不改外部调用者签名（默认 'manual'）。

**Rationale**：
- 让 `executionService` 能基于 source 决定是否写 ExecutionLog
- 未来扩展（如 source: 'test-run'）友好
- 不破坏既有 `WorkflowHeader.handleExecute` 调用

### D7: 实时模式不抢控制权

**Decision**：当 `_executionStatus === 'running'`（来自显式 Execute 按钮）时，live subscription 跳过触发。

**Rationale**：
- 避免"按钮按下"与"live"互掐
- 用户已显式触发时尊重其意图
- 显式执行完成后再由 live 接管

---

## Review Checklist

### High class 完整版

- [x] 方案是否覆盖主要目标？—— 是（4 个目标：实时合成、backend 不变、不跨包、可关闭）
- [x] 是否触及跨包接口？—— 否（仅 dev-tool 内部）
- [x] 数据流是否清晰？—— 是（trigger → subscription → debounce → execute）
- [x] 状态机是否明确？—— 是（idle/debouncing/running 三态 + 取消语义）
- [x] 回退路径是否清晰？—— 是（git revert 即可，因改动局限在 dev-tool）
- [x] 性能影响是否可控？—— 是（LRU 缓存 + 防抖 + 可关闭开关）
- [x] 是否破坏既有 invariant？—— 否（targetPlatform 语义不变、PublishedWorkflow 不变）
- [x] 是否影响其他 active change？—— 否（与 `e2e-verify-canvas-synthesis-pipeline` 独立）
- [x] 验收标准是否可自动化？—— 是（typecheck、unit test、e2e 手动三段）
- [x] 是否引入了新技术栈？—— 否（沿用 Zustand + React + TS）
- [x] 是否需要数据迁移？—— 否
- [x] 是否需要 Prisma schema 变更？—— 否

### 涉及的质量检查

- [x] Cancellation 完整性—— abort 旧 controller 与防抖期重入已规划
- [x] Canvas 状态一致性—— `_executionStatus` / `executionResult` 由既有路径维护
- [x] 交互完整性—— 防抖/取消/重跑/重入四路径已识别
- [ ] 其他维度（拓扑/节点错误隔离/Registry 等）—— 不涉及，沿用既有

---

## Test Strategy

| Test Layer | Scope | File (suggested) |
|------------|-------|------------------|
| Unit | `useCanvasStore` subscription：platform 判定、debounce 触发、live 跳过 running | `useCanvasStore.live.test.ts` |
| Unit | `executionService.execute`：source 透传、ExecutionLog 跳过逻辑 | `executionService.test.ts` |
| Component | `WorkflowHeader` Live 指示器三态渲染、Execute 按钮文案切换 | `WorkflowHeader.test.tsx` |
| E2E (manual) | frontend 工作流下，换图/改参数 → 预览自动刷新 | 手动 smoke |
| E2E (manual) | backend 工作流下，**不**自动刷新 | 手动 smoke |
| E2E (manual) | 实时模式中途按 Execute 按钮 → 不抢控制权 | 手动 smoke |
| typecheck | `pnpm typecheck --filter=@prism/dev-tool` | CI |

---

## Verification Checklist

- [ ] frontend 工作流下，更换 LoadImage 图片 → 预览在 300ms 内自动刷新
- [ ] frontend 工作流下，调整 composite opacity/blendMode/overlayX/Y → 预览在 300ms 内自动刷新
- [ ] frontend 工作流下，实时执行期间用户继续操作 → 上一次被 abort，新一次在 200ms 内启动
- [ ] frontend 工作流下，按 Execute 按钮 → 立即执行（不等防抖）
- [ ] backend 工作流下，任何输入/参数变化 → **不**自动执行（行为完全等同改造前）
- [ ] backend 工作流下，Execute 按钮文案保持"Execute"
- [ ] SettingsPage 关闭 Live Preview → frontend 工作流回到手动模式
- [ ] user-app 加载已发布 frontend 工作流 → 仍是手动 Run（不实时）
- [ ] autosave 不会被实时执行副作用污染（executionResult 不进入持久化路径）
- [ ] dev-tool typecheck 通过
- [ ] dev-tool 单元测试通过

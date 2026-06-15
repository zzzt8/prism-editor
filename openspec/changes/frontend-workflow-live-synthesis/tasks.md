# tasks: frontend-workflow-live-synthesis

---

- [x] **Task 1: useAppStore 增加 Live Preview 配置项**

  ```yaml
  opsx-meta:
    id: task-1
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
  ```

  - 在 `apps/dev-tool/src/store/appStore.ts` 的 `AppSlice` 增加：
    - `livePreviewEnabled: boolean`（默认 `true`）
    - `livePreviewDebounceMs: number`（默认 `200`，范围 0-1000）
    - `setLivePreviewEnabled(enabled: boolean): void`
    - `setLivePreviewDebounceMs(ms: number): void`
  - 持久化：纳入 `appStore` 现有的 `partialize` 列表（如有），确保用户设置跨刷新保留
  - 验收：`pnpm typecheck --filter=@prism/dev-tool` 通过

---

- [x] **Task 2: executionService 支持 source 标识与 ExecutionLog 跳过**

  ```yaml
  opsx-meta:
    id: task-2
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
  ```

  - 修改 `apps/dev-tool/src/modules/editor/services/executionService.ts`：
    - `ExecuteOptions` 增加可选 `source?: 'manual' | 'live'`，默认 `'manual'`
    - `execute()` 内部将 source 透传给上层（store 层据此决定是否写 ExecutionLog）
    - 不改动 `WorkflowExecutor.execute` 调用方式与 `laneConfig` 默认值
  - 验收：`pnpm typecheck --filter=@prism/dev-tool` 通过；service 接口向后兼容（既有调用方不传 source 也能运行）

---

- [x] **Task 3: useCanvasStore.executeWorkflow 支持 source 与 log 跳过**

  ```yaml
  opsx-meta:
    id: task-3
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
  ```

  - 修改 `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`：
    - `executeWorkflow(source?: 'manual' | 'live')` 签名扩展
    - 当 `source === 'live'`：跳过 `_currentLog` 初始化与后续写入
    - 既有 `WorkflowHeader.handleExecute` 调用保持 `source = 'manual'`（默认）
    - `progressCallback` 中实时执行仍更新 `node.data.executionResult`（PreviewPanel 订阅需要）
  - 验收：`pnpm typecheck --filter=@prism/dev-tool` 通过；手测：手动 Execute 时 ExecutionLog 仍正常记录

---

- [x] **Task 4: useCanvasStore 内部增加 Live Subscription**

  ```yaml
  opsx-meta:
    id: task-4
    layer: app.dev-tool
    verify: |
      pnpm test -- apps/dev-tool/src/modules/editor/stores/useCanvasStore.live.test.ts
  ```

  - 在 `useCanvasStore` 内（store 创建时）挂 subscription：
    - 订阅 `state.nodes` 浅引用变化（使用 selector 比较）
    - 订阅 `state.workflowMeta.targetPlatform`
    - 订阅 `useAppStore.getState().livePreviewEnabled` 与 `livePreviewDebounceMs`
  - 触发条件（全部满足）：
    - `targetPlatform === 'browser'`
    - `livePreviewEnabled === true`
    - `_executionStatus !== 'running'`
    - `nodes.length > 0`
  - 行为：
    - 满足时 clear 旧 timer、设新 timer（防抖 `livePreviewDebounceMs`）
    - timer 触发后调用 `get().executeWorkflow('live')`
  - 实现细节：
    - 使用 `setTimeout`/`clearTimeout`（store 创建时 setup，无需 useEffect）
    - 提供 `destroy` 路径（虽然 store 是单例，但便于单测清理）
  - 验收：单测 `useCanvasStore.live.test.ts` 覆盖：
    - [ ] params 变化触发 execute（用 mock executeWorkflow 验证调用）
    - [ ] debounce 期间连续变化 → 只触发一次
    - [ ] `targetPlatform === 'nodejs'` → 不触发
    - [ ] `livePreviewEnabled === false` → 不触发
    - [ ] `_executionStatus === 'running'` → 不触发
    - [ ] 节点位置变化（`onNodesChange` 仅 position）→ 不触发

---

- [x] **Task 5: WorkflowHeader 增加 Live 状态指示器与按钮文案动态化**

  ```yaml
  opsx-meta:
    id: task-5
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
      pnpm test -- apps/dev-tool/src/components/header/WorkflowHeader.test.tsx
  ```

  - 修改 `apps/dev-tool/src/components/header/WorkflowHeader.tsx`：
    - 从 `useAppStore` 读 `livePreviewEnabled`
    - 从 `useCanvasStore` 读 `workflowMeta.targetPlatform` 与 `_executionStatus`
    - 推导 `liveBadgeState`:
      - `targetPlatform !== 'browser'` → 隐藏
      - `livePreviewEnabled === false` → 隐藏
      - `_executionStatus === 'running'` → `running`（紫色脉冲"Live · 合成中…"）
      - 有 pending debounce timer（需要 store 暴露）→ `debouncing`（黄色"Live · 等待稳定中"）
      - 否则 → `idle`（灰点"Live"）
    - 渲染 Live 徽章在标题旁（与 save badge 同侧）
    - Execute 按钮文案：
      - `targetPlatform === 'browser'` 且非 running → "重跑"
      - 其他 → 既有 "Execute"
  - 验收：
    - `pnpm typecheck --filter=@prism/dev-tool` 通过
    - 组件单测覆盖三态渲染与 backend 不显示徽章

---

- [x] **Task 6: useCanvasStore 暴露 live debounce 状态供 UI 订阅**

  ```yaml
  opsx-meta:
    id: task-6
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
  ```

  - 在 `useCanvasStore` 增加 `_liveDebouncing: boolean` 状态：
    - 初始 `false`
    - 每次 `clearTimeout` 后设 `false`
    - 每次 `setTimeout` 触发后立即设 `true`，timer 回调执行后设 `false`
  - WorkflowHeader 通过 selector 订阅此状态
  - 验收：`pnpm typecheck --filter=@prism/dev-tool` 通过

---

- [x] **Task 7: SettingsPage 增加 Live Preview 开关与防抖时长配置**

  ```yaml
  opsx-meta:
    id: task-7
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
  ```

  - 修改 `apps/dev-tool/src/pages/SettingsPage.tsx`：
    - 增加"Editor · Live Preview"分组
    - Toggle：`Live Preview`（绑定 `useAppStore.livePreviewEnabled`）
    - Slider/Number：`Debounce (ms)`（绑定 `livePreviewDebounceMs`，范围 0-1000）
    - Hint：解释该选项只影响 frontend 工作流，关闭后需要点击"重跑"按钮
  - 验收：`pnpm typecheck --filter=@prism/dev-tool` 通过；手测设置跨刷新保留

---

- [x] **Task 8: 单测覆盖：executeWorkflow source 与 live 跳过日志**

  ```yaml
  opsx-meta:
    id: task-8
    layer: app.dev-tool
    verify: |
      pnpm test -- apps/dev-tool/src/modules/editor/services/executionService.test.ts
  ```

  - 编写 `executionService.test.ts`：
    - `source = 'live'` → 不初始化 `_currentLog`
    - `source = 'manual'`（默认）→ 正常写 log
  - 验收：单测通过

---

- [x] **Task 9: 端到端手动 smoke 验证**

  ```yaml
  opsx-meta:
    id: task-9
    layer: app.dev-tool
    verify: |
      pnpm dev --filter=@prism/dev-tool
  ```

  - 启动 dev-tool，手动执行以下场景并截图/记录：
    1. 创建 `targetPlatform = browser` 工作流（load-image × 2 + composite），加载 2 张测试图 → 观察预览区（应自动出现合成结果）
    2. 拖动 composite.opacity 滑块 0→0.5→1 → 每次停下后预览应自动更新
    3. 拖动 composite.blendMode 切换 → 预览自动更新
    4. 更换 LoadImage 节点的图片（拖拽新图到节点）→ 预览自动更新
    5. 切换 `livePreviewEnabled = false`（SettingsPage）→ 重复上述操作，**不**自动更新（行为同改造前）
    6. 创建 `targetPlatform = nodejs` 工作流 → 任何输入/参数变化**不**自动更新，Execute 按钮文案保持"Execute"
    7. 实时执行期间按 Execute 按钮 → 不报错，控制权清晰
  - 验收：所有 7 项行为符合预期；记录任何偏差到 issues.md 备 follow-up

---

- [ ] **Task 10: typecheck + 全量测试通过**

  ```yaml
  opsx-meta:
    id: task-10
    layer: app.dev-tool
    verify: |
      pnpm typecheck --filter=@prism/dev-tool
      pnpm test --filter=@prism/dev-tool --run
  ```

  - 跑 dev-tool 完整 typecheck 与测试
  - 验收：全部通过

---

- [ ] **Task 11: 回归验证：user-app 与发布路径不受影响**

  ```yaml
  opsx-meta:
    id: task-11
    layer: app.user-app
    verify: |
      pnpm typecheck --filter=@prism/user-app
  ```

  - 验证以下文件无改动（或仅因 store re-export 间接影响）：
    - `apps/user-app/src/**` — 不应修改
    - `packages/workflow-core/src/**` — 不应修改
    - `packages/image-ops/src/**` — 不应修改
    - `packages/shared-types/src/**` — 不应修改
    - `server/src/**` — 不应修改
  - 验收：`git diff --name-only` 排除 `apps/dev-tool/**` 后为空（或仅包含必要的 transitive re-exports）

---

## 质量合规章节

| 检查项 | 标准 |
|--------|------|
| 错误信息 | live 触发执行失败时，PreviewPanel 显示与手动执行一致的状态（_executionStatus + executionError） |
| 状态机 | live subscription 在 store destroy 时清理 timer（单测覆盖） |
| 取消语义 | 防抖期 abort 旧 controller（沿用 `_executionAbort`） |
| UI 一致性 | Live 徽章三态视觉与既有 save badge 风格一致 |
| 后向兼容 | executeWorkflow 不传 source 时默认 'manual'，与既有行为一致 |

---

## 验证命令汇总

```bash
# 类型检查（dev-tool）
pnpm typecheck --filter=@prism/dev-tool

# dev-tool 单测
pnpm test --filter=@prism/dev-tool --run

# 启动 dev-tool 做手测 smoke
pnpm dev --filter=@prism/dev-tool

# 验证 user-app/server/workflow-core/image-ops 无 regression
pnpm typecheck --filter=@prism/user-app
pnpm typecheck --filter=@prism/server
pnpm typecheck --filter=@prism/workflow-core
pnpm typecheck --filter=@prism/image-ops

# 确认改动范围
git diff --name-only | grep -v "apps/dev-tool" || echo "OK: no out-of-scope changes"
```

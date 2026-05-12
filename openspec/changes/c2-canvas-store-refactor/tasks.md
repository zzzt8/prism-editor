## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| editor | Smoke test（手工验收） | `pnpm dev` 后手动操作 |
| editor | TypeScript 编译 | `pnpm typecheck --filter=@prism/dev-tool` |

> C2 是纯重构，测试目的是确保行为不变，不做新增测试用例（测试由 C5 覆盖）

### Test Cases

#### TC-1: 重构后编辑器正常启动
- **Given**: 重构完成后的代码库
- **When**: `pnpm dev` 启动 dev-tool
- **Then**: 浏览器成功打开编辑器，无白屏

#### TC-2: 节点拖拽操作正常
- **Given**: 编辑器打开状态
- **When**: 从左侧面板拖拽一个节点到画布
- **Then**: 节点出现在画布上，ID 唯一

#### TC-3: 连线操作正常
- **Given**: 画布上有两个节点
- **When**: 从输出端口拖线到输入端口
- **Then**: 连线出现，无报错

#### TC-4: 复制粘贴节点 ID 唯一
- **Given**: 画布上有节点 A
- **When**: 选中 A，复制，然后粘贴
- **Then**: 出现节点 B，ID 与 A 不同

#### TC-5: 执行流水线正常
- **Given**: 画布上有 load-image → composite → export 连线
- **When**: 点击运行
- **Then**: 流水线执行完成，无错误

#### TC-6: TypeScript 编译无错误
- **Given**: 重构后代码
- **When**: `pnpm typecheck --filter=@prism/dev-tool`
- **Then**: 无编译错误

### Backward Compatibility（向后兼容）

- [ ] 所有 Zustand store 方法签名不变
- [ ] 所有 service 接口不变（autosaveService、executionService）
- [ ] 所有 React 组件 import 路径仍可正常工作（需同步更新 import）

---

## 任务列表

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: editor
> verify: smoke-test
> dependencies:
>   - type: task
>     refs: []
> -->
> ```

<!-- opsx-meta
id: T1
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T1: 创建 `canvasStore.ts` — 主 Store，整合 graphSlice + executionSlice 作为实际实现，selectionSlice 剪贴板部分并入
  - layer: editor
  - **验收标准**: `pnpm typecheck --filter=@prism/dev-tool` 无错误；`pnpm dev` 能启动

<!-- opsx-meta
id: T2
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [ ] T2: 统一 nodeCounter / edgeCounter — 删除 graphSlice.ts / selectionSlice.ts 中重复的计数器副本，改为从主 Store 访问
  - layer: editor
  - **验收标准**: 复制粘贴 10 次节点，每个节点 ID 都不同

<!-- opsx-meta
id: T3
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [ ] T3: 剪贴板 Zustand 化 — 删除模块级 clipboardNodes / clipboardEdges 变量，改为 `canvasStore.ts` 的 `clipboard` 状态字段
  - layer: editor
  - **验收标准**: 复制节点后刷新页面，粘贴仍可用（Zustand persist 或 localStorage 恢复）

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T2, T3]
-->
- [ ] T4: IndexedDBStorageAdapter 单例 — 在 storage/ 目录 export 单例，各 Store 共用
  - layer: editor
  - **验收标准**: useCanvasStore 和 workflowStore 共享同一个 adapter 实例

<!-- opsx-meta
id: T5
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T4]
-->
- [ ] T5: 删除 `apps/dev-tool/src/utils/nodeCache.ts` — dev-tool 改用 `apps/user-app/src/storage/nodeCache.ts`
  - layer: editor
  - **验收标准**: `pnpm typecheck --filter=@prism/dev-tool` 无错误；dev-tool 的 node 缓存功能正常

<!-- opsx-meta
id: T6
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: [T5]
-->
- [ ] T6: 确认 `apps/user-app/src/storage/nodeCache.ts` 完整可用，作为 node 缓存唯一来源
  - layer: runtime
  - **验收标准**: nodeCache 在 user-app 中正常工作

<!-- opsx-meta
id: T6
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T2, T3, T4, T5]
-->
- [ ] T6: 端到端手工验收 — 拖拽、连线、复制粘贴、执行、发布全流程跑一遍
  - layer: editor
  - **验收标准**: 所有操作行为与重构前完全一致

---

### 手工验收清单

- [ ] `pnpm typecheck --filter=@prism/dev-tool` 无错误
- [ ] `pnpm typecheck --filter=@prism/dev-tool --filter=@prism/shared-types --filter=@prism/core` 无跨包引用错误
- [ ] `pnpm dev` 启动无报错
- [ ] 拖拽节点到画布正常
- [ ] 连线正常
- [ ] 复制粘贴 ID 唯一
- [ ] 运行流水线正常
- [ ] 发布到 server 正常

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- T1 是基础，先完成
- T2、T3 依赖 T1，并行执行
- T4 依赖 T1
- T5 依赖 T4
- T6 收尾，依赖 T1-T5 全部完成

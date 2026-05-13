## 任务列表

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: runtime
> verify: smoke-test
> dependencies:
>   - type: task
>     refs: []
> -->
> ```

<!-- opsx-meta
id: T1
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T1: 删除 `workflowCatalogStore.ts` 中所有 `console.log`
  - layer: runtime
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/` 无输出

<!-- opsx-meta
id: T2
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T2: 删除 `WorkflowRunPage.tsx` 中所有 `console.log`
  - layer: runtime
  - **验收标准**: 同上

<!-- opsx-meta
id: T3
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T3: 删除 `InputSection/index.tsx` 中所有 `console.log`
  - layer: runtime
  - **验收标准**: 同上

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T4: `App.tsx` 三个未实现功能按钮改为 alert 提示"此功能开发中"
  - layer: editor
  - **验收标准**: 点版本历史/对比/回滚按钮显示友好提示，不报 Error

<!-- opsx-meta
id: T5
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T5: dev-tool 全局 console.log 清理 — 全项目搜索确认 dev-tool 无残留 `console.log`，如有则删除
  - layer: editor
  - **验收标准**: `grep -r "console\.log" apps/dev-tool/src/` 无输出

<!-- opsx-meta
id: T6
layer: runtime
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [ ] T6: 全项目 console.log 最终验收 — `grep -r "console\.log" apps/` 无输出（不含 node_modules）
  - layer: runtime
  - **验收标准**: 整个 apps/ 目录下无任何 console.log

---

### 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。
> 填写时按上述优先级选择验证方式，人工验收仅作为兜底。

- [ ] E2E / Playwright 测试覆盖（如有）
- [ ] 单元/集成测试通过（如有）
- [ ] `pnpm typecheck` 无错误
- [ ] Console 清理验证：`grep -r "console\.log" apps/` 无输出
- [ ] 未实现按钮交互验证：Playwright 或手动点击，验证 alert 提示（上述均无法覆盖时用人工）
- [ ] 人工验收（仅 T4 按钮提示无法自动化时）

> 若某个验收项已有测试覆盖，则不加人工验收项。
> 只有"无法编写测试"且"命令行无法验证"时才加人工验收。

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）
- [ ] N.1.2 节点 executor 错误隔离测试
- [ ] N.1.3 AbortController 链路测试（取消后结果保留）

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试
- [ ] N.2.2 取消后 Zustand store 状态检查

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证
- [ ] N.3.2 Prisma migration 验证（`pnpm --filter=@prism/server exec prisma migrate status`）
- [ ] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 API 输入 Zod 验证覆盖（如涉及 API 变更）

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- T1、T2、T3 可并行（runtime 层删除 console.log）
- T4 独立（editor 层）
- T5 独立（editor 层）
- T6 收尾（runtime 层，跨 app 全局验收）

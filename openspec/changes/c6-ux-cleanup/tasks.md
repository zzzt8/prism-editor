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

### 手工验收清单

- [ ] 打开 dev-tool 的浏览器 DevTools → Console 面板，刷新页面，无任何 console.log 输出
- [ ] 点"版本历史"按钮，弹出"此功能开发中"提示
- [ ] 点"版本对比"按钮，弹出"此功能开发中"提示
- [ ] 点"回滚"按钮，弹出"此功能开发中"提示

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- T1、T2、T3 可并行（runtime 层删除 console.log）
- T4 独立（editor 层）
- T5 独立（editor 层）
- T6 收尾（runtime 层，跨 app 全局验收）

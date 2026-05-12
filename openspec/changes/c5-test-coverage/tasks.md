## 任务列表

> **前置条件**：C5 依赖 C1、C2、C3、C4 全部 completed 后方可开始实施。
> （CI 文件本身可以先创建，但测试用例的编写应在所有代码改动稳定后进行，避免因改代码导致测试失效。）

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: meta
> verify: smoke-test
> dependencies:
>   - type: change
>     refs: []
> -->
> ```

<!-- opsx-meta
id: T1
layer: meta
verify: smoke-test
dependencies:
  - type: change
    refs: []
-->
- [ ] T1: 创建 `.github/workflows/ci.yml` — checkout + pnpm setup + node 20 + typecheck + test + build
  - layer: meta
  - **验收标准**: PR 推送后 GitHub Actions 自动触发；所有步骤通过后显示 ✅

<!-- opsx-meta
id: T2
layer: ui-skin
verify: unit-tests
dependencies:
  - type: change
    refs: [T1]
-->
- [ ] T2: `shared-ui` 加 vitest 配置（jsdom + globals + coverage）；Button / Modal / Spinner 快照测试
  - layer: ui-skin
  - **验收标准**: `pnpm test --filter=@prism/shared-ui` 通过

<!-- opsx-meta
id: T3
layer: engine
verify: unit-tests
dependencies:
  - type: change
    refs: [T1]
-->
- [ ] T3: `node-definitions` 加测试 — 验证 7 个节点的 id / category / ports / inputs / outputs 存在且格式正确
  - layer: engine
  - **验收标准**: `pnpm test --filter=@prism/node-definitions` 通过

<!-- opsx-meta
id: T4
layer: runtime
verify: unit-tests
dependencies:
  - type: change
    refs: [T1]
-->
- [ ] T4: `user-app` stores 加测试 — workflowCatalogStore / selectedWorkflowStore / runStore 的加载/错误/取消路径
  - layer: runtime
  - **验收标准**: `pnpm test --filter=@prism/user-app` 通过

<!-- opsx-meta
id: T5
layer: meta
verify: unit-tests
dependencies:
  - type: change
    refs: [T1]
-->
- [ ] T5: 6 个包的 vitest.config.ts 统一加 coverage 配置（provider: v8, 80% 门槛, html/json 报告）
  - layer: meta
  - **验收标准**: `pnpm test -- --coverage` 生成 coverage 报告；CI 覆盖检查通过

<!-- opsx-meta
id: T6
layer: meta
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [ ] T6: 配置 ESLint / Prettier；运行 lint 并修复所有 lint 错误（proposal 的 capability 承诺了 lint）
  - layer: meta
  - **验收标准**: `pnpm lint` 无 error；CI lint 步骤通过

---

### 手工验收清单

- [ ] `pnpm test` 在本地全绿
- [ ] `.github/workflows/ci.yml` 在 PR 中触发并通过
- [ ] coverage 报告在 CI 输出中可见
- [ ] 新 PR 未通过 CI 时无法合并（branch protection 规则）

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- T1 先做（CI 是基础设施）
- T2、T3、T4、T5 可并行（T2 ui-skin、T3 engine、T4 runtime、T5 meta）

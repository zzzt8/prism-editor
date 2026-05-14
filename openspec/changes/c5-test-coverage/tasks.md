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
- [x] T1: 创建 `.github/workflows/ci.yml` — checkout + pnpm setup + node 20 + typecheck + test + build
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
- [x] T2: `shared-ui` 加 vitest 配置（jsdom + globals + coverage）；Button / Modal / Spinner 快照测试
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
- [x] T3: `node-definitions` 加测试 — 验证 7 个节点的 id / category / ports / inputs / outputs 存在且格式正确
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
- [x] T4: `user-app` stores 加测试 — workflowCatalogStore / selectedWorkflowStore / runStore 的加载/错误/取消路径
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

### 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。
> 填写时按上述优先级选择验证方式，人工验收仅作为兜底。

- [ ] E2E / Playwright 测试覆盖（如有）
- [ ] 单元/集成测试通过：`pnpm test` 本地全绿
- [ ] `pnpm typecheck` 无错误
- [ ] CI workflow 触发并通过：`gh run list --workflow=ci.yml`
- [ ] 覆盖率报告生成：`pnpm test -- --coverage` 报告存在
- [ ] Branch protection 验证：`gh api repos/{owner}/{repo}/branches/main/protection`
- [ ] 人工验收（上述均无法覆盖时）

> 若某个验收项已有测试覆盖，则不加人工验收项。
> 只有"无法编写测试"且"命令行无法验证"时才加人工验收。

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。
> **选择性应用**：仅添加与 c5 直接相关的章节。

### N.3 Registry 与 API 契约

- [ ] N.3.1 `.github/workflows/ci.yml` 包含 typecheck + test + build 三步骤
- [ ] N.3.2 Branch protection 规则生效：未通过 CI 的 PR 无法合并

### N.5 安全与类型

- [ ] N.5.1 `pnpm lint` 无 error（ESLint + Prettier）
- [ ] N.5.2 覆盖率 80% 门槛达标（v8 provider）

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- T1 先做（CI 是基础设施）
- T2、T3、T4、T5 可并行（T2 ui-skin、T3 engine、T4 runtime、T5 meta）

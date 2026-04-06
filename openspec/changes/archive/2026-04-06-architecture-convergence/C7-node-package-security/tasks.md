# C7: 节点包安全边界

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

- C5: user-app-store-split（nodePackageLoader 已从 store 拆出）

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| runtime | 单元测试 | `pnpm test --filter=@prism/user-app` |
| engine | 单元测试 | `pnpm test --filter=@prism/core` |

### Test Cases

#### TC-1: inline executor Worker 隔离
- **Given**: 含 inline executor 的 workflow
- **When**: 执行
- **Then**: 在 Worker 中执行，主线程不受影响

#### TC-2: URL 白名单
- **Given**: 不在白名单的 URL executor
- **When**: 加载
- **Then**: 拒绝加载，提示安全错误

### Backward Compatibility（向后兼容）

- [x] 已发布的不含 inline/URL executor 的 workflow 不受影响
- [x] package 节点加载流程不变

---

## 任务列表

> Task 元数据格式：
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> risk: high
> verify:
>   - unit-tests
>   - golden-fixture
> -->
> ```
>
> **layer 取值**：editor | runtime | backend | engine | ui-skin
> **risk 取值**：low | medium | high
> **verify 取值**：unit-tests | golden-fixture | api-tests | smoke-test | visual-check

<!-- opsx-meta
id: T1
layer: runtime
risk: medium
verify:
  - unit-tests
status: done
-->
- [x] T1: 定义 SecurityConfig
  - layer: runtime
  - files: apps/user-app/src/modules/node-runtime/securityConfig.ts
  - **验收标准**：白名单和信任级别配置定义完成

<!-- opsx-meta
id: T2
layer: runtime
risk: high
verify:
  - unit-tests
status: done
-->
- [x] T2: 实现 manifest 校验
  - layer: runtime
  - files: apps/user-app/src/modules/node-runtime/nodePackageLoader.ts
  - **验收标准**：package manifest 完整性和版本签名校验

<!-- opsx-meta
id: T3
layer: engine
risk: high
verify:
  - unit-tests
status: done
-->
- [x] T3: 实现 Worker 隔离
  - layer: engine
  - files: packages/core/src/executorUtils.ts
  - **验收标准**：inline executor 在 Worker 中执行

<!-- opsx-meta
id: T4
layer: runtime
risk: medium
verify:
  - unit-tests
status: done
-->
- [x] T4: 实现 URL 白名单
  - layer: runtime
  - files: apps/user-app/src/modules/node-runtime/nodePackageLoader.ts
  - **验收标准**：URL executor 目标地址校验

---

## 手工验收清单

- [x] 含 inline executor 的 workflow 在 Worker 中执行，UI 不卡顿
- [x] 不在白名单的 URL executor 加载时被拒绝
- [x] 已签名的 package 节点正常加载

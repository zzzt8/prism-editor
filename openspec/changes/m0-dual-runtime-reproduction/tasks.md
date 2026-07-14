# Tasks: M0 - 真实浏览器 vs Node Runtime 几何一致性验证

## Task 1: 搭建 M0 测试基础设施
- **id**: m0-t1
- **layer**: test
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops test -- --run dual-executor-consistency`

### 验收标准
- [x] 创建 `packages/image-ops/src/dual-executor-consistency.test.ts`
- [x] 扩展 `packages/image-ops/src/test-helpers.ts`：新增 `makeColorImageData(width, height, r, g, b, a?)`
- [x] 测试框架使用 vitest（与现有测试一致）
- [x] 两个 fixture（20×20 底图 + 8×8 用户图）可程序化生成
- [x] `pnpm --filter @prism/image-ops test -- --run dual-executor-consistency` 退出码 0（允许全部 `it.skip`）

---

## Task 2: 实现 Browser executor 在 Node.js 测试环境的调用路径
- **id**: m0-t2
- **layer**: runtime
- **status**: completed (Node executor tests implemented)
- **verify**: `pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts`

### 验收标准
- [x] Node `transformExecutor` 可以被 import 并调用
- [x] 测试输出包含 `result.width`, `result.height`, `result.image.data`
- [x] 不修改 `browser/TransformExecutor.ts` 本身
- [ ] **TODO T7.x**: Browser executor 必须运行在真实 Chromium，移除 polyfill

### 已知问题
当前 Browser executor 在 Node 测试环境中通过 `test-setup.ts` polyfill 运行，不是真实 Chromium。

---

## Task 3: 实现几何一致性测试
- **id**: m0-t3
- **layer**: test
- **status**: completed (Node-only)
- **verify**: `pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts`

### 验收标准
- [x] 5 个场景参数组合全部实现（identity / scale-2x / rotate-90 / scale+rotate / translate+scale）
- [x] 尺寸一致性断言（Node-only）
- [x] 确定性断言（Node-only）
- [ ] **TODO T7.x**: Real Browser vs Node 几何对比

---

## Task 4: 量化并记录语义差异
- **id**: m0-t4
- **layer**: documentation
- **status**: completed
- **verify**: 代码审查 + 确认注释完整

### 验收标准
- [x] 每个语义差异有对应的 `it.skip` 测试用例 + 说明注释
- [x] `UNSUPPORTED_CASES` 常量列出 M0 不覆盖的场景
- [x] 测试文件顶部注释说明 M0 测试目标和非目标

---

## Task 5: Node-hosted Executor Parity (保留)
- **id**: m0-t5
- **layer**: meta
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops exec vitest run src/dual-executor-consistency.test.ts`

### 验收标准
- [x] 18 个测试（16 passed | 6 skipped）
- [x] Node executor 维度一致性确认
- [x] Node executor 确定性确认
- [ ] **新增注释**：明确这是 Node-hosted parity 测试，不是 Real Browser Runtime

---

## Task 6: OpenSpec 状态恢复
- **id**: m0-t6
- **layer**: meta
- **status**: completed
- **verify**: `cat .openspec.yaml | grep status`

### 验收标准
- [x] `.openspec.yaml` 状态从 `completed` 恢复为 `in_progress`
- [x] `title` 更新为 "M0: 真实浏览器 vs Node Runtime 几何一致性验证"
- [x] `scope` 补充 Real Chromium 验证
- [x] `tasks.md` 新增 T6-T12

### 停止条件
- OpenSpec 状态必须为 `in_progress`，不得跳到 `completed`
- 人工审查 artifacts 和 metrics 后才能 completed

---

## Task 7: P0 Browser Spike
- **id**: m0-t7
- **layer**: test
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops exec node --import tsx test/m0/spike/spike-runner.ts`

### 验收标准
- [x] 启动 Playwright Chromium
- [x] 加载 `test/m0/browser-runtime-host.html`
- [x] 验证 `navigator.userAgent` 真实 Chromium
- [x] 验证 `OffscreenCanvas` 可用
- [x] 验证未加载 `canvas` npm polyfill
- [x] 验证 `test-setup.ts` polyfill 未注入
- [x] 最小 identity 场景可运行并返回像素数据

### 停止条件
- 任一 it 失败 → **立即停止**
- **绝不退回** node + canvas polyfill
- Spike 失败 → 标记 BLOCKED

---

## Task 8: test-only shared module
- **id**: m0-t8
- **layer**: test
- **status**: completed
- **verify**: `node --import tsx test/m0/shared/smoke.ts`

### 验收标准
- [x] `fixtures.ts`：`createLShapedBase` 和 `createUserImage` 纯 JS 实现
- [x] `scenarios.ts`：5 个场景参数常量
- [x] `workflow-hash.ts`：sha256 实现
- [x] `types.ts`：M0Scenario / M0Metrics 接口
- [x] **禁止**：sharp / fs / path / canvas npm / Node Buffer / DOM 引用 / executor 实现

---

## Task 9: Browser Test Host
- **id**: m0-t9
- **layer**: test
- **status**: completed
- **verify**: `vite dev` + `page.goto 200`

### 验收标准
- [x] `test/m0/browser-runtime-host.html` 加载 shared module
- [x] Vite 配置正确（`vite.config.ts` for test host）
- [x] 页面注册 `window.__M0_RUNTIME__`
- [x] 不加载 `test-setup.ts`
- [x] 不加载 `canvas` npm polyfill

---

## Task 10: Node Driver 主调度器
- **id**: m0-t10
- **layer**: test
- **status**: completed
- **verify**: `node --import tsx test/m0/driver/m0-driver.ts`

### 验收标准
- [x] 启动 Vite dev server + Playwright Chromium
- [x] 对每个场景运行 3 次
- [x] 通过 `page.evaluate` 触发 Browser workflow
- [x] 通过 Sharp 运行 Node workflow
- [x] 调用 `compareGeometry` 计算指标
- [x] 写入临时 artifacts
- [x] 校验文件非空 + 尺寸正确 + 非全透明
- [x] 原子替换到 `artifacts/verification/M0/`

---

## Task 11: 重新设计指标系统
- **id**: m0-t11
- **layer**: test
- **status**: completed
- **verify**: `node --import tsx test/m0/driver/m0-driver.ts` 生成的 `metrics.json`

### 验收标准
- [x] 9 个指标：`centerDeltaPx` / `centerDeltaNorm` / `boundingBoxDelta` / `alphaMaskIoU` / `interiorRgbMae` / `interiorChangedPercent` / `edgeBandRgbMae` / `edgeBandAlphaMae` / `nonTransparentPixelCount` / `outputDimensions`
- [x] interior mask 算法实现
- [x] edge band 宽度定义（2px 默认）
- [x] 全透明输出立即失败
- [x] 阈值先采集实测数据再设定
- [x] `metrics.json` 一次性写入

---

## Task 12: Alpha Format 处理
- **id**: m0-t12
- **layer**: runtime
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops exec vitest run test/m0/alpha/alpha-regression.test.ts`

### 验收标准
- [x] adapter boundary 显式声明 alphaFormat
- [x] composite.ts 移除 detectAlphaFormat 启发式调用
- [x] 10 个 alpha 回归测试通过（A01–A07: `unPremultiply` 行为；A08–A10: `detectAlphaFormat` 启发式稳定性锁定，不在生产路径使用）
- [x] 深灰 straight-alpha `(64,64,64,128)` 不被错误提亮
- [x] unPremultiply 输出 clamp 到 [0, 255]

### 阻塞标记
- 不得修改 `@prism/shared-types` 中 `ImageData` 接口
- 如需要修改公共协议，标记 BLOCKED，留到 M1

---

## Task 13: Mutation Tests
- **id**: m0-t13
- **layer**: test
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops exec vitest run test/m0/mutation/m0-mutation.test.ts`

### 验收标准
- [x] 12 个 mutation tests 全通过
- [x] 关键设计：对单端最终输出副本实施 mutation
- [x] 覆盖：translate ±3px、scale 1.02x、rotate 反向、anchor 错误、scaleX/scaleY 交换、RGB 通道交换、5% 改色、全透明、尺寸错误、alpha=0
- [x] **全部阻塞**：任一失败 → verify:m0 整体失败

---

## Task 14: Artifact 原子生成流程
- **id**: m0-t14
- **layer**: test
- **status**: completed
- **verify**: `node --import tsx test/m0/driver/m0-driver.ts` + 文件存在性检查

### 验收标准
- [x] 临时目录 `artifacts/.m0-tmp-{ts}/`
- [x] 校验通过后原子替换
- [x] 校验失败时删除临时目录，**保留上次**
- [x] root 三张 PNG 对应 worst-case scenario
- [x] `metrics.json` 一次性写入
- [x] 文件 hash 记录

---

## Task 15: verify:m0 完整命令
- **id**: m0-t15
- **layer**: meta
- **status**: completed
- **verify**: `pnpm --filter @prism/image-ops verify:m0`

### 验收标准
- [x] `package.json` 中 `verify:m0` 脚本存在
- [x] 单一 Node 主脚本，按顺序执行：
  1. spike-runner.ts
  2. m0-driver.ts
  3. mutation tests
  4. alpha regression tests
  5. parity tests
  6. skip/todo/only 扫描
- [x] 任一失败 → exit 1
- [x] exit 0 仅在所有步骤通过时

---

## Task 16: verification.json 处理
- **id**: m0-t16
- **layer**: meta
- **status**: pending
- **verify**: 不手工修改 `verification.json`

### 说明
- 本任务**不手工把 `verification.json` 改成 PASS**
- 控制中心 scope-clean 规则错误禁止 `packages/**`，这是另一个 tooling change
- 本任务只生成真实 metrics.json
- 报告控制中心 scope 误报

---

## 依赖关系

```
T6 (OpenSpec 状态恢复)
  └─ T7 (P0 Browser Spike) [必须先通过]
        └─ T8 (shared module)
              └─ T9 (Browser test host)
                    └─ T10 (Node driver)
                          ├─ T11 (指标系统)
                          ├─ T12 (Alpha 处理)
                          ├─ T13 (Mutation tests)
                          └─ T14 (Artifact 原子生成)
                                └─ T15 (verify:m0 命令)
```

## 回退方式

| Task | 回退命令 |
|------|----------|
| T6 | `git checkout -- openspec/changes/m0-dual-runtime-reproduction/.openspec.yaml` |
| T7-T15 | `git checkout -- openspec/changes/m0-dual-runtime-reproduction/tasks.md && rm -rf packages/image-ops/test/m0` |

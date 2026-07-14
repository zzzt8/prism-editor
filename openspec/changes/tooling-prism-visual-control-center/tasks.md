# Tasks: Prism Visual Control Center V0

## Task 1: 创建目录结构

- [ ] 创建 `tools/prism-control-center/` 目录
- [ ] 创建 `tools/prism-control-center/lib/` 目录
- [ ] 创建 `tools/prism-control-center/dashboard/` 目录
- [ ] 创建 `tools/prism-control-center/test/` 目录
- [ ] 创建 `docs/control-center/` 目录
- [ ] 创建 `artifacts/verification/M0/` 占位目录

**verify**: `ls tools/prism-control-center tools/prism-control-center/lib tools/prism-control-center/dashboard tools/prism-control-center/test docs/control-center artifacts/verification/M0`

---

## Task 2: 实现 lib/git.mjs

- [ ] 获取当前 git branch（`git branch --show-current`）
- [ ] 获取当前 commit hash（`git rev-parse HEAD`，前 8 位）
- [ ] 判断 dirty（`git status --porcelain`）
- [ ] 获取修改文件列表（`git diff --name-only` + `git diff --cached --name-only`）
- [ ] 分类文件：tools / docs / openspec / packages / tests / root
- [ ] 识别 scope violation（packages/** 修改）
- [ ] 导出 `{ branch, commit, isDirty, modifiedFiles, scopeViolations }`

**verify**: `node tools/prism-control-center/lib/git.mjs` 输出 JSON

---

## Task 3: 实现 lib/source-docs.mjs

- [ ] 计算架构文档 SHA-256 hash（`crypto.createHash('sha256')`）
- [ ] 支持文档：`docs/architecture/PRISM_TARGET_ARCHITECTURE.md`、`docs/architecture/PRISM_ARCHITECTURE_GUARDRAILS.md`、`docs/architecture/PRISM_MIGRATION_ROADMAP.md`
- [ ] 读取文件修改时间（`fs.stat.mtime`）
- [ ] 对比历史 hash（读取已有 verification.json 中的 hash）
- [ ] 导出 `{ documents: [{ path, hash, lastModified, changed }] }`

**verify**: `node tools/prism-control-center/lib/source-docs.mjs` 输出 JSON

---

## Task 4: 实现 lib/evidence.mjs

- [ ] 检查 `artifacts/verification/M0/` 目录是否存在
- [ ] 检查 `browser.png`、`node.png`、`diff.png`、`metrics.json` 是否存在
- [ ] 如果 `metrics.json` 存在，读取并解析（验证 JSON schema）
- [ ] 导出 `{ artifactsDir, files: { browser.png, node.png, diff.png, metrics.json }, metrics }`

**verify**: `node tools/prism-control-center/lib/evidence.mjs` 输出 JSON

---

## Task 5: 实现 lib/status.mjs

- [ ] 实现 `computeOverallStatus(gates)` 函数：计算里程碑总状态（最严重门禁）
- [ ] 实现 `executeVitest(filePath)` 函数：spawn vitest 命令，捕获 exit code 和输出摘要
- [ ] 实现 `scanSkipTodo(filePath)` 函数：读取测试文件，扫描 `it.skip`、`test.skip`、`describe.skip`、`todo`、`only` 出现次数
- [ ] 实现 `checkBrowserConfig()` 函数：检查 `packages/image-ops/vitest.browser.config.ts` 是否配置了 dual-executor 测试
- [ ] 实现 `computeGatesM0(evidence, git, testResult, skipScan)` 函数：计算每个 M0 门禁的状态和理由
- [ ] 实现 `computeMilestones(gates)` 函数：计算 M0-M7 状态
- [ ] 导出所有函数和类型定义

**verify**: `node tools/prism-control-center/lib/status.mjs` 输出验证通过

---

## Task 6: 实现 generate.mjs

- [ ] 调用 `git.mjs` 获取 git 信息
- [ ] 调用 `source-docs.mjs` 获取架构文档 hash
- [ ] 调用 `evidence.mjs` 获取证据文件状态
- [ ] 调用 `status.mjs` 执行 vitest 并计算所有门禁
- [ ] 组装 `verification.json` 对象（包含 schemaVersion、phase、overallStatus、generatedAt、git、sourceDocuments、milestones、gates、artifacts、openspec）
- [ ] 写入 `artifacts/verification/M0/verification.json`（使用 `fs.mkdirSync` 确保目录存在）
- [ ] 支持 `--phase M0` 参数

**verify**: `node tools/prism-control-center/generate.mjs --phase M0` 生成 `artifacts/verification/M0/verification.json`，内容包含 schemaVersion、phase、overallStatus、gates 数组

---

## Task 7: 实现 verify.mjs

- [ ] 解析 `--phase` 参数（默认为 M0）
- [ ] 调用 `generate.mjs` 的逻辑（或直接调用 `generate.mjs` 作为子模块）
- [ ] 输出摘要：overallStatus、gate 状态分布（PASS/BLOCKED/FAILED/PENDING 数量）
- [ ] exit code：所有必要门禁 PASS → 0；否则 → 1

**verify**: `node tools/prism-control-center/verify.mjs --phase M0` 输出状态摘要，exit code 反映门禁通过状态

---

## Task 8: 实现 serve.mjs

- [ ] 解析命令行参数：`--port`（默认 8080）、`--generate`（默认 true）、`--dir`（dashboard 目录）
- [ ] 如果 `--generate` 或 verification.json 不存在，调用 `generate.mjs`
- [ ] 使用 Node `http` 模块创建 server
- [ ] 静态服务 `dashboard/` 目录（`/index.html` 等）
- [ ] 服务 `artifacts/verification/` 目录（使页面能 fetch JSON 和图片）
- [ ] 默认监听 `127.0.0.1`，不监听 `0.0.0.0`
- [ ] 启动后打印访问地址

**verify**: `node tools/prism-control-center/serve.mjs --port 8080` 启动后 `curl http://127.0.0.1:8080/` 返回 HTML

---

## Task 9: 实现 dashboard/index.html + styles.css + app.js

- [ ] **Header**: 显示 branch / commit / dirty 状态 / 当前里程碑 / overallStatus / generatedAt / 架构文档变化警告
- [ ] **M0-M7 Roadmap**: 可视化 8 个里程碑，M0 单独高亮，显示进度条和状态
- [ ] **Target Architecture View**: SVG 架构图（Dev Tool → Shared Protocol → Browser Runtime / Production Runtime → Mall），标注来源文档
- [ ] **Quality Gate Matrix**: M0 门禁表格，每行含 Gate Name / Status / Reason / Command / Exit Code / Evidence Path / Last Run，Status 用颜色区分
- [ ] **Visual Evidence**: browser.png / node.png / diff.png 三个区块，文件不存在时显示"暂无证据"
- [ ] **metrics.json**: 表格展示几何 diff 数值，文件不存在时显示"暂无证据"
- [ ] **Blockers**: 列出所有 BLOCKED 门禁，说明阻塞原因和下一步行动
- [ ] **Git Impact**: 按 category 分组显示修改文件列表，packages/** 显示红色警告
- [ ] 响应式布局，支持桌面端查看
- [ ] `fetch()` 获取 `../artifacts/verification/M0/verification.json`，无数据时显示加载状态
- [ ] 状态徽章颜色：PASS=绿色、BLOCKED=红色、FAILED=橙色、PENDING=灰色、WARNING=黄色、LOCKED=深灰

**verify**: 在浏览器中打开 `http://127.0.0.1:8080/` 可看到完整页面，数据来自 verification.json

---

## Task 10: 实现 test/status.test.mjs

- [ ] 测试 `computeOverallStatus()`：全 PASS → PASS；有 BLOCKED → BLOCKED；有 FAILED → FAILED；全 PENDING → PENDING
- [ ] 测试 `scanSkipTodo()`：文件有 skip 时返回 > 0；无 skip 时返回 0
- [ ] 测试 `checkBrowserConfig()`：检查当前 vitest.browser.config.ts 状态
- [ ] 测试 `computeGatesM0()`：当 evidence 全缺且 Browser 未配置时，Browser 相关门禁返回 BLOCKED
- [ ] 测试 exit code 0 但有 skip 时，相关门禁不得 PASS
- [ ] 测试 architecture doc hash 变化时显示 stale
- [ ] 测试 git diff 中 packages/** 修改时显示 scope warning
- [ ] 测试 verification.json schemaVersion 可识别（检查已知字段存在）
- [ ] 测试 artifacts 不存在时 page data generation 不崩溃（使用 mock JSON）

**verify**: `node tools/prism-control-center/test/status.test.mjs` 或通过 `pnpm prism:dashboard:test`

---

## Task 11: 更新根 package.json

- [ ] 添加 `"prism:verify": "node tools/prism-control-center/verify.mjs --phase M0"`
- [ ] 添加 `"prism:dashboard": "node tools/prism-control-center/serve.mjs"`
- [ ] 添加 `"prism:dashboard:check": "node tools/prism-control-center/serve.mjs --generate --port 0"`
- [ ] 添加 `"prism:dashboard:test": "node tools/prism-control-center/test/status.test.mjs"`

**verify**: `cat package.json | grep prism:` 显示所有 4 条 scripts

---

## Task 12: 编写 docs/control-center/README.md

- [ ] 说明控制中心解决的问题
- [ ] 说明如何运行（`pnpm prism:verify`、`pnpm prism:dashboard`、`pnpm prism:dashboard --check`、`pnpm prism:dashboard:test`）
- [ ] 说明各状态定义（PASS / BLOCKED / FAILED / PENDING / WARNING）
- [ ] 说明数据来源（verification.json）
- [ ] 说明 verification.json 结构
- [ ] 说明如何接入 M1-M7
- [ ] 说明如何让测试写入 Browser/Node/Diff/metrics 证据
- [ ] 强调控制中心不是架构事实来源
- [ ] 说明为什么 exit code 0 不等于里程碑完成

**verify**: `cat docs/control-center/README.md` 包含上述全部内容

---

## Task 13: 自审查与清理

- [ ] 运行 `pnpm prism:dashboard:test` 全部通过
- [ ] 运行 `pnpm prism:verify --phase M0` 生成 `verification.json`，M0 状态为 BLOCKED（符合预期）
- [ ] 运行 `pnpm prism:dashboard:check` 退出码为 1（因为 M0 BLOCKED）
- [ ] 启动 `pnpm prism:dashboard`，确认页面可访问
- [ ] `git diff` 确认无修改 packages/**、架构源文档、锁文件
- [ ] `pnpm typecheck` 通过
- [ ] 确认没有新增 npm 依赖

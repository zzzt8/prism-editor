# Proposal: Prism Visual Control Center V0

**change_class**: low
**reason**: 纯本地工具脚本，无业务逻辑变更，不触碰 packages/、架构文档或锁文件。

---

## Why

在 M0 推进过程中，团队需要实时看到：
- M0-M7 各里程碑的当前状态
- 当前阶段为何 BLOCKED / PASS / PENDING
- Browser / Node / Diff / metrics 证据是否存在
- Git 修改是否越界
- 架构文档是否发生变化

目前没有统一视图，所有判断依赖人工记忆和分散的终端输出。Prism Visual Control Center（Prism 可视化控制中心）提供单一真实来源。

---

## What Changes

建立本地可视化控制中心，作为 M0-M7 阶段的仪表盘视图：

1. **`tools/prism-control-center/`** — 主实现
   - `generate.mjs` — 采集所有门禁数据，生成 `verification.json`
   - `verify.mjs` — 运行允许的检查并生成/更新 `verification.json`
   - `serve.mjs` — 启动本地 HTTP server，默认监听 `127.0.0.1`
   - `lib/status.mjs` — 状态模型与判定逻辑
   - `lib/git.mjs` — Git 信息采集
   - `lib/evidence.mjs` — 证据文件存在性检查
   - `lib/source-docs.mjs` — 架构源文档 hash 计算与变化检测
   - `dashboard/index.html` — 单文件静态页面
   - `dashboard/app.js` — 页面逻辑
   - `dashboard/styles.css` — 样式
   - `test/status.test.mjs` — 控制中心自身测试

2. **`docs/control-center/README.md`** — 文档

3. **`package.json`** — 新增 scripts：
   - `prism:verify --phase M0` — 运行检查并生成 `verification.json`
   - `prism:dashboard` — 生成数据后启动本地页面
   - `prism:dashboard --check` — 检查配置和数据后退出
   - `prism:dashboard:test` — 运行控制中心自身测试

4. **`.gitignore`** — 可选，新增 `artifacts/verification/**` 忽略约定

5. **`artifacts/verification/M0/`** — 数据目录约定（M0 无 artifacts，仅占位目录）

---

## Capabilities

- **状态判定**：统一状态模型 PASS / FAILED / BLOCKED / PENDING / WARNING，规则见硬性状态判定规则
- **M0 门禁矩阵**：15+ 项质量门禁，每项含状态、理由、命令、exit code、evidence 路径、执行时间
- **Git 影响范围**：修改文件按 tools / docs / openspec / packages / tests 分类，越界文件红色警告
- **架构文档变化检测**：SHA-256 hash 比对，变化时 stale/warning
- **证据展示**：browser.png / node.png / diff.png / metrics.json 不存在时显示"暂无证据"
- **M1-M7 可扩展**：数据模型支持未来里程碑，每项 milestone 独立采集

---

## Impact

| 区域 | 影响 |
|------|------|
| `tools/prism-control-center/**` | 新增，不修改现有代码 |
| `docs/control-center/**` | 新增，不修改现有文档 |
| `package.json` scripts | 仅增删 scripts，不增依赖 |
| `packages/**` | 仅读取，不修改 |
| 架构源文档 | 仅读取 hash，不修改 |
| 锁文件 | 不修改 |
| M0 测试文件 | 仅读取扫描 skip/todo，不修改 |

---

## Out of Scope

- **不修复 M0**：控制中心只展示和验证，不实现修复
- **不引入新 npm 依赖**：使用 Node.js 内置模块 + 原生 HTML/CSS/JS
- **不修改生产代码**：`packages/**`、`docs/architecture/*`、架构源文档
- **不修改 M0 测试**：不改动 `dual-executor-consistency.test.ts`
- **不是架构事实来源**：所有架构数据来自源文档，控制中心仅作视图
- **不提供 Mermaid runtime**：使用原生 HTML/CSS/SVG 表达架构图
- **不提供数据库或 Storybook**：纯静态页面
- **不接入 CI/CD**：V0 为本地工具
- **不修改锁文件**：不增删任何包版本

---

## 约束

（来自用户原始需求，必须写入 Out of Scope）

1. V0 不增加任何 npm 依赖，不修改锁文件
2. 第一版必须能如实显示当前 M0 状态（M0 应显示 BLOCKED，不能硬编码）
3. 状态必须根据当前仓库实时计算，不把结论硬编码成结果
4. 禁止引入 React、Vue、Mermaid npm 包、数据库、Storybook、dependency-cruiser、VS Code Extension
5. 本次允许修改范围：tools/prism-control-center/**、docs/control-center/**、根 package.json scripts、.gitignore
6. 禁止修改：packages/**、Mall 相关代码、Browser Runtime、Node Runtime、Composer/Dev Tool、M0 测试、架构文档、锁文件

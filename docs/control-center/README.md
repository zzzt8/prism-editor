# Prism Visual Control Center V0

本地可视化控制中心，用于实时展示 Prism M0-M7 里程碑状态与质量门禁矩阵。

---

## 解决的问题

在 M0 推进过程中，团队需要实时看到：
- M0-M7 各里程碑的当前状态（PASS / BLOCKED / FAILED / PENDING / LOCKED）
- 当前阶段为何 BLOCKED 或 PASS
- Browser / Node / Diff / metrics 证据是否存在
- Git 修改是否越界（是否误改了 `packages/`）
- 架构文档（PRISM_TARGET_ARCHITECTURE.md 等）是否发生变化
- 每项质量门禁的判断理由、exit code、evidence 路径

目前这些信息分散在终端输出、测试日志、人工记忆中。Prism Visual Control Center 提供单一真实来源视图。

---

## 架构原则

**控制中心不是架构事实来源。** 所有架构数据来自以下源文档，控制中心仅作视图，不得发明新的架构政策：

- `docs/architecture/PRISM_TARGET_ARCHITECTURE.md`
- `docs/architecture/PRISM_ARCHITECTURE_GUARDRAILS.md`
- `docs/architecture/PRISM_MIGRATION_ROADMAP.md`
- `.cursor/rules/prism-architecture.mdc`

---

## 为什么 exit code 0 不等于里程碑 PASS

M0 的质量门禁不是单一命令。M0 需要验证：

1. Node executor 真实执行（vitest exit code 0 ✓）
2. **Browser executor 真实执行**（当前未配置 @vitest/browser ✗）
3. 双端对照（Browser + Node 都运行才能比较 ✗）
4. 几何比较 evidence（diff.png、metrics.json ✗）
5. 无 skip/todo/only（测试源码扫描 ✓）
6. 确定性（多次运行结果一致 ✓）

即使 vitest 退出码为 0，如果 Browser executor 没有真实执行、没有 evidence 文件，双端一致性验证仍然不完整，M0 不得标记为 PASS。

硬性规则：测试 exit code 为 0，**不等于**里程碑 PASS；任何必要门禁为 BLOCKED，里程碑总状态不得 PASS。

---

## 如何运行

### 生成验证数据

```bash
# 生成 M0 的 verification.json
node tools/prism-control-center/generate.mjs --phase M0
```

### 验证（运行检查 + 生成数据 + 打印摘要）

```bash
pnpm prism:verify --phase M0
```

### 启动本地 Dashboard

```bash
# 先生成数据，再启动 HTTP server（默认监听 127.0.0.1:8080）
pnpm prism:dashboard

# 访问地址
http://127.0.0.1:8080/
```

### 检查模式（仅验证，不启动 server）

```bash
pnpm prism:dashboard:check
# 输出状态摘要，exit code = 门禁状态（0=PASS, 2=BLOCKED/FAILED）
```

### 运行控制中心自身测试

```bash
pnpm prism:dashboard:test
```

---

## 各状态定义

| 状态 | 定义 |
|------|------|
| **PASS** | 命令成功且所有必要证据齐全 |
| **FAILED** | 命令执行失败或数值超过阈值 |
| **BLOCKED** | 核心路径被 skip、必要执行链路未运行、必要证据缺失 |
| **PENDING** | 尚未开始或没有足够信息 |
| **WARNING** | 非阻塞问题（如架构文档变化） |
| **LOCKED** | 上游里程碑未完成，不可进入 |

### 状态优先级（总状态取最严重）

```
BLOCKED > FAILED > WARNING > PASS > PENDING
LOCKED 不参与总状态计算（独立状态）
```

---

## 数据来源

控制中心读取的数据由 `generate.mjs` 生成，写入 `artifacts/verification/M0/verification.json`。

数据文件是**唯一事实来源**，页面只做展示，不做计算。

### verification.json 结构

```json
{
  "schemaVersion": "1.0.0",
  "phase": "M0",
  "overallStatus": "BLOCKED",
  "generatedAt": "2026-07-14T15:45:00.000+08:00",
  "git": {
    "branch": "refactor/prism-runtime-foundation",
    "commit": "a1b2c3d",
    "isDirty": true,
    "modifiedFiles": [...],
    "scopeViolations": [...]
  },
  "sourceDocuments": {
    "docs/architecture/PRISM_TARGET_ARCHITECTURE.md": {
      "hash": "sha256:abc123...",
      "changed": false,
      "lastModified": "2026-07-14"
    }
  },
  "milestones": {
    "M0": { "status": "BLOCKED", "canProceed": false, "progress": 0, "blockers": [...] },
    "M1": { "status": "LOCKED", "canProceed": false }
  },
  "gates": {
    "browser-executor-real-run": {
      "id": "browser-executor-real-run",
      "name": "Browser executor real run",
      "status": "BLOCKED",
      "reason": "...",
      "command": "pnpm --filter @prism/image-ops test:browser",
      "exitCode": null,
      "evidencePath": "packages/image-ops/vitest.browser.config.ts",
      "lastRun": null
    }
  },
  "artifacts": {
    "browser.png": { "exists": false, "path": "artifacts/verification/M0/browser.png" },
    "node.png": { "exists": false, "path": "artifacts/verification/M0/node.png" },
    "diff.png": { "exists": false, "path": "artifacts/verification/M0/diff.png" },
    "metrics.json": { "exists": false, "path": "artifacts/verification/M0/metrics.json" }
  }
}
```

---

## artifacts 目录约定

```
artifacts/
└── verification/
    └── M0/
        ├── verification.json    # 主数据文件（必须，generate.mjs 生成）
        ├── browser.png         # Browser executor 输出图（M0 无，暂无证据）
        ├── node.png            # Node executor 输出图（M0 无，暂无证据）
        ├── diff.png            # 双端差异可视化（M0 无，暂无证据）
        └── metrics.json        # 几何 diff 数值（M0 无，暂无证据）
```

artifacts 目录中的运行产物可以提交或 .gitignore，具体取决于团队协作约定。

---

## 如何接入未来 M1-M7

M1-M7 的接入方式：

1. **扩展 `lib/status.mjs`**：在 `computeGatesM1/M2/...` 函数中定义新里程碑的门禁
2. **扩展 `MILESTONES` 对象**：添加 M1-M7 的名称、描述、完成标准
3. **扩展 `generate.mjs`**：在 `--phase M1` 等参数下调用对应 gate 计算
4. **扩展 `dashboard/app.js`**：在 gate 渲染中显示新里程碑的特有门禁
5. **创建 `artifacts/verification/M1/` 等目录**：存放 M1 及后续阶段的证据文件

不需要修改架构文档或 M0 测试。

---

## 如何让测试写入 Browser / Node / Diff / metrics 证据

M0 测试（`packages/image-ops/src/dual-executor-consistency.test.ts`）目前只在内存中运行，不写磁盘。**控制中心不修改该测试文件**，但未来可以让测试在完成时将输出写入 `artifacts/verification/M0/`：

```
测试完成时：
  1. Node executor 结果 → node.png
  2. Browser executor 结果 → browser.png
  3. 双端差异图（基于 compareGeometry）→ diff.png
  4. 几何 diff 数值（centerDeltaNorm 等）→ metrics.json
```

控制中心会读取这些文件并在 Dashboard 中展示。

---

## 技术约束

- **零新增 npm 依赖**：使用 Node.js 内置模块 + 原生 HTML/CSS/JS
- **不修改锁文件**：不增删任何包版本
- **不修改生产代码**：`packages/**` 仅读取
- **默认监听 127.0.0.1**：安全考虑，不暴露到局域网
- **数据与视图分离**：verification.json 是唯一事实来源

---

## 目录结构

```
tools/prism-control-center/
├── generate.mjs          # 数据生成器
├── verify.mjs            # CLI 验证入口
├── serve.mjs             # HTTP server
├── lib/
│   ├── git.mjs           # Git 信息采集
│   ├── source-docs.mjs   # 架构文档 hash
│   ├── evidence.mjs      # 证据文件检查
│   └── status.mjs        # 状态模型 + gate 计算
├── dashboard/
│   ├── index.html        # 静态页面
│   ├── app.js            # 页面逻辑（vanilla JS）
│   └── styles.css        # 样式
└── test/
    └── status.test.mjs   # 自身测试（Node test runner）
```

# Design: Prism Visual Control Center V0

**change_class**: low

## Goals

1. 提供 M0-M7 里程碑状态的单一真实来源视图
2. 准确反映当前 M0 门禁状态（BLOCKED / PASS / FAILED / PENDING），基于实时数据计算
3. 展示质量门禁矩阵、证据、Git 影响范围、架构文档变化

## Non-Goals

- 不修复 M0 或任何里程碑
- 不引入 npm 依赖
- 不修改生产代码或架构文档
- 不提供 Mermaid / React / 数据库

---

## Architecture

```
tools/prism-control-center/
├── generate.mjs          # 主生成器：采集所有数据 → verification.json
├── verify.mjs            # CLI 入口：prism:verify --phase M0
├── serve.mjs             # CLI 入口：prism:dashboard（启动 HTTP server）
├── lib/
│   ├── status.mjs       # 状态模型 + 判定逻辑（PASS/FAILED/BLOCKED/PENDING/WARNING）
│   ├── git.mjs           # Git 信息采集（branch/commit/dirty/modifiedFiles）
│   ├── evidence.mjs      # 证据文件存在性检查（browser.png/node.png/diff.png/metrics.json）
│   └── source-docs.mjs   # 架构源文档 hash 计算 + 变化检测
├── dashboard/
│   ├── index.html       # 单文件静态页面（内嵌 CSS + JS）
│   ├── app.js            # 页面逻辑：fetch verification.json，渲染 UI
│   └── styles.css        # 样式（桌面端响应式）
└── test/
    └── status.test.mjs  # 控制中心自身测试（Node test runner）

docs/control-center/
└── README.md             # 使用说明、数据格式、未来 M1-M7 接入方式

artifacts/verification/
└── M0/                   # M0 运行产物（目录约定，数据由 generate.mjs 写入）
    ├── verification.json  # 主数据文件（JSON，页面读取的唯一来源）
    ├── browser.png       # Browser executor 输出图
    ├── node.png          # Node executor 输出图
    ├── diff.png          # 双端差异图
    └── metrics.json      # 几何 diff 数值
```

---

## Data Flow

```
1. generate.mjs (或 verify.mjs --phase M0)
   ├─ git.mjs:      git branch / commit / dirty / modifiedFiles
   ├─ source-docs.mjs: SHA-256 hash of PRISM_TARGET_ARCHITECTURE.md 等
   ├─ evidence.mjs: 检查 artifacts/verification/M0/{browser.png,node.png,diff.png,metrics.json}
   ├─ status.mjs:   执行 vitest 命令，扫描 skip/todo，判定每个 gate 状态
   └─ 写入 artifacts/verification/M0/verification.json

2. serve.mjs
   ├─ 可选：先调用 generate.mjs（如果 --generate 标志或文件不存在）
   └─ 启动 Node http server，静态服务 dashboard/ 目录，监听 127.0.0.1:PORT

3. index.html (browser)
   ├─ fetch('../artifacts/verification/M0/verification.json')
   ├─ 渲染：Header / Roadmap / Architecture View / Gate Matrix / Evidence / Blockers / Git Impact
   └─ 无 JS 框架，纯原生 DOM 操作
```

---

## Status Model

### 统一状态值

| 状态 | 定义 |
|------|------|
| **PASS** | 命令成功且所有必要证据齐全 |
| **FAILED** | 命令执行失败或数值超过阈值 |
| **BLOCKED** | 核心路径被 skip、必要执行链路未运行、必要证据缺失 |
| **PENDING** | 尚未开始或没有足够信息 |
| **WARNING** | 非阻塞问题（如修改了允许范围但非核心区域） |

### 硬性状态判定规则

1. 测试 exit code 为 0，**不等于**里程碑 PASS
2. 核心测试存在 `it.skip` / `test.skip` / `describe.skip` / `todo` / `only` 时，相关门禁不得 PASS
3. Browser executor 没有真实执行时，"双端一致性"门禁不得 PASS
4. 缺少 `browser.png` / `node.png` / `diff.png` / `metrics.json` 时，对应证据门禁不得 PASS
5. 只验证 Node 自身确定性，不能替代 Browser/Node 一致性
6. 任何必要门禁为 BLOCKED 或 FAILED，里程碑总状态不得 PASS
7. M0 未通过时，M1-M7 必须显示"不可进入"
8. 不允许通过隐藏测试、修改阈值或删除失败项让页面变绿

### 里程碑总状态计算

```
总状态 = 最严重门禁状态
BLOCKED > FAILED > WARNING > PASS
PENDING 不影响总状态计算（信息不足时尚未开始）
```

---

## verification.json Schema

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
    "modifiedFiles": [
      {
        "path": "tools/prism-control-center/generate.mjs",
        "category": "tools",
        "inScope": true
      }
    ],
    "scopeViolations": []
  },
  "sourceDocuments": {
    "PRISM_TARGET_ARCHITECTURE.md": {
      "path": "docs/architecture/PRISM_TARGET_ARCHITECTURE.md",
      "hash": "sha256:abc123...",
      "lastModified": "2026-07-14",
      "changed": false
    }
  },
  "milestones": {
    "M0": {
      "status": "BLOCKED",
      "canProceed": false,
      "progress": 0,
      "blockers": [...]
    },
    "M1": { "status": "LOCKED", "canProceed": false }
  },
  "gates": [
    {
      "id": "browser-executor-real-run",
      "name": "Browser executor real run",
      "status": "BLOCKED",
      "reason": "...",
      "command": null,
      "exitCode": null,
      "evidencePath": null,
      "lastRun": null
    }
  ],
  "artifacts": {
    "browser.png": { "exists": false, "path": "artifacts/verification/M0/browser.png" },
    "node.png": { "exists": false, "path": "artifacts/verification/M0/node.png" },
    "diff.png": { "exists": false, "path": "artifacts/verification/M0/diff.png" },
    "metrics.json": { "exists": false, "path": "artifacts/verification/M0/metrics.json" }
  }
}
```

---

## M0 Gate Definitions

| Gate ID | Name | PASS 条件 | 当前值来源 |
|----------|------|-----------|-----------|
| `scope-clean` | Scope clean | git diff 无 packages/** 修改 | git.mjs |
| `node-executor-real-run` | Node executor real run | vitest exit code 0 | spawn |
| `browser-executor-real-run` | Browser executor real run | @vitest/browser + playwright 运行 dual-executor 测试 | vitest.browser.config.ts 检查 |
| `same-fixture` | Same fixture / same input | 测试使用程序化 fixture | 源码扫描 |
| `browser-node-comparison` | Browser vs Node comparison | Browser 真实执行并对照 | evidence 检查 |
| `geometry-comparison` | Geometry comparison | diff.png 存在且数值 < 阈值 | evidence 检查 |
| `browser-image-evidence` | Browser image evidence | browser.png 存在 | evidence 检查 |
| `node-image-evidence` | Node image evidence | node.png 存在 | evidence 检查 |
| `diff-image-evidence` | Diff image evidence | diff.png 存在 | evidence 检查 |
| `metrics-json-evidence` | metrics.json evidence | metrics.json 存在且数值合法 | evidence 检查 |
| `no-skip-todo-only` | No skip/todo/only in core tests | 源码扫描 skip=0 | 源码扫描 |
| `deterministic` | Deterministic repeated execution | 确定性测试通过 | vitest output |
| `typecheck` | Typecheck | tsc exit code 0 | spawn |
| `relevant-test-command` | Relevant test command exit code | vitest exit code 0 | spawn |
| `build` | Build | pnpm build exit code 0 | spawn |

---

## Alternative Approaches Considered

### A: 直接在 CI 输出页面

- 优点：无需独立工具
- 缺点：每次查看需要跑 CI，不适合本地快速迭代；无法实时反映 working directory 状态

### B: 接入现有 Dashboard（如 Vitest UI）

- 优点：无需新工具
- 缺点：Vitest UI 不展示 M0-M7 路线图、架构视图、Git 影响范围、证据矩阵；不符合需求

### C: 用 React/Vue SPA

- 优点：开发效率高
- 缺点：引入 npm 依赖（React/Vue），违反"零新依赖"约束；增加复杂度

### D: 用 JSON 报告 + 静态 HTML（**采用**）

- 优点：零新依赖，Node 内置 + 原生 HTML/CSS/JS；数据与视图分离；易于扩展 M1-M7
- 缺点：需要额外的 HTTP server（但 Node `http` 模块即可满足）

---

## Key Design Decisions

### Decision 1: 数据与视图分离

`verification.json` 是唯一事实来源。页面只做展示，不做计算。这样：
- generate.mjs 可以独立使用（CI / CLI）
- 页面可以缓存旧数据离线查看
- 未来可以替换视图实现（不需要重新采集）

### Decision 2: 零新依赖

使用 Node.js 内置模块：
- `http` — HTTP server
- `crypto` — SHA-256 hash
- `child_process` — git / vitest / tsc / build
- `fs` / `path` — 文件操作
- `node:test` — 控制中心自身测试

原生 HTML/CSS/JS：
- 无框架
- 无 npm 包
- 可用 `<template>` + `cloneNode()` 做列表渲染

### Decision 3: 默认只监听 127.0.0.1

安全考虑：控制中心处理的是本地开发信息（git 状态、测试输出），不应暴露到局域网。

### Decision 4: M0 状态动态计算

不硬编码 M0 = BLOCKED。门禁状态由 generate.mjs 在运行时计算：
- 通过实际执行命令获取 exit code
- 通过源码扫描获取 skip/todo 数量
- 通过文件存在性检查获取 evidence 状态
- 通过 git diff 判断 scope violation

未来 M0 通过时，页面会自动更新为 PASS，无需修改代码。

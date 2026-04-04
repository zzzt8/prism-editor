# Debug Analysis

> Change: project-cleanup-simplification
> Status: ✅ 已解决

## 症状

**问题**：dev-tool 和 user-app 两个 UI 都无法启动

**错误信息**：
```
[plugin:vite:import-analysis] Failed to resolve import "./Panel.module.css"
from "../../packages/shared-ui/dist/src/components/Panel/Panel.js"
```

## 根因分析

### 调用链

```
pnpm dev
  → Vite 启动
    → 解析 @prism/shared-ui 导入
      → 读取 package.json exports 配置
        → 指向 dist/src/index.js
          → dist/src/components/index.js
            → 重新导出所有组件
              → Panel.js 被导入
                → Panel.js 包含: import styles from './Panel.module.css'
                  → ./Panel.module.css 在 dist 中不存在！
                    → [ERROR]
```

### 可能原因

| # | 原因 | 概率 | 证据 | 影响 |
|---|------|------|------|------|
| 1 | TypeScript 构建不复制 .css 文件到 dist | **高** | dist 目录只有 .js/.d.ts，没有 .module.css | 所有使用 CSS modules 的组件都无法工作 |
| 2 | shared-ui 之前就缺少 CSS 文件 | 中 | 提交前没有 import 共享组件 | 问题是隐藏的 |

### 最可能根因

**TypeScript `tsc --build` 只编译 .ts/.tsx 文件，不复制 .css 文件**

shared-ui 的所有组件都使用 CSS modules：
- `Panel.module.css`
- `Button.module.css`
- `Input.module.css`
- 等等...

当 package.json 的 exports 指向 dist 时，Vite 会尝试从 dist 导入组件，但 dist 中没有 .css 文件。

## 修复假设

### 方案 1：在 shared-ui 添加 postbuild 脚本复制 CSS 文件

```json
{
  "scripts": {
    "build": "tsc --build && pnpm copy:css",
    "copy:css": "node scripts/copy-css.js"
  }
}
```

### 方案 2：让 apps 直接从 src 导入（修改 vite alias）

```ts
// vite.config.ts
resolve: {
  alias: {
    '~@prism/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
  }
}
```

但这只解决了 dev 模式，prod build 还是会有问题。

### 方案 3：修改 shared-ui 使用全局 CSS 而不是 CSS modules

把所有 `.module.css` 内容合并到一个 `components.css` 文件中导出。

**选择方案 1**：最干净，不需要改代码，只改构建流程。

## 修复步骤

1. 创建 `packages/shared-ui/scripts/copy-css.js` 脚本
2. 在 `package.json` 的 build 脚本中添加调用
3. 重新构建 shared-ui
4. 验证 dev-tool 和 user-app 能启动

## 待验证点

- [ ] dev-tool 能启动 (`pnpm dev`)
- [ ] user-app 能启动 (`pnpm dev --filter @prism/user-app`)
- [ ] `pnpm build --filter @prism/dev-tool` 能成功

## 修复记录

### Attempt 1 (2026-04-04)

**修复内容**：
1. 创建 `packages/shared-ui/scripts/copy-css.js` 脚本
2. 更新 `packages/shared-ui/package.json` 的 build 脚本为 `tsc --build && node scripts/copy-css.js`

**验证结果**：✅ 成功

- dev-tool 构建成功 ✓
- user-app 构建成功 ✓
- TypeScript 检查通过 ✓

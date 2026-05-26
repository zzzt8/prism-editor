# design: fix-e2e-test-imports

## Goals

1. 修复 20 个 e2e 测试失败
2. 确保测试正确导入所有依赖函数
3. 不改变任何运行时逻辑

## Non-Goals

- 不修改 image-ops 的导出结构
- 不修改任何生产代码
- 不添加新功能

## Decisions

### 根因分析

`@prism/image-ops` 包的 `package.json` exports 配置：

```json
".": {
  "browser": "./src/index.ts",
  "node": "./src/nodejs/index.ts",
  "default": "./src/index.ts"
}
```

在 Node.js 测试环境中，`import from '@prism/image-ops'` 解析到 `node` 字段指向的 `./src/nodejs/index.ts`。但 `nodejs/index.ts` 只导出 3 个 executor（composite、crop、export），不导出 `applyMask`、`compositeImages`、`exportImage` 等函数。

因此 `published-executor.e2e.test.ts` 的导入失败。

### 修复方案

使用相对路径直接从源文件导入，避免受到 package exports 路由影响：

| 函数 | 导入来源 |
|------|----------|
| `applyMask` | `@prism/image-ops/apply-mask` |
| `compositeImages` | `@prism/image-ops/composite` |
| `exportImage` | `@prism/image-ops/export-image` |

这些都是 `@prism/image-ops` 包的子路径 entry points，不受 `exports["."]` 的 `node` 字段路由影响。

### 替代方案考虑

1. **修改 package.json exports** - 不推荐，会影响生产环境的导入行为
2. **在 image-ops 中 re-export** - 不推荐，增加不必要的耦合
3. **使用绝对路径** - 不推荐，monorepo 中应使用 workspace 导入

## Simplified Review Checklist

- [ ] 导入路径正确（使用子路径）
- [ ] 类型兼容性（`canvas.ImageData` → `@prism/shared-types` ImageData）
- [ ] 所有 20 个测试通过

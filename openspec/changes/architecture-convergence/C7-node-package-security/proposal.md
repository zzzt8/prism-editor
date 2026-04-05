# C7: 节点包安全边界

> 派生自 meta-change: `architecture-convergence`

## Why

当前运行时已能 parseInlineExecutor、代理 URL executor，但无沙箱隔离。OpenSpec 把自定义节点视作生态核心，必须先上安全边界才能作为产品卖点。

## What Changes

- 加 manifest 白名单校验
- 版本签名验证
- worker 隔离（inline executor）
- source policy（inline / url / package 的信任级别）
- URL 前缀白名单

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| runtime | `apps/user-app/src/modules/node-runtime/nodePackageLoader.ts` | 安全逻辑 |
| engine | `packages/core/src/executorUtils.ts` | sandbox eval |

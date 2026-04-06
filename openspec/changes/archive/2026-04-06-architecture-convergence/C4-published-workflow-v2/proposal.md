# C4: PublishedWorkflow V2 协议收紧

> 派生自 meta-change: `architecture-convergence`

## Why

PublishedWorkflowExecutor 同时兼容 legacy pw.inputs[] 和 v2 config.inputs[]，说明协议仍在演化。声明 V2 后，publish 入口统一写 V2，runtime 保留 legacy 读兼容但不写。这样每加一个运行时能力，不用再问"legacy 还是 v2"。

## What Changes

- 宣布 `config.nodeTypes` 存在为 V2 唯一标识
- publish 入口统一检查并写入 V2
- runtime 保留 legacy 只读兼容
- 添加 migration script 补齐旧数据

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| engine | `packages/workflow-core/src/published-executor.ts` | 移除硬编码版本错误 |
| backend | `server/src/routes/published.ts` | publish 入口统一检查 |
| editor | `apps/dev-tool/src/components/header/PublishDialog.tsx` | V2 格式输出 |

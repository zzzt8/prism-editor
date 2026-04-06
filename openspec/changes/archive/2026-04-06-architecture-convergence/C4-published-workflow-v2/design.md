# C4: PublishedWorkflow V2 协议收紧

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. V2 协议标识

`config.nodeTypes` 存在即为 V2。

```typescript
// V2 判断逻辑
const isV2 = pw.config?.nodeTypes && Object.keys(pw.config.nodeTypes).length > 0;
```

## 2. 写入约束

**所有 publish 入口必须写入 V2**：
- `config.nodeTypes`：nodeId → nodeType
- `config.nodeConfigs`：nodeId → { params, _internalParams }
- `config.connections`：连线数组
- `config.inputs`：PublishedInputConfig[]
- `config.outputs`：PublishedOutputConfig[]

**禁止**写入 legacy 格式。

## 3. 读取兼容

runtime 保留 legacy 只读：
- `pw.inputs[].id` 格式 `{nodeId}:{portId}` → 仍支持
- `config.inputs[].nodeId` 格式 → V2 主路径

## 4. Migration Script

把旧 published 数据补齐 V2 字段：
- 从 `nodes` 数组重建 `config.nodeTypes`
- 从 `nodeParams` 重建 `config.nodeConfigs`
- 从连接关系重建 `config.connections`
- 推断 `config.inputs` / `config.outputs`

# @prism/node-definitions

节点元信息包，定义所有节点类型的元数据、输入输出端口、参数配置和 UI 展示。

## 功能

- **节点定义注册**: 集中管理所有内置和自定义节点
- **端口配置**: 定义节点的输入/输出端口及数据类型
- **参数模式**: 定义节点可配置参数的 Schema
- **UI 配置**: 定义节点在编辑器中的展示样式
- **分类管理**: 按功能对节点进行分类

## 节点分类

| 分类 | 节点 | 描述 |
|------|------|------|
| **输入** | LoadImage | 从 URL/文件/Blob 加载图像 |
| **输入** | LoadMask | 加载蒙版图像 |
| **处理** | Transform | 裁剪、缩放、旋转、平移 |
| **处理** | ApplyMask | 应用蒙版 |
| **处理** | Composite | 图像合成 |
| **输出** | Export | 导出图像 |

## 核心 API

### 获取节点定义

```typescript
import { getNodeDefinitions, getNodeDefinition } from '@prism/node-definitions';

const allNodes = getNodeDefinitions();
const loadImageNode = getNodeDefinition('LoadImage');
```

### 节点元数据结构

```typescript
interface NodeDefinition {
  type: string;              // 节点类型标识
  category: string;          // 分类
  label: string;             // 显示名称
  description: string;      // 描述
  inputs: PortDefinition[];  // 输入端口
  outputs: PortDefinition[]; // 输出端口
  parameters: ParameterDefinition[]; // 可配置参数
  ui: UIConfig;             // UI 配置
}
```

### 注册自定义节点

```typescript
import { registerNodeDefinition } from '@prism/node-definitions';

registerNodeDefinition({
  type: 'custom-node',
  category: 'custom',
  label: 'Custom Node',
  inputs: [...],
  outputs: [...],
  parameters: [...],
  ui: {...}
});
```

## 依赖

- `@prism/shared-types` - 共享类型定义

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm clean` | 清理构建产物 |

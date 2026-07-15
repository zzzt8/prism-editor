# @prism/node-definitions

节点元信息包，定义所有内置节点类型的元数据：输入 / 输出端口、参数 Schema、UI 配置、平台支持。被 `@prism/core` 的 `globalRegistry` 消费，也是 dev-tool 节点面板 / Inspector 渲染的数据源。

## 功能

- **内置节点定义**: 7 个内置节点（load-image / load-mask / apply-mask / composite / transform / export / empty-input）
- **节点注册表接口**: `createRegistry` / `registerBuiltIn` / `registerCustom` / `getDefinition` / `listAll` / `listByCategory` / `listByPlatform`
- **端口配置**: 每个节点的输入 / 输出端口（id / name / type / dataType / required / description）
- **参数 Schema**: `params` 数组声明可配置参数（id / name / type / default / min / max / options / description）
- **UI 配置**: 节点在编辑器中的展示（颜色、图标、布局）
- **平台支持**: `platforms: ['browser'] | ['nodejs'] | ['both']`
- **分类管理**: `category: 'input' | 'transform' | 'mask' | 'composite' | 'output'`

## 内置节点

| 类型 | 分类 | 描述 |
|------|------|------|
| `load-image` | input | 从文件 / URL / Blob 加载图像（ComfyUI Load Image 风格） |
| `load-mask` | input | 加载蒙版图像（alpha / brightness / luminance） |
| `apply-mask` | mask | 对图像应用蒙版（alpha / brightness / luminance） |
| `composite` | composite | 多图合成，支持动态 `overlayN` 端口（最多 8 个） |
| `transform` | transform | 裁剪 / 缩放 / 旋转 / 平移 |
| `export` | output | 导出为 PNG / JPEG / WebP，可选尺寸调整 |
| `empty-input` | input | 不参与图像流，仅作为参数入口 |

## 核心 API

### 创建注册表

```typescript
import { createRegistry } from '@prism/node-definitions';

const registry = createRegistry(); // 包含全部内置定义
```

### 注册自定义节点

```typescript
import { registerCustom } from '@prism/node-definitions';

registerCustom(registry, {
  type: 'custom-blur',
  category: 'transform',
  label: 'Custom Blur',
  description: 'High-performance box blur',
  version: '1.0.0',
  platforms: ['browser', 'nodejs'],
  inputs: [
    { id: 'image', name: 'Image', type: 'image', dataType: 'image', required: true },
  ],
  outputs: [
    { id: 'image', name: 'Image', type: 'image', dataType: 'image', required: true },
  ],
  params: [
    { id: 'radius', name: 'Radius', type: 'number', default: 3, min: 1, max: 50 },
  ],
  ui: { color: '#a855f7', icon: 'sparkles' },
});
```

### 查询节点

```typescript
import {
  getDefinition,
  listAll,
  listByCategory,
  listByPlatform,
  getAllDefinitions,
} from '@prism/node-definitions';

const def = getDefinition(registry, 'load-image');
const all = listAll(registry);
const inputNodes = listByCategory(registry, 'input');
const browserNodes = listByPlatform(registry, 'browser');
const allBuiltIn = getAllDefinitions(); // 便捷函数，无需手动建注册表
```

## 节点元数据结构

```typescript
interface NodeDefinition {
  type: string;                          // 程序化标识（kebab-case）
  category: 'input' | 'transform' | 'mask' | 'composite' | 'output';
  label: string;                         // 显示名（Title Case）
  description: string;                   // 描述
  version: string;                       // 节点 schema 版本
  platforms?: Array<'browser' | 'nodejs' | 'both'>;
  inputs: PortDefinition[];              // 输入端口
  outputs: PortDefinition[];             // 输出端口
  params: ParamDefinition[];             // 参数定义
  ui?: UIConfig;                         // UI 配置
}

interface PortDefinition {
  id: string;                            // 程序化标识（Layer 1：真相源）
  name: string;                          // 显示名
  type: 'image' | 'mask' | 'number' | 'string' | 'boolean' | 'file';
  dataType: PortDataType;                // 'image' | 'mask' | 'number' | 'string' | 'boolean' | 'file' | ...
  required?: boolean;
  description?: string;
}

interface ParamDefinition {
  id: string;                            // 参数 id
  name: string;                          // 显示名
  type: 'string' | 'number' | 'select' | 'boolean' | 'image-file' | 'text';
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: unknown }>;
  required?: boolean;
  description?: string;
  validation?: { min?, max?, pattern? };
}
```

## 端口命名约定

端口 ID（Layer 1）是**单一真相源**，所有代码必须用 `port.id` 访问 input / output，不能用 `port.name`：

| Layer | 名称 | 用途 |
|-------|------|------|
| 1 | Port ID（kebab-case） | `ctx.requireInput('mask')`、`inputs['mask']` — 程序化标识 |
| 2 | Port Name（Title Case） | 仅 UI 显示用 |
| 3 | Handle ID（React Flow） | 必须等于 `port.id` |
| 4 | Parameter ID（kebab-case） | `params['blend-mode']` |

## 目录结构

```
packages/node-definitions/
├── src/
│   ├── definitions.ts          # 7 个内置节点定义常量
│   ├── registry.ts             # createRegistry / registerBuiltIn / registerCustom / 查询函数
│   ├── definitions.test.ts
│   └── index.ts                # barrel export
├── package.json
└── README.md
```

## 依赖

- `@prism/shared-types` - 共享类型定义（`NodeDefinition` / `PortDefinition` / `ParamDefinition` / `PortDataType` / `NODE_CATEGORIES`）

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm clean` | 清理构建产物 |

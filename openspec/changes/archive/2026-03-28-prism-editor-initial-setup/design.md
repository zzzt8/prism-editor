# Prism Editor - 技术设计

## Context

Prism Editor 是一个前端优先执行的可视化低代码图像工作流系统。项目需要同时支持：

- **开发者端**：节点式画布编辑器，用于搭建和调试工作流
- **用户端**：极简运行界面，用于执行已发布的工作流

两个端共享核心引擎，但 UI 和交互逻辑完全不同。技术选型需要平衡：
- 开发效率（快速构建节点编辑器）
- 性能（图像处理在前端执行）
- 可维护性（共享代码不重复）
- 可扩展性（支持后续添加更多节点和能力）

## Goals / Non-Goals

**Goals:**
- 采用 Monorepo 架构，共享核心代码，双端独立构建
- 开发者端使用成熟的节点编辑器库（React Flow）作为底座
- 工作流以 JSON 格式定义，与 UI 渲染分离
- 图像处理使用 Canvas API 或 OffscreenCanvas，确保性能
- 节点定义与执行逻辑分离，便于扩展节点库
- 开发态与发布态工作流使用不同的数据结构

**Non-Goals:**
- 不实现通用 Photoshop 功能
- 不实现后端服务和数据库
- 不实现复杂权限和协作系统
- 不实现插件市场和脚本语言

## Decisions

### 1. Monorepo 架构

**决策**：使用 pnpm workspace + Turborepo

**原因**：
- 两个应用（dev-tool、user-app）共享核心包
- 便于代码复用和统一版本管理
- Turborepo 提供构建缓存和任务编排

**目录结构**：
```
prism-editor/
├── apps/
│   ├── dev-tool/      # 开发者工具
│   └── user-app/      # 用户运行端
├── packages/
│   ├── workflow-core/       # 工作流核心引擎
│   ├── node-definitions/     # 节点元信息
│   ├── image-ops/           # 图像处理实现
│   └── shared-types/        # 共享类型定义
├── openspec/                 # OpenSpec 配置
└── package.json
```

**替代方案**：
- 单仓库多包：不利于独立部署和维护
- 多仓库：共享代码需要通过 npm 包管理，增加发布流程复杂度

### 2. 节点编辑器底座

**决策**：使用 React Flow 作为节点编辑器底座

**原因**：
- React 生态成熟，与 TypeScript 配合良好
- 内置节点、连线的交互和渲染
- 支持自定义节点组件和样式
- 社区活跃，文档完善

**替代方案**：
- 自研节点编辑器：开发周期长，bug 风险高
- Rete.js：React 集成不如 React Flow 原生
- GoJS/X6：更通用，但学习曲线陡峭

### 3. 图像处理引擎

**决策**：使用 Canvas 2D API + OffscreenCanvas

**原因**：
- 浏览器原生支持，无需额外依赖
- Canvas 2D API 覆盖大部分图像处理需求（裁切、缩放、旋转、混合等）
- OffscreenCanvas 支持 Web Worker 并行处理

**替代方案**：
- PixiJS：功能强大但体积较大，适合游戏而非工作流
- Fabric.js：更面向设计工具，学习成本较高
- WebGL：性能最优，但开发复杂度高，MVP 阶段不必要

### 4. 工作流定义格式

**决策**：工作流使用 JSON Schema 定义

**结构**：
```typescript
interface Workflow {
  id: string;
  name: string;
  version: string;
  nodes: Node[];
  connections: Connection[];
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
}

interface Node {
  id: string;
  type: string;  // 节点类型，关联 node-definitions
  position: { x: number; y: number };
  params: Record<string, any>;
}

interface Connection {
  from: { nodeId: string; port: string };
  to: { nodeId: string; port: string };
}
```

**原因**：
- JSON 可序列化，便于保存和传输
- 纯数据定义，与 UI 渲染分离
- 便于后续扩展字段（如元信息、版本历史）

### 5. 节点定义结构

**决策**：节点定义包含元信息和执行函数两部分

**结构**：
```typescript
// 节点元信息 (node-definitions)
interface NodeDefinition {
  type: string;
  category: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  params: ParamDefinition[];
}

// 执行实现 (image-ops)
const nodeImplementations: Record<string, NodeExecutor> = {
  'load-image': async (inputs, params, ctx) => { /* ... */ },
  'transform': async (inputs, params, ctx) => { /* ... */ },
};
```

**原因**：
- 元信息驱动 UI 渲染（参数面板、连线验证）
- 实现与定义分离，便于扩展
- 支持节点能力库的独立演进

### 6. 开发态 vs 发布态

**决策**：使用不同的数据结构

**开发态 Workflow**：
```typescript
interface DevWorkflow {
  id: string;
  name: string;
  nodes: Node[];           // 完整节点
  connections: Connection[];
  metadata: WorkflowMetadata;
}
```

**发布态 Workflow**：
```typescript
interface PublishedWorkflow {
  id: string;
  sourceId: string;        // 关联源工作流
  inputs: PublishedInput[];
  outputs: PublishedOutput[];
  config: PublishedConfig; // 固定的内部参数
}
```

**原因**：
- 开发态保留所有调试信息
- 发布态隐藏实现细节，只暴露必要接口
- 便于后续增加版本管理和回滚

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Canvas 性能瓶颈 | 大图、多层处理可能卡顿 | 使用 OffscreenCanvas 分流；限制单次处理尺寸 |
| React Flow 定制限制 | 特殊交互可能受限 | 使用 Hooks 和自定义组件扩展；必要时 fork |
| 工作流 JSON 结构演进 | 后续字段变更兼容 | 使用 Schema 验证；设计版本字段 |
| 前端执行不确定性 | 不同浏览器渲染差异 | 使用统一的 Canvas 实现；测试主流浏览器 |

## Open Questions

~~1. **节点数据传递**：当前设计使用内存中的图像对象，是否需要引入持久化层（如 IndexedDB）？~~
2. **批量节点执行**：多个独立工作流同时运行时，是否需要任务队列管理？
~~3. **用户端状态管理**：是否需要引入 Redux/Zustand，或使用 React Context 足够？~~
4. **拖拽素材支持**：用户是否可以拖拽本地图片到画布？

> ~~删除线~~ 表示已解答的问题，见下方决策。

## Answered Questions

### Answered: 节点数据传递（Open Question 1）

**决策**：使用 URL.createObjectURL 传递图像引用，执行时才读取内存

直接传递 ImageData 会导致浏览器内存溢出。采用引用传递方式：

```typescript
interface ImageRef {
  type: 'blob-url' | 'data-url' | 'cross-origin-url';
  url: string;
  width: number;
  height: number;
  mimeType: string;
  cleanup?: () => void;  // 清理函数
}
```

**执行时读取内存**：
```typescript
async function executeLoadImage(ctx: ExecutionContext) {
  // 创建 Blob URL（不占用主线程内存）
  const blob = await fetch(imageUrl).then(r => r.blob());
  const objectUrl = URL.createObjectURL(blob);

  // 只在真正需要绘制时才读取 ImageData
  const imageData = await loadImageData(objectUrl);

  return { imageData, previewUrl: objectUrl };
}
```

**内存管理**：
- 节点输出传递 URL 引用而非 ImageData
- ImageMemoryManager 统一管理 ObjectURL 的生命周期
- 执行完成后自动 revoke ObjectURL

### Answered: 用户端状态管理（Open Question 3）

**决策**：开发者端引入 Zustand，用户端可选

**开发者端（必须）**：
```typescript
// Zustand 是必须选择，原因：
// 1. React Flow 画布中节点位置拖拽、参数高频变动
// 2. React Context 会导致全局重渲染，性能灾难
// 3. Zustand 的原子化更新完美解决高频更新问题
interface CanvasStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  viewport: { x: number; y: number; zoom: number };
  // ...
}
```

**用户端（可选）**：
- 简单场景：React 组件内部状态足够
- 复杂场景：可引入 Zustand 管理参数状态

详见 `enhance-architecture-resilience` 变更。

### Answered: CORS 处理

**决策**：在图像加载早期统一处理 CORS 问题

**问题**：跨域图片加载到 Canvas 后调用 toDataURL/toBlob 会触发安全错误。

**解决方案**：
```typescript
// 图片加载时设置 crossOrigin 属性
async function loadCrossOriginImage(url: string): Promise<ImageData> {
  const img = new Image();
  img.crossOrigin = 'anonymous';  // 必须设置！

  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Canvas 读取跨域图片，设置 crossOrigin 后不会污染
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}
```

**CDN/云存储配置要求**：
- 源站必须设置 `Access-Control-Allow-Origin` 响应头
- 推荐设置 `Access-Control-Allow-Origin: *` 或具体域名

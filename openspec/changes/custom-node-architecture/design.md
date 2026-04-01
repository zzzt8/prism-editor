## Context

当前系统已具备扩展性基础设施，但散落各处、未连接：

- `packages/node-definitions/src/registry.ts`: `registerCustom()` 函数存在但从未调用
- `packages/workflow-core/src/executor.ts`: `executor.register()` 方法存在但从未调用
- `apps/dev-tool/src/store/canvasStore.ts`: `executeWorkflow()` 每次创建新 executor，只注入内置 `imageOpsExecutors`
- `apps/dev-tool/src/components/NodePanel.tsx`: "自定义节点"按钮已有 UI，但逻辑是 TODO

```
现状：
  executeWorkflow() ──→ imageOpsExecutors (静态) ──→ 自定义 executor 被忽略
  createRegistry() ──→ 新建 Map ──→ 每次重建，内置节点重复注册
  NodePanel ──→ 自己的 registry ──→ 与 executor 的 registry 隔离
```

Dev Tool 需要成为开发者平台，User App 需要执行包含自定义节点的工作流。这要求架构层面的改造。

## Goals / Non-Goals

**Goals:**
- 创建全局 Registry 单例，替代 `createRegistry()` 的模块级调用
- 改造 `executeWorkflow()` 使用全局 Registry 的 executors
- 连接 NodePanel 的自定义节点按钮，实现导入 UI
- 定义节点包格式，支持第三方节点分发
- 实现动态加载机制，支持 Web Worker 中的自定义 executor

**Non-Goals:**
- 不实现节点市场 UI（见 `node-marketplace` 提案）
- 不实现节点包的发布/分发服务
- 不改变内置节点的定义和 executor 实现
- 不实现节点的版本管理
- 不实现节点的安全沙箱（初期信任开发者）

## Decisions

### 决策 1: 使用全局单例 Registry 而非依赖注入

**选择**: `packages/core/src/globalRegistry.ts` — 模块级单例

**理由**:
- 改动最小：现有 `createRegistry()` 改为 `globalRegistry`，内部逻辑不变
- 所有消费者共享同一个 Registry，自定义节点自动对所有组件可见
- 比 React Context / 依赖注入更简单，避免 Prop Drilling

**工具文档**:
- Singleton Pattern: https://refactoring.guru/design-patterns/singleton
- Zustand 也使用类似模式（全局 store）

**替代方案**:
- React Context: 需要在 App 顶层注入，适合需要 React 组件树的场景，这里不需要
- 依赖注入 (IoC): 增加复杂度，适合大型团队，这里不需要

---

### 决策 2: executor 与节点定义分离注册

**选择**: `globalRegistry.registerNode()` 和 `globalRegistry.registerExecutor()` 分开调用

**理由**:
- `NodeDefinition` (元数据) 和 `NodeExecutor` (执行逻辑) 是不同关注点
- 允许开发者只提供定义，不提供 executor（使用默认透传 executor）
- 灵活组合：同一类型可有多个 executor（按版本、环境等）

**替代方案**:
- 合并注册 (`registerNode(definition, executor)`): 强制绑定，不够灵活
- 只注册 executor (从 definition 推断): 不够灵活，无法注册纯元数据节点

---

### 决策 3: 节点包格式使用 JSON + 内联 JS

**选择**: 节点包包含 `definition` (JSON) + `executor` (内联函数或 URL)

**理由**:
- 简单：不需要打包工具，开发者直接写 JSON + JS
- 灵活：支持内联 executor（简单节点）或 URL 引用（复杂节点）
- 可验证：JSON Schema 验证 definition，内联 executor 直接执行

**工具文档**:
- JSON Schema: https://json-schema.org/
- Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- importScripts: https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts

**节点包结构**:
```json
{
  "name": "prism-node-gsap-animation",
  "version": "1.0.0",
  "definition": {
    "type": "gsap-animation",
    "category": "animation",
    "label": "GSAP 动画",
    "description": "使用 GSAP 执行图像动画",
    "inputs": [...],
    "outputs": [...],
    "params": [...]
  },
  "executor": {
    "type": "inline" | "url",
    "code": "..." | "https://cdn.example.com/executors/gsap.js"
  }
}
```

**替代方案**:
- 打包成 ESM bundle: 需要 Vite/Webpack 打包，开发者门槛高
- WASM: 性能好但开发复杂度高，适合计算密集型节点

---

### 决策 4: 动态加载使用 Web Worker + importScripts

**选择**: 在 Web Worker 中使用 `importScripts` 加载 executor bundle

**理由**:
- `importScripts` 是 Web Worker 的标准 API，跨域加载无限制
- Executor 在 Worker 中执行，不阻塞主线程
- 可以预加载 Worker，减少执行时延迟

**工具文档**:
- Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- Comlink: https://github.com/GoogleChrome/comlink — 已在 image-ops 使用
- Worker Pool: `packages/image-ops/src/scheduler/workerPool.ts` — 可复用

**执行流程**:
```
用户点击"导入节点包"
    ↓
验证 JSON Schema
    ↓
executor.code 是 URL → Worker 使用 importScripts(url) 加载
executor.code 是 inline → Worker 直接 eval/execute
    ↓
globalRegistry.registerExecutor(type, fn)
    ↓
NodePanel 立即更新（节点出现在面板）
```

**替代方案**:
- Dynamic import(): 不支持跨域，不适合 CDN 加载
- Service Worker: 复杂度高，适合离线缓存场景
- 主线程加载: 阻塞 UI，不推荐

---

### 决策 5: 节点包缓存使用 localStorage + 内存

**选择**: 两级缓存：内存（当前会话）+ localStorage（持久化）

**理由**:
- 内存缓存：避免同一会话重复加载
- localStorage 缓存：跨会话持久化，提升加载速度
- 简单实现：不需要 indexedDB

**缓存策略**:
```
loadNodePackage(url)
    ↓
检查内存缓存 → 命中 → 返回
    ↓
检查 localStorage (key: `prism:node-pkg:${url}`) → 命中 → 解析 + 注册 → 返回
    ↓
从 URL 加载 → 解析 JSON → 验证 Schema → 注册 → 写入 localStorage → 返回
```

**替代方案**:
- indexedDB: 容量更大，但实现复杂度高，localStorage 足够（节点包通常 < 100KB）
- ETag/Last-Modified: 缓存失效需要额外逻辑，初期不需要

---

### 决策 6: Dev Tool 和 User App 使用相同的加载机制

**选择**: 共用 `loadNodePackage()` 和 `globalRegistry`

**理由**:
- 一套代码，两处复用，维护成本低
- Dev Tool 注册的节点，User App 也能使用
- PublishedWorkflow 的 `requiredNodes` 字段定义所需节点包列表

**替代方案**:
- 分开实现: 维护两套加载逻辑，增加复杂度
- User App 只用内置节点: 不支持自定义节点，失去扩展性

---

## Data Model

### 全局 Registry 结构

```typescript
// packages/core/src/globalRegistry.ts

interface GlobalRegistry {
  // 节点定义注册表
  _definitions: Map<string, NodeDefinition>;

  // executor 注册表
  _executors: Map<string, NodeExecutor>;

  // 内置初始化标志
  _initialized: boolean;

  // 初始化（调用一次，注册所有内置节点和 executor）
  initialize(): void;

  // 注册节点定义（不会覆盖已有）
  registerNode(def: NodeDefinition): void;

  // 注册 executor
  registerExecutor(type: string, fn: NodeExecutor): void;

  // 批量注册
  registerAll(definitions: NodeDefinition[], executors: Record<string, NodeExecutor>): void;

  // 查询
  getNode(type: string): NodeDefinition | undefined;
  getExecutor(type: string): NodeExecutor | undefined;
  listNodes(): NodeDefinition[];
  getExecutors(): Record<string, NodeExecutor>;
}
```

### 节点包格式

```typescript
// packages/shared-types/src/node-package.ts

interface NodePackageManifest {
  name: string;              // 包名，如 "prism-node-gsap-animation"
  version: string;           // 语义化版本，如 "1.0.0"
  description?: string;      // 包描述
  author?: string;           // 作者
  definition: NodeDefinition; // 节点定义
  executor: ExecutorSource;   // executor 来源
}

interface ExecutorSource {
  type: 'inline' | 'url';    // 内联代码或远程 URL
  code?: string;              // 内联 JS 代码（type=inline 时）
  url?: string;               // 远程 bundle URL（type=url 时）
}

interface LoadedNodePackage {
  manifest: NodePackageManifest;
  executor: NodeExecutor;     // 解析后的 executor 函数
  loadedAt: string;           // ISO timestamp
  source: 'memory' | 'localStorage' | 'network';
}
```

## Project Structure

```
packages/
├── core/                        # 新增包
│   ├── src/
│   │   ├── index.ts           # 导出 globalRegistry
│   │   └── globalRegistry.ts   # 全局 Registry 单例
│   ├── package.json
│   └── tsconfig.json
└── shared-types/
    └── src/
        └── node-package.ts     # 节点包类型定义（新增）

packages/image-ops/
└── src/
    └── worker/
        └── imageWorker.worker.ts  # 注册内置 executors

packages/workflow-core/
└── src/
    └── executor.ts               # 改造：使用 globalRegistry

packages/node-definitions/
└── src/
    ├── registry.ts               # 改造：导出 globalRegistry 实例
    └── definitions.ts            # 内置节点定义

apps/dev-tool/
├── src/
│   ├── components/
│   │   ├── NodePanel/
│   │   │   └── NodePanel.tsx    # 改造：连接 globalRegistry
│   │   └── NodePackageManager/   # 新增：节点包管理面板
│   │       ├── index.tsx
│   │       ├── ImportModal.tsx
│   │       └── PackageList.tsx
│   └── store/
│       └── canvasStore.ts        # 改造：executeWorkflow 使用 globalRegistry
│   └── main.tsx                   # 初始化 globalRegistry.initialize()
│
apps/user-app/
└── src/
    └── store/
        └── publishedStore.ts      # 改造：加载 requiredNodes
```

## Migration Plan

### Phase 1: 全局 Registry (Week 1)
1. 创建 `packages/core/` 包
2. 实现 `globalRegistry.ts` 单例
3. 在 `apps/dev-tool/src/main.tsx` 初始化
4. 改造 `executeWorkflow()` 使用 `globalRegistry.getExecutors()`

### Phase 2: NodePanel 连接 (Week 2)
1. 改造 `NodePanel.tsx` 使用 `globalRegistry.listNodes()`
2. 连接"添加自定义节点"按钮
3. 实现 `ImportModal.tsx` — JSON 文件导入
4. 验证：导入自定义节点，拖入画布，执行成功

### Phase 3: 节点包格式 (Week 3)
1. 创建 `packages/shared-types/src/node-package.ts`
2. 实现 JSON Schema 验证
3. 实现 `loadNodePackage()` 函数
4. 实现 localStorage 缓存

### Phase 4: 动态加载 (Week 4)
1. 在 Web Worker 中实现 `importScripts` 加载
2. 实现错误处理和重试机制
3. 创建 `NodePackageManager` 面板
4. User App 适配

### Rollback Strategy
- Phase 1 回滚：删除 `packages/core/`，恢复 `executeWorkflow()` 的原有逻辑
- Phase 2-4 回滚：删除 UI 代码，恢复原有行为

## Risks / Trade-offs

[Risk] 自定义 executor 中的恶意代码
→ Mitigation: 初期信任开发者（内部使用），后续提案添加 sandbox (iframe/web worker isolation)

[Risk] 节点包加载失败导致执行失败
→ Mitigation: 缓存机制保证重复加载成功率；提供清晰的错误提示引导用户重新加载

[Risk] 节点类型冲突（第三方包定义了同名类型）
→ Mitigation: 全局 Registry 覆盖时报错；建议节点包使用命名空间前缀 (如 `gsap-animation`)

[Risk] Web Worker 中无法使用某些 API（如 DOM）
→ Mitigation: 文档说明 executor 应为纯函数，不依赖 DOM；提供沙箱警告

[Risk] localStorage 缓存导致版本更新不及时
→ Mitigation: 提供"刷新节点包"功能；缓存添加 TTL（如 7 天）

## Open Questions

1. **节点包是否需要签名验证？** 初期不需要，后续可添加。
2. **节点包是否支持依赖其他节点包？** 初期不支持，后续可添加 `dependencies` 字段。
3. **Dev Tool 是否需要提供节点包编辑器？** 初期不需要，开发者手动写 JSON + JS。
4. **节点包是否支持内置节点的重写？** 允许，但会报警告。
5. **User App 如何获取 PublishedWorkflow 的 `requiredNodes`？** 通过服务端 API，参考 `backend-storage-migration` 提案的 Published Workflow 数据模型。

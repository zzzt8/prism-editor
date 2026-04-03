## 1. packages/core 骨架搭建

> 工具文档：[npm workspaces](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#workspaces) · [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

- [x] 1.1 创建 `packages/core/` 目录结构
- [x] 1.2 创建 `packages/core/package.json`，配置 workspace 依赖
- [x] 1.3 创建 `packages/core/tsconfig.json`
- [x] 1.4 创建 `packages/core/src/index.ts` — 导出 globalRegistry

## 2. 全局 Registry 实现

> 工具文档：[Zustand Store Pattern](https://zustand.docs.pmnd.rs/guides/typescript) · [Map (JavaScript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)

- [x] 2.1 实现 `packages/core/src/globalRegistry.ts`
  - `_definitions: Map<string, NodeDefinition>`
  - `_executors: Map<string, NodeExecutor>`
  - `_initialized: boolean`
- [x] 2.2 实现 `initialize()` — 注册所有内置节点和 executor
- [x] 2.3 实现 `registerNode(def)` — 带重复检查
- [x] 2.4 实现 `registerExecutor(type, fn)` — 带重复检查
- [x] 2.5 实现 `registerAll(definitions, executors)` — 批量注册
- [x] 2.6 实现 `getNode(type)` / `getExecutor(type)` / `listNodes()` / `getExecutors()`
- [x] 2.7 实现幂等性：重复调用 `initialize()` 不重复注册
- [x] 2.8 验证：运行 `pnpm build`，TypeScript 类型检查通过

## 3. 内置节点初始化集成

> 工具文档：@prism/node-definitions · @prism/image-ops

- [x] 3.1 在 `initialize()` 中导入内置节点定义：`import { getAllDefinitions } from '@prism/node-definitions'`
- [x] 3.2 在 `initialize()` 中导入内置 executors：`import { nodeExecutors } from '@prism/image-ops'`
- [x] 3.3 批量调用 `registerAll(definitions, nodeExecutors)`
- [x] 3.4 验证：打印 `listNodes()` 输出包含所有内置节点

## 4. canvasStore 改造

> 工具文档：[React Flow](https://reactflow.dev/docs/api/react-flow/) · WorkflowExecutor（见 `apps/dev-tool/src/executor/`）

- [x] 4.1 修改 `canvasStore.ts` — 导入 `globalRegistry`
- [x] 4.2 修改 `executeWorkflow()` — 移除 `const { nodeExecutors } = await import('@prism/image-ops')`
- [x] 4.3 修改 `executeWorkflow()` — 改为 `const executors = globalRegistry.getExecutors()`
- [x] 4.4 修改 `addNode()` — 改为从 `globalRegistry.getNode(type)` 获取 definition
- [x] 4.5 验证：Dev Tool 中拖入内置节点，执行成功

## 5. NodePanel 连接 globalRegistry

> 工具文档：[React Flow - Built-in Nodes Panel](https://reactflow.dev/docs/examples/nodes/overview/)

- [x] 5.1 修改 `NodePanel.tsx` — 从 `globalRegistry.listNodes()` 获取节点列表
- [x] 5.2 修改 `NodePanel.tsx` — 移除自己的 `createRegistry()` 调用
- [x] 5.3 修改分类排序 — 确保 "custom" 分类排在最后
- [x] 5.4 验证：NodePanel 显示所有内置节点

## 6. 节点包格式定义

> 工具文档：[JSON Schema](https://json-schema.org/) · [Zod](https://zod.dev/)

- [x] 6.1 创建 `packages/shared-types/src/node-package.ts`
  - `NodePackageManifest` 接口
  - `ExecutorSource` 接口 (`inline` | `url`)
  - `LoadedNodePackage` 接口
- [x] 6.2 导出 `validateNodePackage(json)` 函数（Zod schema）
- [x] 6.3 导出 JSON Schema 用于文档和验证
- [x] 6.4 验证：`tsc --noEmit` 通过

## 7. 节点包导入 UI

> 工具文档：[File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) · [React DnD](https://react-dnd.github.io/react-dnd/docs/overview)

- [x] 7.1 创建 `apps/dev-tool/src/components/NodePackageManager/index.tsx`
- [x] 7.2 实现 `ImportModal.tsx` — 文件选择 + JSON 验证 + 注册
- [x] 7.3 实现 `PackageList.tsx` — 显示已导入的包（从 globalRegistry 过滤 custom）
- [x] 7.4 连接 NodePanel 的"添加自定义节点"按钮打开 ImportModal
- [x] 7.5 实现删除功能 — 从 globalRegistry 移除节点
- [x] 7.6 实现详情查看 — 显示 manifest 完整内容
- [x] 7.7 验证：导入一个自定义节点 JSON，节点出现在面板

## 8. 内联 Executor 解析

> 工具文档：[Function Constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)

- [x] 8.1 实现 `parseInlineExecutor(code: string): NodeExecutor`
  - 使用 `new Function(...)` 构造 executor 函数
  - 捕获语法错误并抛出描述性消息
- [x] 8.2 在 `validateNodePackage` 中验证 `executor.type === "inline"` 时 `code` 存在
- [x] 8.3 在导入流程中调用 `parseInlineExecutor`
- [x] 8.4 验证：导入带内联 executor 的节点，执行成功

## 9. 远程 Executor 加载

> 工具文档：[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) · [importScripts](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)

- [x] 9.1 创建 `apps/dev-tool/src/utils/workerLoader.ts`
- [x] 9.2 实现 `loadRemoteExecutor(url: string): Promise<NodeExecutor>`
  - 创建 Web Worker
  - 使用 `importScripts(url)` 加载 bundle
  - 通过 Comlink 通信
- [x] 9.3 实现超时处理（30 秒）
- [x] 9.4 实现 Worker 终止和清理
- [x] 9.5 验证：从 CDN 加载 executor bundle，执行成功

## 10. 节点包缓存

> 工具文档：[localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

- [x] 10.1 创建 `apps/dev-tool/src/utils/nodeCache.ts`
- [x] 10.2 实现内存缓存：`Map<url, LoadedNodePackage>`
- [x] 10.3 实现 localStorage 缓存：
  - 存储 key: `prism:node-pkg:${url}`
  - 存储 value: `LoadedNodePackage` JSON
  - 包含 `loadedAt` 时间戳
- [x] 10.4 实现 TTL 检查（7 天过期）
- [x] 10.5 实现 `clearNodePackageCache()`
- [x] 10.6 实现 `refreshNodePackage(url)`
- [x] 10.7 验证：刷新页面后缓存命中，无网络请求

## 11. User App 适配

> 工具文档：[React Flow - React Flow in React](https://reactflow.dev/docs/learn/guides/react-flow-in-react/)

- [x] 11.1 修改 `apps/user-app/src/main.tsx` — 初始化 `globalRegistry.initialize()`
- [x] 11.2 修改 `publishedStore.ts` — 在加载 PublishedWorkflow 后检查 `requiredNodes`
- [x] 11.3 实现批量加载：`loadRequiredNodes(requiredNodes[])`
- [x] 11.4 实现加载失败处理 — 显示清晰错误，阻止执行
- [x] 11.5 验证：User App 打开包含自定义节点的 PublishedWorkflow，节点自动加载并执行

## 12. 端到端测试

> 工具文档：[Playwright](https://playwright.dev/docs/intro/) · 项目内 E2E 测试示例（`apps/dev-tool/e2e/`）

- [x] 12.1 创建单元测试：`executorUtils.test.ts` (parseInlineExecutor, validateInlineCode, extractFunctionName)
- [x] 12.2 创建单元测试：`globalRegistry.test.ts` (custom node support)
- [x] 12.3 创建单元测试：`nodeCache.test.ts` (caching utilities)
- [x] 12.4 验证：所有单元测试通过 (25 tests)
- [x] 12.5 E2E：Dev Tool 导入自定义节点 → 拖入画布 → 连线 → 执行 → 成功
- [x] 12.6 E2E：Dev Tool 发布含自定义节点的工作流 → User App 打开 → 自动加载节点 → 执行成功

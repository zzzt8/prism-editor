# @prism/user-app

终端用户运行时应用，用于运行已发布的工作流。

## 功能

- **工作流浏览**: 浏览和搜索已发布的工作流
- **参数配置**: 填写输入 URL，调整参数
- **工作流执行**: 完全在客户端运行工作流
- **结果导出**: 下载 PNG / JPEG / WebP 格式结果
- **批量处理**: 支持多张图像顺序处理，ZIP 打包下载
- **离线支持**: IndexedDB 缓存已发布工作流

## 目录结构

```
apps/user-app/
├── src/
│   ├── components/
│   │   ├── InputSection/        # 输入配置组件 (支持单张/批量模式)
│   │   ├── ParamsSection/       # 参数配置组件
│   │   ├── RunSection/          # 运行控制组件
│   │   ├── OutputSection/       # 输出结果组件
│   │   └── WorkflowHeader/      # 工作流头部组件
│   ├── layouts/
│   │   └── UserLayout.tsx      # 用户端布局
│   ├── modules/
│   │   ├── catalog/             # 工作流目录
│   │   ├── node-runtime/        # 节点运行时 (Web Worker)
│   │   ├── repositories/        # 数据仓库
│   │   ├── runner/              # 运行器 (runStore, runWorkflow)
│   │   └── selection/            # 选择管理
│   ├── pages/
│   │   ├── WorkflowListPage.tsx      # 工作流列表页
│   │   └── WorkflowRunPage.tsx       # 工作流运行页
│   ├── store/                   # Zustand 状态管理
│   ├── storage/                 # 存储适配器
│   ├── styles/                  # 样式文件
│   └── utils/                   # 工具函数
├── docs/
│   └── ui-guidelines.md         # UI 设计指南
└── package.json
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
```

## 页面路由

| 路径 | 组件 | 描述 |
|------|------|------|
| `/` | 工作流列表页 | 浏览已发布的工作流 |
| `/workflow/:id` | 工作流运行页 | 配置参数并运行工作流 |

## 状态管理

```typescript
import { usePublishedStore } from './store/publishedStore';
import { useRunStore } from './store/runStore';
import { useWorkflowCatalogStore } from './modules/catalog/workflowCatalogStore';

// 已发布工作流
const publishedWorkflows = usePublishedStore((s) => s.workflows);

// 运行状态
const isRunning = useRunStore((s) => s.isRunning);
const result = useRunStore((s) => s.result);

// 目录状态
const searchQuery = useWorkflowCatalogStore((s) => s.searchQuery);
```

## 执行流程

```
用户选择工作流
    ↓
加载 PublishedWorkflow 配置
    ↓
配置输入参数（URL、文件等）
    ↓
执行 PublishedWorkflowExecutor
    ↓
显示结果预览
    ↓
导出图像
```

## 存储层

```typescript
import { ApiStorageAdapter } from './storage/ApiStorageAdapter';
import { IndexedDBStorageAdapter } from './storage/IndexedDBStorageAdapter';

// API 存储 - 从服务器获取已发布工作流
const apiAdapter = new ApiStorageAdapter(baseUrl);

// IndexedDB 存储 - 缓存工作流
const idbAdapter = new IndexedDBStorageAdapter();
```

## 依赖

- `@prism/image-ops` - 图像处理操作
- `@prism/node-definitions` - 节点定义
- `@prism/shared-types` - 共享类型
- `@prism/shared-ui` - 共享 UI 组件
- `@prism/workflow-core` - 工作流核心引擎
- `zustand` - 状态管理
- `jszip` - ZIP 文件处理

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm clean` | 清理构建产物 |

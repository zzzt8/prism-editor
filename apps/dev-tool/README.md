# @prism/dev-tool

开发者工具应用，用于构建、测试和发布图像处理工作流。

## 功能

### 认证系统
- 用户注册和登录
- JWT Token 管理
- 登录状态持久化

### 节点画布
- 基于 React Flow 的可视化编辑器
- 从节点面板拖拽节点
- 连接端口连线
- 内联参数配置
- 任意节点实时预览

### 工作流管理
- 创建、编辑、复制、删除工作流
- 版本历史追踪和回滚
- 模板管理

### 发布功能
- Publish 对话框 v2：手动选择用户输入节点和暴露参数
- 配置参数可见性（visible / hidden / locked）
- 自动检测叶子节点作为输出
- 导出工作流配置为 PublishedWorkflow 格式

### 节点包管理
- Node Package Manager：从 JSON 导入自定义节点包
- Marketplace：浏览和安装共享节点包

## 目录结构

```
apps/dev-tool/
├── src/
│   ├── components/
│   │   ├── canvas/              # 画布组件
│   │   ├── header/              # 头部组件
│   │   ├── Inspector/          # 检查器面板
│   │   ├── nodes/               # 节点组件
│   │   ├── edges/               # 连线组件
│   │   ├── NodePanel/           # 节点面板
│   │   ├── NodePackageManager/   # 节点包管理
│   │   ├── NodeMarketplace/     # 节点市场
│   │   ├── ParamPanel/          # 参数面板
│   │   ├── TemplateCenter/       # 模板中心
│   │   ├── TemplateManager/      # 模板管理
│   │   ├── VersionHistory/       # 版本历史
│   │   ├── WorkflowsView/        # 工作流视图
│   │   └── WorkflowsPanel/       # 工作流面板
│   ├── layouts/                 # 布局组件
│   ├── modules/
│   │   ├── editor/               # 编辑器模块
│   │   │   ├── mappers/         # 格式转换 (canvas ↔ workflow ↔ published)
│   │   │   ├── services/        # 编辑器服务 (autosave, import/export)
│   │   │   └── stores/          # Zustand 状态管理
│   │   ├── persistence/         # 持久化模块
│   │   │   └── mappers/         # 数据转换映射
│   │   └── repositories/        # 数据仓库
│   ├── pages/                   # 页面组件
│   ├── store/                    # Zustand 状态管理
│   ├── storage/                 # 存储适配器
│   ├── styles/                  # 样式文件
│   └── utils/                   # 工具函数
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
| `/` | 登录页 | 用户登录 |
| `/register` | 注册页 | 用户注册 |
| `/dashboard` | 仪表盘 | 工作流列表 |
| `/editor/:id` | 编辑器 | 编辑工作流 |
| `/editor/new` | 编辑器 | 创建新工作流 |
| `/marketplace` | 市场 | 浏览节点包 |
| `/settings` | 设置 | 应用设置 |

## 状态管理

使用 Zustand 管理应用状态：

```typescript
import { useCanvasStore } from './store/canvasStore';
import { useWorkflowStore } from './store/workflowStore';
import { useAuthStore } from './store/authStore';

// 画布状态
const nodes = useCanvasStore((s) => s.nodes);
const edges = useCanvasStore((s) => s.edges);

// 工作流状态
const workflows = useWorkflowStore((s) => s.workflows);

// 认证状态
const user = useAuthStore((s) => s.user);
```

## 存储层

支持多种存储适配器：

```typescript
import { ApiStorageAdapter } from './storage/ApiStorageAdapter';
import { IndexedDBStorageAdapter } from './storage/IndexedDBStorageAdapter';
import { JsonFileAdapter } from './storage/JsonFileAdapter';

// API 存储（生产环境）
const apiAdapter = new ApiStorageAdapter(baseUrl, token);

// IndexedDB 存储（离线优先）
const idbAdapter = new IndexedDBStorageAdapter();

// JSON 文件存储（导入/导出）
const fileAdapter = new JsonFileAdapter();
```

## 依赖

- `@prism/core` - 自定义节点执行器
- `@prism/image-ops` - 图像处理操作
- `@prism/node-definitions` - 节点定义
- `@prism/shared-types` - 共享类型
- `@prism/shared-ui` - 共享 UI 组件
- `@prism/workflow-core` - 工作流核心引擎
- `@xyflow/react` - React Flow 画布
- `zustand` - 状态管理
- `react-router-dom` - 路由

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行测试 |
| `pnpm clean` | 清理构建产物 |

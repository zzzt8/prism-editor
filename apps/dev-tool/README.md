# @prism/dev-tool

开发者工具应用，用于构建、测试和发布图像处理工作流。基于 React Flow（@xyflow/react） + Zustand sliced store + Vite。

## 功能

### 认证系统
- 用户注册和登录
- JWT Token 管理（access / refresh）
- 登录状态持久化到 localStorage
- 登录后自动同步 token 到 `ApiStorageAdapter`（`syncStorageTokens`）

### 节点画布（ComfyUI 风格）
- 基于 React Flow 12 的可视化编辑器
- 嵌入式端口行（Paired Port Row / Input Row / Output Row）
- 端口类型着色：image / mask / number / string / boolean / file
- 彩色贝塞尔连接线（按 source port dataType）
- 节点状态指示：idle / pending / running / done / error（pending 显示半透明遮罩，done 绿边框，running 脉冲动画）
- 节点运行中显示当前执行节点名（顶部 toolbar）
- 节点右上有 `nodeIndex` 徽章（#1, #2, ...）
- 拖拽图像到 LoadImage / LoadMask 节点直接替换图片
- 双击空白画布打开命令面板式节点搜索（`NodeSearchModal`）
- 键盘快捷键：
  - `Ctrl+S` 保存
  - `Delete` / `Backspace` 删除选中
  - `Esc` 清除选择
  - `G` 多选分组
  - `Ctrl+C/X/V` 复制 / 剪切 / 粘贴
- 浮动 CanvasToolbar：节点数 + dirty 指示 + 执行状态 + 缩放百分比

### Inspector（5 Tab）
- **参数**：节点参数编辑（string / number / select / boolean / image-file 控件）
- **预览**：自动刷新 + 手动刷新 + 全屏（ImageData → dataURL 渲染）
- **调试**：执行耗时 + 输入快照 + 输出快照 + 错误信息
- **设置**：别名编辑 + 显示模式（展开 / 最小化）+ Bypass + 固定节点 + 动态输入端口（Composite 节点 `overlayN`）
- **信息**：节点 ID / 类型 / 分类 / 端口连接状态 / 执行状态

### 工作流管理
- 创建、编辑、复制、删除、重命名工作流
- 仪表盘搜索、排序、视图切换（`WorkflowsView`）
- **版本历史**：基于 server 生成的版本号追踪变更与回滚
- **模板中心（TemplateCenter）**：分类 / 标签 / 搜索 + 模板版本历史
- **节点片段（snippets）**：接口已 stub 化，保留 `snippetSave` / `snippetList` / `insertSnippet` / `deleteSnippet` 方法

### 发布功能（v2）
- **PublishDialog v2**：
  - 手动选择用户输入节点（image / mask / string）
  - 显式白名单暴露参数
  - 自动检测输出节点（export / composite）
  - 配置参数可见性（visible / hidden / locked）
  - 配置 controlType / options / validation / description
- 导出工作流配置为 `PublishedWorkflow` 格式（含 `PublishedParamDefinition`）
- 发布到服务端（Fastify + Prisma + SQLite）

### 节点包管理
- **Node Package Manager**：从 JSON 导入自定义节点包
- **Marketplace**：浏览和安装共享节点包
- 节点通过 `@prism/core` 的 `globalRegistry.register` 注入到运行时

### 状态管理（Zustand sliced）
- `useCanvasStore`：graph / selection / inspector / draft / execution 五 slice 组合
- `useAppStore`：面板可见性、设置
- `useAuthStore`：用户、token、登录态
- 画布 store 的 sliced 化（`modules/editor/stores/`）便于按职责维护

### 存储层
- **ApiStorageAdapter**（主存）：所有 Save / New / Publish 操作直接走服务端
- **IndexedDBStorageAdapter**（autosave 缓存）：仅用于崩溃恢复
- **JsonFileAdapter**（导入 / 导出）：本地 JSON 交换

## 目录结构

```
apps/dev-tool/
├── src/
│   ├── components/
│   │   ├── canvas/                # 画布组件
│   │   │   ├── WorkflowCanvas.tsx
│   │   │   ├── CanvasToolbar.tsx
│   │   │   ├── NodeSearchModal.tsx
│   │   │   ├── NodeContextMenu.tsx
│   │   │   ├── NodePreviewModal.tsx
│   │   │   ├── RenderProductionModal.tsx
│   │   │   ├── useCanvasDragDrop.ts
│   │   │   ├── useCanvasKeyboard.ts
│   │   │   └── useCanvasSelectionSync.ts
│   │   ├── header/                # 头部组件
│   │   │   ├── WorkflowHeader.tsx
│   │   │   ├── PanelToggle.tsx
│   │   │   └── RenderProductionModal.tsx
│   │   ├── Inspector/             # 检查器面板 (5 Tab)
│   │   │   ├── index.tsx
│   │   │   ├── InspectorTabs.tsx
│   │   │   ├── ParametersPanel.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   ├── DebugTab.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── InfoPanel.tsx
│   │   │   └── Inspector.module.css
│   │   ├── nodes/                 # 节点组件
│   │   │   ├── PrismNode.tsx
│   │   │   ├── PrismNodeHeader.tsx
│   │   │   ├── PrismNodePorts.tsx
│   │   │   ├── PrismNodeControls.tsx
│   │   │   └── GroupNode.tsx
│   │   ├── edges/                 # 连线组件
│   │   │   ├── PrismEdge.tsx      # 贝塞尔 + drop-shadow
│   │   │   └── ConnectionLine.tsx # 类型着色 + 标签
│   │   ├── NodePanel/             # 节点面板
│   │   ├── NodePackageManager/    # 节点包管理
│   │   ├── NodeMarketplace/       # 节点市场
│   │   ├── ParamPanel/            # 旧参数面板
│   │   ├── TemplateCenter/        # 模板中心
│   │   ├── TemplateManager/       # 模板管理
│   │   ├── VersionHistory/        # 版本历史
│   │   ├── WorkflowsView/         # 工作流视图
│   │   ├── WorkflowsPanel/        # 工作流面板
│   │   ├── WorkflowsHeader/       # 工作流列表头
│   │   ├── NewWorkflowModal.tsx
│   │   └── AuthGuard.tsx          # 路由保护
│   ├── layouts/                   # 布局组件
│   │   └── DevToolLayout.tsx      # 三栏：左面板 + 画布 + 右面板
│   ├── modules/
│   │   ├── editor/                # 编辑器模块
│   │   │   ├── mappers/           # 格式转换 (canvas ↔ workflow ↔ published)
│   │   │   ├── services/          # 编辑器服务 (autosave, import/export, execution)
│   │   │   │   ├── autosaveService.ts
│   │   │   │   ├── executionService.ts
│   │   │   │   └── importExportService.ts
│   │   │   └── stores/            # Zustand sliced 状态管理
│   │   │       ├── useCanvasStore.ts    # 组合 store
│   │   │       ├── graphSlice.ts
│   │   │       ├── selectionSlice.ts
│   │   │       ├── inspectorSlice.ts
│   │   │       ├── draftSlice.ts
│   │   │       ├── executionSlice.ts
│   │   │       ├── canvasStoreHelpers.ts
│   │   │       ├── idCounter.ts
│   │   │       └── types.ts
│   │   ├── persistence/           # 持久化模块
│   │   │   └── mappers/           # 数据转换映射
│   │   └── repositories/          # 数据仓库
│   │       ├── workflowRepository.ts
│   │       └── templateVersionRepository.ts
│   ├── pages/                     # 页面组件
│   │   ├── DashboardPage.tsx
│   │   ├── EditorPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── MarketplacePage.tsx
│   ├── store/                     # Zustand 状态管理
│   │   ├── authStore.ts
│   │   ├── appStore.ts
│   │   └── canvasStore.ts         # 重导出 useCanvasStore
│   ├── storage/                   # 存储适配器
│   │   ├── ApiStorageAdapter.ts
│   │   ├── IndexedDBStorageAdapter.ts
│   │   ├── JsonFileAdapter.ts
│   │   └── index.ts
│   ├── styles/                    # 样式文件
│   ├── utils/                     # 工具函数
│   │   └── portTypeStyles.ts
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## 快速开始

```bash
# 安装依赖（从仓库根）
pnpm install

# 启动开发服务器（端口 5173）
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 类型检查
pnpm typecheck

# 运行测试
pnpm test

# 清理构建产物
pnpm clean
```

环境变量：
- `VITE_API_BASE_URL` — 后端 API 地址，默认 `/api`

## 页面路由

| 路径 | 组件 | 描述 |
|------|------|------|
| `/login` | LoginPage | 用户登录 |
| `/register` | RegisterPage | 用户注册 |
| `/` | DashboardPage | 仪表盘 / 工作流列表（重定向） |
| `/dashboard` | DashboardPage | 仪表盘 / 工作流列表 |
| `/editor/new` | EditorPage | 创建新工作流（NewWorkflowModal） |
| `/editor/:id` | EditorPage | 编辑工作流 |
| `/marketplace` | MarketplacePage | 节点市场 |
| `/settings` | SettingsPage | 应用设置 |

由 `AuthGuard` 保护私有路由，已登录用户访问 `/login` / `/register` 会被重定向到 `/`。

## 状态管理

```typescript
import { useCanvasStore } from './store/canvasStore';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// 画布状态（sliced）
const nodes = useCanvasStore((s) => s.nodes);
const edges = useCanvasStore((s) => s.edges);
const inspectorTab = useCanvasStore((s) => s.inspectorTab);
const executionStatus = useCanvasStore((s) => s._executionStatus);

// 认证
const user = useAuthStore((s) => s.user);
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

// 应用设置
const leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
```

`useCanvasStore` 内部由 5 个 slice 组合（graph / selection / inspector / draft / execution），但对外保持单一 store 接口，组件无感知。

## 存储层

```typescript
import { ApiStorageAdapter, IndexedDBStorageAdapter, JsonFileAdapter, activeStorageAdapter } from './storage';

// API 存储（生产环境，主存）
const apiAdapter = new ApiStorageAdapter(baseUrl, accessToken);

// IndexedDB 存储（autosave 缓存，崩溃恢复）
const idbAdapter = new IndexedDBStorageAdapter();

// JSON 文件存储（导入/导出）
const fileAdapter = new JsonFileAdapter();

// 默认激活的适配器（server-first）
import { activeStorageAdapter } from './storage';
await activeStorageAdapter.save(workflow);
```

存储策略：**ApiStorageAdapter 作为主存**（所有 Save / New / Publish 同步走服务端），IndexedDB 仅作为 autosave 缓存（崩溃恢复）。`syncStorageTokens()` 在登录后被调用以同步 token 到 API 适配器。

## 画布快捷键

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+S` | 保存工作流 |
| `Delete` / `Backspace` | 删除选中的边或节点 |
| `Esc` | 清除选择 |
| `G` | 多选分组（≥ 2 个节点时） |
| `Ctrl+C` | 复制选中节点 |
| `Ctrl+X` | 剪切选中节点 |
| `Ctrl+V` | 粘贴（在 {400, 300} 位置） |
| 双击画布 | 打开节点搜索 |
| 拖拽图像到节点 | 替换 LoadImage / LoadMask 节点图片 |

## 发布流程（v2）

1. 在画布上完成工作流
2. 点击 **Publish** 打开 PublishDialog
3. **Inputs** Tab：选择用户输入节点（自动检测源节点）
4. **Exposed Params** Tab：白名单要暴露给用户的参数，配置 controlType / label / 可见性
5. **Outputs** Tab：自动检测 export / composite 节点，配置格式（png / jpeg / webp）
6. 确认发布 → 调用 `POST /api/published`
7. user-app 即可加载并运行该工作流

## 依赖

- `@prism/core` - 自定义节点执行器（`globalRegistry`、`parseInlineExecutor`）
- `@prism/image-ops` - 图像处理操作
- `@prism/node-definitions` - 节点定义
- `@prism/shared-types` - 共享类型（含 `PublishedWorkflow`、`PublishedParamDefinition`）
- `@prism/shared-ui` - 共享 UI 组件
- `@prism/workflow-core` - 工作流核心引擎（`WorkflowExecutor`、`PublishedWorkflowExecutor`）
- `@xyflow/react` - React Flow 画布
- `zustand` - 状态管理
- `react-router-dom` - 路由
- `lucide-react` - 图标库
- `bcryptjs` / `jsonwebtoken`（服务端相关类型）

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm clean` | 清理 dist / node_modules/.cache |

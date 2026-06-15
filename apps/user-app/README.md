# @prism/user-app

终端用户运行时应用，用于运行 dev-tool 发布的图像处理工作流。完全在浏览器端执行，支持离线缓存、批量处理、ZIP 打包下载。

## 功能

- **工作流浏览**: 浏览和搜索已发布的工作流（`workflowCatalogStore`）
- **本地重命名 / 删除**: 用户可在本地管理已发布工作流的展示名
- **参数配置**:
  - 图像字段：URL 输入 + 拖拽上传 + 文件选择 + 缩略图预览
  - 蒙版字段：同图像字段，单独类型
  - 文本字段：URL / 任意字符串
- **单图 / 批量模式切换**: 每个图像 / 蒙版字段可切换单张 / 批量
  - 单张：拖拽 / URL
  - 批量：拖拽多张 / 多文件选择，支持重排、删除、单图清空
- **工作流执行**: 完全在客户端运行（`PublishedWorkflowExecutor`）
  - 状态机：idle → running → (cancelling → cancelled) / done / error
  - 实时进度（节点数 / 完成数 / 百分比）
  - 取消执行（运行中按钮变为"取消执行"）
- **参数控件渲染**: 根据 `PublishedParamDefinition.controlType` 自动选择
  - `number` → 滑块（带 min/max/validation，NaN 回退到 text）
  - `select` → 下拉框
  - `string` → 文本输入
  - `boolean` → 开关
  - `image-file` → URL 输入
  - `visibility = 'locked'` 时控件禁用
- **结果展示**:
  - 图像预览 + Lightbox 全屏查看
  - 单图原图下载
  - 多尺寸下载（512 / 1024 / 2048）
  - 多图批量 ZIP 打包下载
  - 执行日志导出
- **取消 / 错误处理**: 运行中、已取消、出错均有明确 UI
- **离线支持**: IndexedDB 缓存已浏览过的工作流

## 目录结构

```
apps/user-app/
├── src/
│   ├── components/
│   │   ├── InputSection/         # 输入配置组件 (ImageInputField / MaskInputField / TextInputField / ExposedParamsForm)
│   │   ├── ParamsSection/        # 独立的暴露参数渲染器 (SelectControl / NumberControl / BooleanControl / StringControl / ImageFileControl)
│   │   ├── RunSection/           # 运行控制组件 (执行 / 取消按钮 + 错误展示)
│   │   ├── OutputSection/        # 输出结果组件 (ProgressDisplay / ResultSummary / OutputPreview / ZipPackBar)
│   │   └── WorkflowHeader/       # 工作流头部 (返回 + 标题 + 版本 + 描述)
│   ├── layouts/
│   │   └── UserLayout.tsx        # 双栏：左 inputs / 右 results
│   ├── modules/
│   │   ├── catalog/              # 工作流目录
│   │   │   └── workflowCatalogStore.ts
│   │   ├── node-runtime/         # 节点运行时 (Web Worker)
│   │   │   ├── nodePackageRepository.ts
│   │   │   ├── nodePackageLoader.ts
│   │   │   ├── runtimeRegistry.ts
│   │   │   └── securityConfig.ts
│   │   ├── repositories/         # 数据仓库
│   │   ├── runner/               # 运行器
│   │   │   ├── runStore.ts
│   │   │   └── runWorkflow.ts
│   │   └── selection/            # 选择管理
│   │       └── selectedWorkflowStore.ts
│   ├── pages/
│   │   ├── WorkflowListPage.tsx  # 工作流列表页 (首页)
│   │   └── WorkflowRunPage.tsx   # 工作流运行页
│   ├── store/                    # Zustand 状态管理
│   │   └── publishedStore.ts
│   ├── storage/                  # 存储适配器
│   │   ├── ApiStorageAdapter.ts
│   │   ├── IndexedDBStorageAdapter.ts
│   │   └── index.ts
│   ├── utils/                    # 工具函数
│   │   └── download.ts           # 单图 / 多尺寸 / ZIP 打包下载
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   └── ui-guidelines.md          # UI 设计指南
└── package.json
```

## 快速开始

```bash
# 安装依赖（从仓库根）
pnpm install

# 启动开发服务器（默认端口 5174）
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 类型检查
pnpm typecheck

# 运行测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 清理构建产物
pnpm clean
```

环境变量：
- `VITE_API_BASE_URL` — 后端 API 地址，默认 `/api`

## 页面路由

| 路径 | 组件 | 描述 |
|------|------|------|
| `/` | WorkflowListPage | 工作流列表页（首页） |
| `/workflow/:id` | WorkflowRunPage | 工作流运行页 |

## 状态管理

```typescript
import { useWorkflowCatalogStore } from './modules/catalog/workflowCatalogStore';
import { useSelectedWorkflowStore } from './modules/selection/selectedWorkflowStore';
import { useRunStore } from './modules/runner/runStore';
import { usePublishedStore } from './store/publishedStore';

// 目录：列表、搜索、排序
const workflows = useWorkflowCatalogStore((s) => s.workflows);
const searchQuery = useWorkflowCatalogStore((s) => s.searchQuery);

// 当前选中工作流
const selectedWorkflow = useSelectedWorkflowStore((s) => s.workflow);

// 运行状态
const runState = useRunStore((s) => s.runState); // { status, progress, result, error }
const executionLogs = useRunStore((s) => s.executionLogs);
```

## 执行流程

```
用户选择工作流 (WorkflowListPage)
    ↓
加载 PublishedWorkflow 配置 (selectedWorkflowStore)
    ↓
WorkflowRunPage 渲染
    ├── InputSection  → 收集 inputs (image/mask/string)
    ├── ParamsSection → 收集 exposedParams (按 controlType 渲染)
    └── RunSection    → 触发 runWorkflow()
    ↓
PublishedWorkflowExecutor.execute(inputs, paramValues, { signal })
    ├── 拓扑排序节点
    ├── 逐节点执行
    │   ├── 准备 ExecutionContext (requireInput, getParameter, signal)
    │   ├── 调用节点 executor
    │   ├── setOutput 注入 IRO 到 context
    │   └── onProgress 上报
    └── 收集结果
    ↓
OutputSection 渲染结果
    ├── 单图：OutputPreview (preview / download / multi-size)
    ├── 多图：ZipPackBar + 批量卡片
    └── 出错 / 取消：ResultSummary
```

## 存储层

```typescript
import { ApiStorageAdapter, IndexedDBStorageAdapter } from './storage';

// API 存储：从服务器获取已发布工作流
const apiAdapter = new ApiStorageAdapter(baseUrl);

// IndexedDB 存储：本地缓存已发布工作流（离线支持）
const idbAdapter = new IndexedDBStorageAdapter();
```

**缓存策略**：
- 列表 → IndexedDB 优先（启动时立即渲染缓存），后台异步刷新
- 详情 → IndexedDB 优先，无网络时使用缓存版本
- 重命名 / 删除 → 仅本地生效（不影响 server 数据）

## 布局

`UserLayout` 双栏布局：

```
┌─────────────────────────────────────────────────┐
│  Header: 返回 + 标题 + 版本 + 描述              │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  Sidebar (360px) │   Main (flex: 1)             │
│  - InputSection  │   - OutputSection            │
│  - ParamsSection │     - ProgressDisplay        │
│  - RunSection    │     - ResultSummary          │
│                  │     - OutputPreview cards    │
│                  │     - ZipPackBar (≥2 outputs)│
│                  │     - Batch grid             │
└──────────────────┴──────────────────────────────┘
```

## 依赖

- `@prism/image-ops` - 图像处理操作
- `@prism/node-definitions` - 节点定义
- `@prism/shared-types` - 共享类型（含 `PublishedWorkflow`、`PublishedParamDefinition`、`PublishedInputConfig`）
- `@prism/shared-ui` - 共享 UI 组件
- `@prism/workflow-core` - 工作流核心引擎（`PublishedWorkflowExecutor`）
- `zustand` - 状态管理
- `jszip` - 批量结果 ZIP 打包
- `zod` - 运行时类型验证

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm clean` | 清理 dist / node_modules/.cache |

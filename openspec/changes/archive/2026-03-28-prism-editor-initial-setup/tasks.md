# Prism Editor - 实现任务列表

> **开发约束**
>
> 1. **每次 apply 最多选择 2-4 个小分支实现**，不要贪多
> 2. **按顺序逐项实现**，确保每项完成后进行测试
> 3. **测试不通过必须找出问题**，不要跳过或忽略错误
> 4. **通过后标记 `[x]`，失败后记录问题并修复**
>
> **测试策略**：
> - 单个功能完成后立即编写/运行测试
> - 集成前验证各模块独立工作
> - 每完成一个小节进行整体验证

## 实施顺序建议

| 优先级 | 章节 | 说明 |
|--------|------|------|
| 1 | 1. 项目初始化 | 搭建项目骨架 |
| 2 | 2. 共享类型定义 | 类型是所有代码的基础 |
| 3 | 3. 工作流核心引擎 | 核心逻辑 |
| 4 | 5.x. 图像内存管理 | 执行引擎依赖 |
| 5 | 5. 图像处理实现 | 图像操作 |
| 6 | 4. 节点定义系统 | 节点元信息 |
| 7 | 8.x. Storage Adapter | 存储层 |
| 8 | 6-7. 开发者工具 UI | 画布和交互 |
| 9 | 8-9. 工作流管理 | 保存和执行 |
| 10 | 10-13. 用户端 | 用户使用界面 |

## 1. 项目初始化

- [x] 1.1 初始化 pnpm workspace 项目结构
- [x] 1.2 配置 Turborepo 构建系统
- [x] 1.3 创建 `apps/dev-tool` 应用（React + Vite + TypeScript）
- [x] 1.4 创建 `apps/user-app` 应用（React + Vite + TypeScript）
- [x] 1.5 创建 `packages/shared-types` 共享类型包
- [x] 1.6 创建 `packages/workflow-core` 核心引擎包
- [x] 1.7 创建 `packages/node-definitions` 节点定义包
- [x] 1.8 创建 `packages/image-ops` 图像处理实现包

## 2. 共享类型定义

- [x] 2.1 定义 Workflow 数据结构（节点、连线、输入、输出）
- [x] 2.2 定义 NodeDefinition 接口（端口、参数、分类）
- [x] 2.3 定义 ExecutionContext 执行上下文
- [x] 2.4 定义 PublishedWorkflow 发布态工作流
- [x] 2.5 导出类型到各应用包

## 3. 工作流核心引擎

- [x] 3.1 实现拓扑排序算法（节点执行顺序）
- [x] 3.2 实现执行上下文管理器
- [x] 3.3 实现工作流执行器 WorkflowExecutor
- [x] 3.4 实现执行进度回调
- [x] 3.5 实现执行结果缓存
- [x] 3.6 编写核心引擎单元测试

## 4. 节点定义系统

- [x] 4.1 定义 LoadImage 节点元信息
- [x] 4.2 定义 ApplyMask 节点元信息
- [x] 4.3 定义 Composite 节点元信息
- [x] 4.4 定义 Transform 节点元信息
- [x] 4.5 定义 Export 节点元信息
- [x] 4.6 实现节点分类注册

## 5. 图像处理实现

- [x] 5.1 实现图片加载（PNG、JPEG、WebP），**优先处理 CORS 配置**
- [x] 5.1.1 实现 `loadCrossOriginImage` 函数，设置 `crossOrigin = 'anonymous'`
- [x] 5.1.2 验证主流 CDN（阿里云 OSS、七牛云、又拍云）的跨域加载
- [x] 5.1.3 在 DevTools 中显示跨域加载警告
- [x] 5.2 实现 Mask 应用（Alpha Mask、亮度 Mask）
- [x] 5.3 实现图层合成（Normal、Multiply、Screen）
- [x] 5.4 实现变换操作（位移、缩放、旋转、裁切）
- [x] 5.5 实现图像导出（PNG、JPEG、多尺寸）
- [x] 5.6 编写图像处理单元测试

## 5.x. 图像内存管理

- [x] 5.x.1 创建 `ImageMemoryManager` 类
- [x] 5.x.2 实现 `createObjectURL` 和 `revokeObjectURL` 配对管理
- [x] 5.x.3 实现 URL 引用计数机制
- [x] 5.x.4 实现执行上下文中的图像引用传递（非 ImageData 传递）
- [x] 5.x.5 实现内存使用监控和阈值告警

## 5.3 核心修复与契约收束

- [x] 5.3.1 修复 memory-manager 内存计数递减逻辑
- [x] 5.3.2 修复 load-image MIME 类型识别
- [x] 5.3.3 修复 load-image CORS 校验逻辑（fetch 预检 + validateCorsHeaders）
- [x] 5.3.4 修复 export-image JPEG 白底合成
- [x] 5.3.5 统一 ExecutionContext 唯一来源
- [x] 5.3.6 让执行缓存真实接入 WorkflowExecutor
- [x] 5.3.7 为 executor 增加输入/参数运行时校验，移除危险 as 断言
- [x] 5.3.8 抽取公共 resizeImageData 工具函数
- [x] 5.3.9 统一 PortDefinition / ParamDefinition 类型契约
- [x] 5.3.10 类型化 PublishedWorkflowExecution.result
- [x] 5.3.11 统一 ExecutorOutput 标准返回结构
- [x] 5.3.12 补充上述修复项的单元测试与回归测试

## 6. 开发者工具 - 基础画布

- [x] 6.1 集成 React Flow 节点编辑器
- [x] 6.2 实现节点面板组件
- [x] 6.3 实现拖拽添加节点功能
- [x] 6.4 实现节点连线功能
- [x] 6.5 实现画布缩放和平移
- [x] 6.6 实现节点选中和高亮

## 7. 开发者工具 - 节点交互

- [x] 7.1 创建自定义节点组件
- [x] 7.2 实现参数面板组件
- [x] 7.3 实现节点删除功能
- [x] 7.4 实现连线删除功能
- [x] 7.5 实现节点预览缩略图

## 8. 开发者工具 - 工作流管理

- [x] 8.1 实现工作流保存功能，**通过 Storage Adapter 接口**
- [x] 8.2 实现工作流加载功能，**通过 Storage Adapter 接口**
- [x] 8.3 实现工作流导出 JSON
- [x] 8.4 实现工作流导入 JSON

## 8.x. Storage Adapter 存储适配器层

- [x] 8.x.1 定义 `StorageAdapter` 接口
  ```typescript
  interface StorageAdapter {
    save(workflow: Workflow): Promise<void>;
    load(id: string): Promise<Workflow>;
    list(): Promise<WorkflowMeta[]>;
    delete(id: string): Promise<void>;
  }
  ```
- [x] 8.x.2 实现 `LocalStorageAdapter`（MVP 阶段使用 localStorage）
- [x] 8.x.3 实现 `JsonFileAdapter`（导出/导入 JSON 文件）
- [x] 8.x.4 在 workflowStore 中集成 Storage Adapter
- [x] 8.x.5 预留云端存储扩展点（未来可接入 Notion Database、Supabase、Firebase 等）

## 9. 开发者工具 - 执行调试

- [x] 9.1 集成工作流执行引擎
- [x] 9.2 实现执行按钮和进度显示
- [x] 9.3 实现节点中间结果预览
- [x] 9.4 实现错误节点高亮显示

## 10. 发布机制

- [x] 10.1 实现发布配置面板
- [x] 10.2 实现参数可见性配置
- [x] 10.3 实现输入输出项配置
- [x] 10.4 实现发布态工作流生成
- [x] 10.5 实现用户端预览

## 11. 用户运行端 - 基础界面

- [x] 11.1 创建工作流列表页面
- [x] 11.2 创建工作流卡片组件
- [x] 11.3 实现工作流详情页路由

## 12. 用户运行端 - 执行功能

- [x] 12.1 实现图像上传组件
- [x] 12.2 实现暴露参数表单
- [x] 12.3 集成工作流执行功能
- [x] 12.4 实现执行进度显示
- [x] 12.5 实现结果预览显示

## 13. 用户运行端 - 导出功能

- [x] 13.1 实现图像下载功能
- [x] 13.2 实现多尺寸下载
- [x] 13.3 实现一键打包下载

## 14. 端到端测试

- [x] 14.1 编写 LoadImage → Export 完整链路测试
- [x] 14.2 编写带 Mask 的合成流程测试
- [x] 14.3 编写发布-运行完整流程测试

## 15. 项目整理

- [x] 15.1 更新 README.md 文档
- [x] 15.2 配置 .gitignore
- [x] 15.3 初始化 Git 仓库并提交

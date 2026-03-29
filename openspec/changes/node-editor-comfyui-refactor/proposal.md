# Prism Editor 节点编辑器 ComfyUI 风格重构

## Why

当前 Prism Editor 的开发者端节点编辑器处于 MVP 基础形态：节点是简单的信息卡片，右侧属性栏（ParamPanel）是单列表单，缺乏 ComfyUI 类工具的高信息密度交互体验。主要痛点：

1. **节点视觉密度不足**：参数靠 Chips 堆叠，大型图像节点无预览区，节点尺寸固定不可调
2. **Inspector 功能单薄**：右侧面板只有参数编辑，无节点结构编辑、无运行时信息、无节点显示设置
3. **交互能力缺失**：无多选、无分组、无右键菜单、无节点 resize
4. **图像预览能力分散**：Load Image / Composite / Transform 等图像节点没有统一的预览行为
5. **端口命名不统一**：NodeDefinition port id / React Flow handle id / JSON edge port name / executor key 四套名字散落在不同层，没有强制统一约束

架构增强（`enhance-architecture-resilience`）已完成状态管理、Worker 调度和端口类型校验，workflow-core / image-ops 主链路稳定，为编辑器层重构提供了坚实基础。

## What Changes

### 新增能力

- **Dense Control Node 样式**：所有 6 个基础节点统一改为高信息密度卡片风格，支持选中 / hover / error / running 态
- **节点 Resize**：图像类节点右下角拖拽缩放，预览区同步变大/变小
- **端口类型颜色统一**：image=蓝、mask=绿、number=橙、boolean=紫，连线颜色与端口颜色一致
- **Preview Image 节点**：新增专用图像预览节点，支持 resize 缩放预览区
- **三栏 Inspector**：右侧属性栏改为「参数 / 设置 / 信息」三个页签
- **多选与分组**：Ctrl 多选节点，按 G 创建分组
- **节点右键菜单**：支持重命名 / 复制 / 固定 / Bypass / 最小化 / 删除
- **动态输入端口**：Composite 节点允许在 Inspector 中新增 image 输入接口
- **统一端口命名约束**：NodeDefinition / React Flow / JSON / executor 四层端口名强制一致
- **统一图像运行时契约**：所有图像节点输入输出使用同一 ImageData runtime contract

### 重构节点

- **Load Image**：左侧空，右侧 image + mask 端口，主体显示文件名 + 上传按钮 + 图像预览 + 分辨率，图像区域可点击出现编辑指令占位框
- **Transform**：输入 image，输出 image，主体显示缩放算法 + 宽高 + 裁剪参数
- **Apply Mask**：输入 image + mask，输出 image，主体显示 mask type 等参数
- **Composite**：输入 base + overlay（可动态新增），输出 image，主体显示 blend/opacity
- **Export**：输入 image，输出 exported，主体显示格式 / 质量

### 不做的事

- 不复制 ComfyUI 代码结构
- 不大改 workflow-core 执行引擎
- 不重构 store 体系（`enhance-architecture-resilience` 成果保持不变）
- 不做复杂插件市场
- 不做视觉微调而忽略交互能力

## Capabilities

### New Capabilities

- `node-ui-dense-control`: Dense Control Node 统一样式系统——节点结构（Header / 端口 / 主体）、选中/hover/error/running 态、节点 resize 机制
- `port-type-colors`: 端口类型颜色体系 + 连线颜色与端口颜色一致 + 类型不兼容连线拒绝
- `node-resize`: 节点右下角拖拽 resize，图像预览区同步缩放
- `node-multi-select`: Ctrl + 点击多选，批量移动，视觉选中态
- `node-grouping`: 按 G 创建分组，包裹外框 + 标题 + 整体拖动
- `node-context-menu`: 右键菜单——重命名 / 复制 / 固定 / Bypass / 最小化 / 删除
- `node-inspector`: 三栏 Inspector（参数 / 设置 / 信息），参数栏编辑节点参数，设置栏编辑端口结构和节点显示，信息栏显示只读节点元数据和执行状态
- `preview-image-node`: 新增 PreviewImage 节点类型，输入 image，输出 image 透传，主体大预览图 + resize + 分辨率显示
- `dynamic-input-ports`: Composite 节点支持在 Inspector 中动态添加/移除 image 输入接口，节点内和连线同步响应
- `image-runtime-contract`: 统一图像运行时对象（ImageData + previewUrl + width + height），LoadImage / ApplyMask / Composite / Transform / PreviewImage / Export 全链路使用同一契约
- `port-naming-unification`: 强制约束 NodeDefinition port id = React Flow handle id = JSON edge port name = executor inputs/outputs key

### Modified Capabilities

- `node-editor`: 现有 PrismNode 改造为 Dense Control Node 风格；LoadImage / Transform / Composite / ApplyMask / Export 全部重构；NodePanel 调整以适应新节点类型

## Impact

- **apps/dev-tool**：
  - `components/nodes/PrismNode.tsx` 重写为 Dense Control Node 样式
  - `components/ParamPanel.tsx` 改造为三栏 Inspector
  - 新增 `components/PreviewImageNode.tsx`
  - 新增 `components/NodeContextMenu.tsx`
  - 新增 `components/Inspector/` 目录（ParametersPanel / SettingsPanel / InfoPanel）
  - `store/canvasStore.ts` 新增多选、分组、节点 resize 状态
  - `utils/portTypeStyles.ts` 扩展端口颜色定义
- **packages/node-definitions**：
  - `definitions.ts` 中所有节点定义重写（端口命名统一、params 精简展示）
  - 新增 `preview-image` 节点定义
- **packages/shared-types**：
  - `node.ts` 新增 `PortNamingConvention` 约束文档
  - `execution.ts` 扩展 `ImageRuntimeObject` 接口定义
- **packages/image-ops**：
  - `executors.ts` 图像输出统一为 `ImageRuntimeObject` 格式
- **packages/workflow-core**：
  - `executor.ts` executor inputs/outputs key 与 NodeDefinition port id 对齐验证
- **样式**：
  - `styles/global.css` 或新增 `styles/nodes/` 目录，统一 Dense Control Node CSS 变量和组件样式

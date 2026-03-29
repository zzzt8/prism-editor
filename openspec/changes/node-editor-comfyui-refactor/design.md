# 节点编辑器 ComfyUI 风格重构 - 技术设计

## Context

当前 Prism Editor dev-tool 的节点编辑器基础架构已完成（状态管理、Worker 调度、端口类型校验），但节点 UI 和交互仍处于 MVP 形态：

1. **PrismNode**（`apps/dev-tool/src/components/nodes/PrismNode.tsx`）：仅展示节点名、参数 Chips、输出缩略图，端口靠 Handle 渲染，节点尺寸固定
2. **ParamPanel**（`apps/dev-tool/src/components/ParamPanel.tsx`）：单列垂直表单，节点信息 / 输入端口 / 输出端口 / 参数 四个分区，无 Tab 切换
3. **连线**：已有基于 `PortDataType` 的类型校验，但连线颜色未按类型着色（目前统一灰色）
4. **无多选 / 分组 / 右键菜单 / resize**：canvasStore 仅支持单选节点
5. **端口命名散乱**：`definitions.ts` 中 LoadImage 的 image 输出端口 id 为 `"image"`，但 executor 中读取的 key 也混用；且 `type-validator.ts` 使用 `port.name` 而非 `port.id` 做输入查找，存在潜在 bug

本设计以此为基础，在不破坏 workflow-core / image-ops 主链路的前提下，系统化升级编辑器层。

## Goals / Non-Goals

**Goals:**
- 将 6 个基础节点统一改造为高信息密度的 Dense Control Node 卡片
- 节点支持选中 / hover / error / running 态，右下角 resize 缩放
- 端口类型颜色体系建立（image=蓝、mask=绿、number=橙、boolean=紫、string=灰蓝）
- 连线颜色与端口类型一致
- 右侧属性栏升级为三栏 Inspector（参数 / 设置 / 信息）
- 实现 Ctrl 多选、按 G 分组、右键上下文菜单
- 新增 Preview Image 节点
- 统一 NodeDefinition port id / React Flow handle id / JSON edge port / executor key 四层命名
- 统一图像运行时对象契约（ImageData + previewUrl + width + height）
- 强制执行三条运行时契约（R1: 端口 ID 四层统一 / R2: ImageRuntimeObject / R3: requireInput 输入校验）

**Non-Goals:**
- 不复制 ComfyUI 代码结构
- 不大改 workflow-core 拓扑排序和执行逻辑
- 不重构 Zustand store 架构（已在 `enhance-architecture-resilience` 中完成）
- 不做插件市场、节点市场
- 不做 AI 编辑功能（仅预留 UI 占位）
- 不做节点组子工作流语义

## Mandatory Rules

> 以下三条规则为强制约束，所有实现必须遵循，不得绕过。代码审查时优先检查这三条，任何例外必须经过讨论并更新本文档。

### R1: 端口 ID 四层完全统一（强制）

**规则**：以下四层的端口标识必须完全一致：

| Layer | 字段 |
|---|---|
| 1. NodeDefinition | `port.id` |
| 2. React Flow Handle | `<Handle id={port.id} />` |
| 3. JSON edge | `sourceHandleId` / `targetHandleId` |
| 4. Executor | `ctx.requireInput<T>(port.id, ...)` / 输出 key |

**禁止出现**：
- `image` / `img` / `input_image` 混用
- `base` / `input` / `imageBase` 混用
- 任何 port 的 `id` 与其他三层的 key 不一致

**已发现 Bug**：当前 `type-validator.ts` 在 `validateInputs` 中使用 `inputs[port.name]` 而非 `inputs[port.id]`。这会导致当 port 的 `id` 与 `name` 不同时，校验逻辑错误地读取 `undefined`。修复方法：所有使用 `port.name` 的地方改为 `port.id`。

**Export 节点例外**：`export` 节点的输出 port id 为 `exported`（而非 `image`），这是经讨论后确认的设计选择（`exported` 表示已导出文件，与中间图像数据的 `image` 语义不同）。

### R2: ImageRuntimeObject 契约（强制）

**规则**：所有图像节点的输出必须符合 `ImageRuntimeObject` 接口：

```typescript
// packages/shared-types/src/execution.ts
export interface ImageRuntimeObject {
  /** 像素数据，用于节点间传递 */
  data: ImageData;
  /** 图像宽度 */
  width: number;
  /** 图像高度 */
  height: number;
  /** Blob URL，用于 UI 预览（由 ImageMemoryManager 管理生命周期） */
  previewUrl: string;
  /** 可选：来源文件名（LoadImage 节点填充） */
  sourceFileName?: string;
}
```

**各节点输出规范**：

| 节点 | 输出字段 | 类型 |
|---|---|---|
| LoadImage | `image` | `ImageRuntimeObject` |
| ApplyMask | `image`（主图） | `ImageRuntimeObject` |
| Transform | `image` | `ImageRuntimeObject` |
| Composite | `image` | `ImageRuntimeObject` |
| PreviewImage | `image` | `ImageRuntimeObject`（透传输入） |
| Export | `exported` | `ImageRuntimeObject` |

**禁止**：
- 直接传 canvas 或 HTMLImageElement 作为节点间数据
- 直接传 URL string 作为节点间数据
- 节点间传递非 `ImageRuntimeObject` 格式的图像数据

**PreviewUrl 规范**：`previewUrl` 统一为 `blob:` URL，由 `ImageMemoryManager.createObjectURL()` 生成。Export 节点额外提供 `dataUrl` 字段（`data:` URL，用于触发下载）。

### R3: Executor 输入校验必须使用 requireInput（强制）

**规则**：所有 executor 中的**必需输入**必须通过 `ctx.requireInput<T>(key, nodeName)` 获取，禁止直接访问 `ctx.inputs[key]`。

`ctx.requireInput` 在 `packages/workflow-core/src/context.ts` 中定义：

```typescript
requireInput<T>(key: string, nodeName: string): T {
  const value = this.inputs[key] as T | undefined;
  if (value === undefined || value === null) {
    throw new Error(`${key} input is required for ${nodeName} node`);
  }
  return value;
}
```

**调用规范**：
```typescript
// 正确
const image = ctx.requireInput<ImageData>('image', 'Transform');
const mask  = ctx.requireInput<ImageData>('mask', 'ApplyMask');

// 禁止
const image = ctx.inputs['image'] as ImageData; // 不校验
```

**TypeValidator 定位**：TypeValidator 是独立的预执行校验层（`packages/workflow-core/src/type-validator.ts`），它检查类型兼容性。Executor 使用 `requireInput` 做运行时校验。两者职责不同，但 TypeValidator 必须修复使用 `port.name` 而非 `port.id` 的 Bug。

## Decisions

### 1. Dense Control Node 节点结构

**决策**：每个节点统一为四区结构：Header / 输入端口列 / 主体内容 / 输出端口列

```
┌─────────────────────────────────────────────────────┐
│ ● Node Title                                 ≡ ✕    │  ← Header
├──────────┬──────────────────────────────┬─────────┤
│          │                              │         │
│ [Image]  │       主体内容               │     [→] │  ← 端口列
│ [Mask]   │  (参数区 / 图像预览 / 描述)  │     [→] │
│          │                              │         │
├──────────┴──────────────────────────────┴─────────┤
│                                    ↖ resize handle │  ← 可选 resize
└─────────────────────────────────────────────────────┘
```

**Header 结构**：
- 左侧：状态指示点（idle=灰 / running=黄 / done=绿 / error=红）
- 中间：节点标题（可编辑别名）
- 右侧：菜单按钮（显示上下文菜单入口）

**主体内容**：
- 图像节点：文件信息 + 上传按钮 + 图像预览 + 分辨率标签
- 参数节点：关键参数 inline 展示（slider + value，或 select）
- 无输入节点（如 LoadImage）：左侧端口列为空

**CSS 类命名约定**：
- `.dcn-node` — 根节点容器
- `.dcn-header` — 顶部条
- `.dcn-body` — 主体区
- `.dcn-ports-left` / `.dcn-ports-right` — 端口列
- `.dcn-port` — 单个端口行（label + handle）
- `.dcn-preview` — 图像预览区
- `.dcn-param` — 参数行
- `.dcn-resize-handle` — 右下角 resize 手柄

**原因**：
- ComfyUI 的高信息密度来自"端口列 + 内联参数"的二维布局，而非一维垂直列表
- React Flow 的 Handle 组件放在节点内部而非外部，保证端口与内容对齐
- Header + Body 分离便于差异化样式（Header 颜色按 category，Body 按节点类型）

**替代方案**：
- 沿用现有 PrismNode 的底部输出缩略图：不够紧凑，图像节点空间利用率低
- 将所有参数塞进 Body：对于 ApplyMask/Transform 等参数多的节点会过高

### 2. 端口类型颜色体系

**决策**：扩展 `utils/portTypeStyles.ts`，建立完整类型颜色映射，连线颜色取端口颜色

```typescript
const PORT_TYPE_COLORS: Record<PortDataType, string> = {
  [PortDataType.IMAGE]:     '#3B82F6',  // 蓝
  [PortDataType.MASK]:      '#22C55E',  // 绿
  [PortDataType.NUMBER]:    '#F97316',  // 橙
  [PortDataType.STRING]:    '#94A3B8',  // 灰蓝
  [PortDataType.BOOLEAN]:   '#A855F7',  // 紫
  [PortDataType.FILE]:      '#EC4899',  // 粉
  [PortDataType.VIDEO]:     '#EF4444',  // 红
  [PortDataType.AUDIO]:     '#EAB308',  // 黄
  [PortDataType.JSON]:      '#06B6D4',  // 蓝绿
  [PortDataType.VOID]:      '#6B7280',  // 灰
  [PortDataType.ANY]:       '#FFFFFF',  // 白
};
```

**PrismEdge 改造**：从 `sourceHandleId` / `targetHandleId` 获取端口类型，`style={{ stroke: portColor }}`

**连线类型校验**：已由 `enhance-architecture-resilience` 的 `canConnectByDataType` 实现，继续复用

**原因**：
- 颜色编码让用户一眼识别连线类型，符合 ComfyUI 用户的直觉
- 单一数据源（`PORT_TYPE_COLORS`）保证 UI / 连线 / 端口三处颜色一致

### 3. 节点 Resize 机制

**决策**：使用 React Flow 的 `NodeResizer` 组件，限制仅图像节点可 resize，设置最小 / 最大尺寸

```tsx
import { NodeResizer } from '@xyflow/react';

<NodeResizer
  minWidth={200}
  minHeight={120}
  maxWidth={480}
  maxHeight={360}
  isVisible={selected && isImageNode}
  handleStyle={{ backgroundColor: portColor }}
  lineStyle={{ borderColor: portColor }}
/>
```

**已确认**：
- 节点 resize **默认自由缩放**（不锁定宽高比），允许用户自由调整节点大小
- 图像**内容**（预览图）内部始终保持原图比例：`object-fit: contain` 使图像内容自动适应容器而不变形

**Resize 后布局响应**：主体内容使用 CSS Grid/Flex 布局，`preview-image` 使用 `object-fit: contain` 自适应容器

**PreviewImage 节点特殊性**：PreviewImage 的预览图是主要内容，resize 时预览区同步缩放

**原因**：
- `@xyflow/react` 原生支持 NodeResizer，无需自实现拖拽逻辑
- 仅图像节点开启 resize 避免普通参数节点过度缩放
- resize 时预览图同步缩放是用户核心期望

**替代方案**：
- 自定义 resize handle：需要处理鼠标事件、边界计算，增加复杂度
- CSS resize 属性：无法限制范围，不适合节点场景

### 4. 三栏 Inspector

**决策**：将 ParamPanel 改造为 Tab 容器，内部三个 Panel

```
┌──────────────────────────────────────┐
│  参数  │  设置  │  信息             │  ← Tab Bar
├──────────────────────────────────────┤
│                                      │
│  参数编辑表单                        │  ← ParametersPanel
│  (或设置表单 / 或只读信息)           │
│                                      │
└──────────────────────────────────────┘
```

**ParametersPanel**：
- 复用现有 ParamField 组件（`image-file` / `string` / `number` / `select` / `boolean`）
- 图像节点增加输入图像缩略信息（分辨率、来源节点）
- 与节点内参数控件保持双向同步

**SettingsPanel**：
- 节点别名 / 标题编辑
- 输入/输出端口管理（Composite 场景：动态添加 image 输入接口）
- 显示模式切换（展开 / 折叠参数 / 仅标题）
- 节点颜色覆盖（可选）

**InfoPanel**：
- 节点类型（nodeType string）
- 节点 ID
- 输入端口列表（含连接状态）
- 输出端口列表（含连接状态）
- 最后执行时间 / 状态（来自 executionStore）
- 执行耗时（如果执行过）

**原因**：
- ComfyUI 的三栏结构是经过大量用户验证的信息层级
- 参数 / 设置分离避免单页表单过长
- Info 栏提供诊断能力，辅助调试

**替代方案**：
- 保持单栏：将设置 / 信息折叠到参数区 → 表单过长，体验差
- 侧滑抽屉：需要额外动画，且信息密度低

### 5. 多选与分组

**决策**：
- `Ctrl` + 点击 → 切换选中态（toggle selection）
- 空白区域点击 → 清除选中
- 多选后拖动 → 批量移动所有选中节点
- 按 `G` 键 → 为选中节点创建 Group
- Group 渲染为普通 React Flow Node（自定义 GroupNode 组件）

**Group 数据结构**（存入 canvasStore）：

```typescript
interface NodeGroup {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];  // 属于该组的节点 IDs
  bounds: { x: number; y: number; width: number; height: number };
}
```

**GroupNode 组件**：
- 仅在节点被选中时显示（或在 Group 被选中时显示）
- 绘制圆角矩形背景（`border-radius: 8px`）
- 左上角显示 Group 标题
- 拖动 Group 标题时同步移动所有子节点

**已确认**：Group 拖动时同步移动子节点（Group 移动 = 批量 translate 子节点）。

**原因**：
- React Flow 原生支持多选（`multiSelectionKeyCode: 'Ctrl'`），无需自实现
- Group 作为 Node 而非 DOM 叠加层，保证与 React Flow 视图系统兼容
- 先做视觉分组 + 画布组织，不引入子工作流语义，降低初期复杂度

**替代方案**：
- 使用 React Flow 的 Group 特性（`NodeGroup` API）：目前 React Flow 无原生 Group API
- DOM 叠加层方案：会遇到 z-index / 事件穿透问题

### 6. 节点右键上下文菜单

**决策**：在 `WorkflowCanvas` 中监听 `onNodeContextMenu`，渲染 ContextMenu 组件

```tsx
const onNodeContextMenu = useCallback((event: MouseEvent, node: Node) => {
  event.preventDefault();
  setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
}, []);
```

**ContextMenu 项目**：
| 菜单项 | 操作 | 快捷键 |
|--------|------|--------|
| 重命名 | 激活标题 inline 编辑 | F2 |
| 复制 | 克隆节点到画布 | Ctrl+C |
| 剪切 | 移除节点并复制到剪贴板 | Ctrl+X |
| 粘贴 | 在鼠标位置粘贴 | Ctrl+V |
| 固定 / 解除固定 | 防止节点被意外移动 | - |
| Bypass | 跳过该节点执行（穿线） | - |
| 最小化 | 折叠为仅显示标题 | - |
| 删除 | 移除节点及连线 | Del |
| 节点信息 | 打开 Info 栏（若未打开） | - |

**Bypass 实现**：初版走 executor 透传/跳过逻辑——在 canvasStore 中标记节点 `bypassed: true`，executor 检测到此标记时直接将所有输入透传到输出（不对数据做任何处理），不修改 edges 结构。

**原因**：
- 不做 graph 穿线（不在 edges 中添加 bypass edge），避免 edges 结构复杂化
- executor 透传实现简单（仅做输入转发），适合初版
- 右键菜单是节点编辑器的事实标准交互，菜单项覆盖了最常用的节点操作集

### 7. Preview Image 节点

**决策**：新增节点类型，不依赖现有 Export 节点

```typescript
// packages/node-definitions/src/definitions.ts
export const previewImageDefinition: NodeDefinition = {
  type: 'preview-image',
  category: NODE_CATEGORIES.OUTPUT,
  label: 'Preview Image',
  inputs: [{ id: 'image', name: 'Image', type: 'image', dataType: PortDataType.IMAGE, required: true }],
  outputs: [{ id: 'image', name: 'Image', type: 'image', dataType: PortDataType.IMAGE, required: false }],
  params: [],
};
```

**节点特点**：
- 主体为大面积图像预览（`object-fit: contain`，响应 resize）
- 右下角 resize handle
- 底部显示分辨率信息（`1920 × 1080`）
- 无其他参数
- 输出端口透传输入图像（不影响数据流）
- **已确认**：保留 `image` 输出端口（而非移除），连线颜色按 `image` 类型着色（蓝色，`#3B82F6`）

**Executor**（`packages/image-ops/src/executors.ts`）：
```typescript
previewImageExecutor: async (inputs, params, ctx) => {
  const image = ctx.requireInput<ImageData>('image', 'PreviewImage');
  const preview = createPreviewRef(image); // 生成 previewUrl
  return {
    image,       // 透传
    previewUrl: preview.url,
    width: image.width,
    height: image.height,
  };
}
```

**原因**：
- 专用预览节点与 Export 解耦（Export 专注导出文件）
- PreviewImage 可多节点同时预览，便于对比
- resize 机制让用户控制预览大小

### 8. 动态输入端口（Composite 为例）

**决策**：Composite 节点的 inputs 在 NodeDefinition 中声明为基础 inputs（base、overlay），额外 inputs 通过节点 data 存储

**已确认**：动态端口只存在于**实例层**（canvasStore 的 node data），不修改全局 NodeDefinition。NodePanel / 节点面板始终显示 NodeDefinition 中声明的静态端口列表，额外端口由用户在 Inspector 中动态添加。

**canvasStore 扩展**：
```typescript
interface CanvasNodeData {
  // ... 现有字段
  extraInputs?: { id: string; name: string; type: 'image'; dataType: PortDataType.IMAGE }[];
}

// canvasStore
addExtraInput: (nodeId: string, port: { id: string; name: string }) => void;
removeExtraInput: (nodeId: string, portId: string) => void;
```

**PrismNode 改造**：合并 `definition.inputs` + `data.extraInputs` 渲染输入端口

**Inspector SettingsPanel**：提供「+ 添加输入」按钮，选择端口类型后添加到节点

**连线同步**：新增连线时，targetHandleId 对应新端口，executor 读取时 `ctx.inputs[portId]` 存在则使用

**原因**：
- 最小化改动——无需修改 workflow-core 的节点注册机制
- 额外端口通过 canvasStore data 层存储，不破坏 NodeDefinition 静态定义
- Composite 的 blendMode / opacity 参数本身不变

**替代方案**：
- 修改 NodeDefinition 动态注册：需要修改 node-definitions registry，增加复杂度
- 完全动态端口注册到 NodeDefinition：影响类型校验，破坏现有架构

### 9. 统一端口命名约束

**决策**：建立 `PORT_NAMING_CONVENTION`，并在代码审查 / 类型层面强制执行

```typescript
// packages/shared-types/src/node.ts

/**
 * Port Naming Convention（强制约束）
 *
 * 节点端口在四层命名必须一致：
 * 1. NodeDefinition.port.id           — 节点定义中的端口 ID
 * 2. React Flow Handle.id             — 画布上的 handle ID
 * 3. JSON edge sourceHandleId/targetHandleId — 序列化连线时的端口标识
 * 4. executor inputs/outputs key     — 执行器读取的 key
 *
 * 示例（LoadImage 节点）：
 *   NodeDefinition:   outputs: [{ id: 'image', name: 'Image', type: 'image', ... }]
 *   Handle:           <Handle id="image" position={Position.Right} />
 *   Edge JSON:        { sourceHandleId: 'image', targetHandleId: '...' }
 *   Executor:         ctx.requireInput<ImageData>('image', 'LoadImage')
 *
 * 命名规则：
 * - 使用 camelCase（image, mask, alpha, output）
 * - 避免缩写（用 image 不用 img，用 mask 不用 msk）
 * - 单复数一致（用 imageInputs 不用 imageInput）
 * - 复合节点用层级前缀（baseImage, overlayImage）
 *
 * 类型强制：在 CanvasNodeData 中，inputs/outputs 引用 NodeDefinition 时校验 id 对齐
 */
```

**代码层面执行**：
- `PrismNode` 渲染 Handle 时，`id={input.id}` 直接取 `definition.inputs[i].id`
- executor 读取时，`ctx.requireInput('image', ...)` 中的 key 与定义中的 `id` 一致
- JSON 序列化时，`sourceHandleId` = Handle.id，`targetHandleId` = Handle.id
- `onConnect` 校验时，比较的是 `PortDataType` 而非字符串名称

**当前状态**：大多数端口命名已经一致。但存在以下问题需要修复：
1. **TypeValidator Bug**（`type-validator.ts` line 123）：`inputs[port.name]` 应改为 `inputs[port.id]`。当前 `port.name === port.id`，所以没有触发 bug，但这是潜在隐患。
2. **序列化 Fallback 危险**（`canvasStore.ts` lines 376-380）：`sourceHandle ?? 'out'` / `targetHandle ?? 'in'` 的 fallback 在 handle 为 null 时静默生成无效 key，改为抛出错误。
3. **验证工具**：新增 `scripts/validate-port-naming.ts`，检查 definitions.ts 和 executors.ts 中端口命名一致性。

### 10. 统一图像运行时契约

**决策**：扩展 `packages/shared-types/src/execution.ts`，定义 `ImageRuntimeObject` 作为所有图像节点输出的基础类型（补充而非替代 discriminated union）

```typescript
// packages/shared-types/src/execution.ts

export interface ImageRuntimeObject {
  /** 像素数据，用于节点间传递 */
  data: ImageData;
  /** 图像宽度 */
  width: number;
  /** 图像高度 */
  height: number;
  /** Blob URL，用于 UI 预览（由 ImageMemoryManager 管理生命周期） */
  previewUrl: string;
  /** 可选：来源文件名（LoadImage 节点填充） */
  sourceFileName?: string;
}
```

**各节点输出规范**：

| 节点 | 输出字段 | 类型 |
|---|---|---|
| LoadImage | `image` | `ImageRuntimeObject` |
| ApplyMask | `image`（主图） | `ImageRuntimeObject` |
| Transform | `image` | `ImageRuntimeObject` |
| Composite | `image` | `ImageRuntimeObject` |
| PreviewImage | `image` | `ImageRuntimeObject`（透传输入） |
| Export | `exported` | `ImageRuntimeObject` |

**Export 节点特殊处理**：Export 的输出 port id 为 `exported`（保持与 `image` 的语义区分）。`exported` 字段本身也是 `ImageRuntimeObject`，但其 `data` 字段为 `Blob`（导出的文件）而非 `ImageData`。

**旧格式兼容**：
- 当前 `image-ops/executors.ts` 中 executor 返回的 `{ image: ImageData, previewUrl, width, height }` 需要包装为 `ImageRuntimeObject`
- `ImageRuntimeObject.data: ImageData` 而非直接 `ImageData`，所以 executor 需要做一层包装
- discriminated union 的 `type` 字段保留不变（`type: 'load-image'` 等）

**验证工具**：`scripts/validate-port-naming.ts` 也应检查 executor 输出 key 是否与 NodeDefinition output port id 一致（`image` / `exported`）

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 节点重构影响现有节点编辑器可用性 | 开发过程中 dev-tool 暂时不可用 | 按 Phase 分步实现，每 Phase 完成后验证基础链路（LoadImage → Transform → Export） |
| Resize 状态下连线锚点偏移 | 连线起点/终点与节点主体错位 | 使用 NodeResizer 的 `keepStyle` 模式，或在 resize 时不改变 handle 位置 |
| 多选拖动时连线抖动 | 连线实时更新导致视觉跳变 | 使用 `requestAnimationFrame` 批量更新，或使用 React Flow 的 `applyNodeChanges` |
| Inspector Tab 切换丢失编辑状态 | 用户在设置 Tab 编辑了别名，切换到参数 Tab 后别名未保存 | 在 store 层面跟踪临时编辑状态，切换 Tab 时自动持久化 |
| Group 与节点 z-index 冲突 | Group 背景遮挡节点内容 | Group 渲染在节点下方（lower z-index），或使用 React Flow 的 `nodeOrigin` |
| 动态端口 executor 读取失败 | Composite 添加了 extra overlay，executor 找不到输入 | executor 中使用 `ctx.inputs[portId] ?? fallback`，或由 canvasStore 校验必须连接 |
| 四层命名不一致导致运行时 bug | executor 读取 key 与 NodeDefinition port id 不匹配 | 添加类型推断：`NodeExecutor = (inputs: Record<PortId, ImageData>, ...)` |
| PreviewImage resize 性能问题 | 大图实时 resize 导致卡顿 | 使用 `will-change: transform` CSS hint，或限制 resize 频率（debounce 100ms） |

## Migration Plan

**整体策略**：按 Phase 分步实现，每 Phase 完成后验证基本链路，不断章取义。

### Phase 1: 节点编辑器基础外观与交互

1. 创建 `styles/nodes/dense-control-node.css`，定义 CSS 变量和 `.dcn-*` 类
2. 改造 PrismNode 为 Dense Control Node 结构（Header / 端口列 / Body / Resize Handle）
3. 扩展 `portTypeStyles.ts` 端口类型颜色
4. 改造 PrismEdge，使连线颜色与 sourceHandle 类型一致
5. 实现节点 Resize（NodeResizer 组件集成）
6. 实现 Ctrl 多选（canvasStore 扩展 + WorkflowCanvas 集成）
7. 实现按 G 创建 Group（GroupNode 组件 + canvasStore group CRUD）
8. 实现节点右键上下文菜单（ContextMenu 组件 + canvasStore 操作）

**验证链路**：多选节点 → 批量移动 → 创建 Group → 右键菜单删除节点

### Phase 2: 图像节点能力

9. 重构 LoadImage 节点（内部结构改为预览区 + 上传按钮 + 分辨率）
10. 重构 Transform 节点（内联参数展示）
11. 重构 ApplyMask 节点（内联参数 + 输入图像缩略信息）
12. 重构 Composite 节点（内联 blend/opacity 参数）
13. 重构 Export 节点（内联格式/质量展示）
14. 新增 PreviewImage 节点 + executor
15. 图像节点预览区响应 Resize

**验证链路**：
- LoadImage → PreviewImage → Export（基本预览）
- LoadImage → Transform → PreviewImage（参数链）

### Phase 3: Inspector 升级

16. 创建 InspectorTabBar 组件（参数 / 设置 / 信息）
17. 重构 ParametersPanel（复用 ParamField，图像节点增加输入缩略）
18. 创建 SettingsPanel（节点别名 / 端口管理 / 显示模式）
19. 创建 InfoPanel（节点元数据 / 连接状态 / 执行信息）
20. Composite 动态输入端口（SettingsPanel 添加输入接口 → canvasStore extraInputs → PrismNode 渲染新端口）
21. 节点内参数与 Inspector 参数双向同步

**验证链路**：
- 选中 Composite 节点 → Settings 添加 overlay3 输入 → 连线 → 执行成功

### Phase 4: 接口统一与验证

22. 添加 `scripts/validate-port-naming.ts`，修复所有端口命名不一致
23. 扩展 `ImageRuntimeObject` 接口，统一 executor 输出格式
24. 端到端验证：
    - LoadImage → Transform → PreviewImage → Export（完整链路）
    - LoadImage + LoadImage → Composite → PreviewImage → Export（双图合成）

**验证链路**：完整链路执行，打印各节点 executionResult，确认图像数据正确传递

**回滚策略**：
- 每 Phase 完成后的工作目录为稳定提交点
- 使用 Git stash 分支隔离：`_wip/refactor` 工作分支，`main` 为稳定分支
- 若 Phase 间出现阻断性问题，在上一个稳定提交点修复

## Open Questions

1. **~~Group 移动同步~~ → 已确认**：Group 拖动时同步移动所有子节点。
2. **~~Bypass 实现细节~~ → 已确认**：初版走 executor 透传，不做 graph 穿线。
3. **~~PreviewImage 输出端口~~ → 已确认**：保留 `image` 输出端口，颜色按 image 类型着色（蓝色）。
4. **~~Resize 时保持宽高比~~ → 已确认**：节点 resize 默认自由缩放，图像内容内部保持原比例。
5. **~~动态端口的 NodeDefinition 更新~~ → 已确认**：仅在 canvasStore data 层存储 extraInputs/extraOutputs，不修改全局 NodeDefinition。
6. **~~TypeValidator 与 requireInput 整合~~ → 已确认**：两者保持独立——TypeValidator 做类型兼容性检查，ctx.requireInput() 做运行时存在性检查，职责分离，互不合并。

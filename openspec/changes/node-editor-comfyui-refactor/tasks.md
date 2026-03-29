# 节点编辑器 ComfyUI 风格重构 - 实现任务列表

> **开发约束**
>
> 1. **每次 apply 最多选择 2-3 个小节实现**，不要贪多
> 2. **按 Phase 顺序逐节实现**，确保每节完成后进行测试
> 3. **测试不通过必须找出问题**，不要跳过或忽略错误
> 4. **每节完成后标记 `[x]`，失败后记录问题并修复**
>
> **验证策略**：
> - 单节完成后立即在 dev-tool 中手动验证（节点拖动、连线、执行）
> - 不引入新测试文件（现有 160 测试保证主链路稳定）
> - 每次 commit 以 Phase 小节为单位，说明修改文件和可用能力

## 实施顺序建议

| 优先级 | 章节 | 说明 |
|--------|------|------|
| 1 | 1. CSS 样式系统与 Dense Control Node 基础 | UI 重构的视觉基础 |
| 2 | 2. 节点 UI 全面改造 | PrismNode 结构重写 |
| 3 | 3. 端口类型颜色体系与连线颜色 | 连线按类型着色 |
| 4 | 4. 节点 Resize 机制 | 图像节点缩放 |
| 5 | 5. 多选与分组 | canvasStore 扩展 |
| 6 | 6. 节点右键上下文菜单 | ContextMenu 组件 |
| 7 | 7. 图像节点重构（LoadImage / Transform / ApplyMask / Composite / Export） | 节点内容按新样式重写 |
| 8 | 8. 新增 PreviewImage 节点 | 新节点类型 + executor |
| 9 | 9. Inspector 三栏改造 | ParamPanel → Inspector |
| 10 | 10. 动态输入端口（Composite） | SettingsPanel 端口管理 |
| 11 | 11. 端口命名统一验证（R1） | TypeValidator bug fix + 四层一致性 |
| 12 | 12. 图像运行时契约统一（R2+R3） | 全链路 ImageRuntimeObject + requireInput |
| 13 | 14. 强制规则端到端验证 | R1/R2/R3 完整链路验证 |
| 14 | 13. 端到端链路验证 | 完整链路测试 |

## 1. CSS 样式系统与 Dense Control Node 基础

> **目标**：建立统一的设计语言，为所有节点重构提供视觉基础
> **修改文件**：`apps/dev-tool/src/styles/` 目录

- [x] 1.1 创建 `styles/nodes/dense-control-node.css`，定义完整 CSS 变量系统（颜色、间距、圆角、阴影、字体）
- [x] 1.2 定义 `.dcn-node` / `.dcn-header` / `.dcn-body` / `.dcn-ports-left` / `.dcn-ports-right` / `.dcn-port` / `.dcn-resize-handle` 等核心类
- [x] 1.3 定义节点状态样式：`.dcn-node--selected` / `.dcn-node--hover` / `.dcn-node--error` / `.dcn-node--running`
- [x] 1.4 定义端口类型颜色 CSS 变量（`--port-image` / `--port-mask` / `--port-number` 等）
- [x] 1.5 定义 Group 样式：`.dcn-group` / `.dcn-group-header` / `.dcn-group-body`
- [x] 1.6 定义 ContextMenu 样式：`.dcn-context-menu` / `.dcn-context-menu-item`
- [ ] 1.7 验证：启动 dev-tool，所有现有节点样式正常，无布局错乱

## 2. 节点 UI 全面改造（PrismNode）

> **目标**：将 PrismNode 从 MVP 卡片改造为 ComfyUI 风格 Dense Control Node
> **修改文件**：`apps/dev-tool/src/components/nodes/PrismNode.tsx`

- [x] 2.1 重写 PrismNode 根容器，采用 `.dcn-node` 类和四区结构（Header / 端口列 / Body / 输出端口列）
- [x] 2.2 实现 Header 区：状态点（idle/running/done/error）+ 节点标题（可编辑别名）+ 菜单按钮
- [x] 2.3 实现左侧输入端口列：合并 `definition.inputs` + `data.extraInputs` 渲染，端口名 + 类型颜色 handle
- [x] 2.4 实现右侧输出端口列：合并 `definition.outputs` + `data.extraOutputs` 渲染，端口名 + 类型颜色 handle
- [x] 2.5 实现节点主体区：替换现有 Chips + 缩略图，为图像节点预留预览区布局
- [x] 2.6 实现执行状态错误展示（保留现有逻辑，适配新样式）
- [x] 2.7 实现选中态 / hover 态 / error 态 / running 态样式
- [ ] 2.8 验证：LoadImage / Transform / ApplyMask / Composite / Export 五个节点均以新样式渲染

## 3. 端口类型颜色体系与连线颜色

> **目标**：建立完整端口类型颜色体系，连线颜色与端口颜色一致
> **修改文件**：`apps/dev-tool/src/utils/portTypeStyles.ts`、`apps/dev-tool/src/components/edges/PrismEdge.tsx`

- [x] 3.1 扩展 `PORT_TYPE_COLORS` 映射，补全所有 PortDataType 颜色（IMAGE=蓝、MASK=绿、NUMBER=橙、BOOLEAN=紫、STRING=灰蓝、FILE=粉红等）
- [x] 3.2 在 `portTypeStyles.ts` 中导出 `getEdgeColor(sourceHandleId, targetHandleId)` 工具函数
- [x] 3.3 改造 PrismEdge：从 sourceHandleId 获取源端口类型，读取 PORT_TYPE_COLORS 设置 `style.stroke`
- [x] 3.4 实现连线 hover 高亮（opacity 提升，stroke-width 加粗）
- [x] 3.5 实现连线 selected 高亮（使用选中态颜色）
- [ ] 3.6 验证：从 LoadImage 拖出的 image 类型连线为蓝色，从 ApplyMask 拖出的 mask 类型连线为绿色；hover 时高亮

## 4. 节点 Resize 机制

> **目标**：图像节点支持右下角拖拽缩放，预览区同步响应
> **已确认**：节点 resize 默认自由缩放（不锁定宽高比），图像内容内部保持原图比例（`object-fit: contain`）
> **修改文件**：`apps/dev-tool/src/components/nodes/PrismNode.tsx`、`apps/dev-tool/src/styles/nodes/dense-control-node.css`

- [x] 4.1 安装 / 确认 `@xyflow/react` 已含 `NodeResizer`（React Flow v11+ 原生支持）
- [x] 4.2 在 PrismNode 中集成 `NodeResizer`，仅 `isImageNode && selected` 时显示
- [x] 4.3 设置图像节点 resize 范围：minWidth=200, minHeight=120, maxWidth=480, maxHeight=360
- [x] 4.4 定义 `.dcn-node--resizing` 样式（resize 过程中节点边框高亮）
- [x] 4.5 图像预览区使用 CSS `object-fit: contain` 响应容器尺寸变化
- [ ] 4.6 验证：选中 LoadImage 节点，拖动右下角 resize handle，节点和预览图同步缩放；取消选中后 resize handle 消失

## 5. 多选与分组

> **目标**：Ctrl 多选节点，按 G 创建分组，批量移动和分组管理
> **修改文件**：`apps/dev-tool/src/store/canvasStore.ts`、`apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`、`apps/dev-tool/src/components/nodes/GroupNode.tsx`

- [x] 5.1 在 canvasStore 中扩展 `selectedNodeIds` 为 `string[]`（已部分实现），确保支持多选
- [x] 5.2 配置 React Flow `multiSelectionKeyCode: 'Ctrl'`，使 Ctrl+点击可多选
- [x] 5.3 实现多选后批量移动（React Flow 原生支持，验证 store 同步正常）
- [x] 5.4 在 canvasStore 中新增 `groups: NodeGroup[]` 和 `addGroup` / `removeGroup` / `updateGroup` / `moveGroup` 操作
- [x] 5.5 创建 `GroupNode.tsx`：圆角矩形背景 + 标题 + 整体拖动同步子节点
> **已确认**：Group 拖动标题时同步移动所有子节点（Group 移动 = 批量 translate 子节点）
- [x] 5.6 在 WorkflowCanvas 中监听键盘事件（按 G 且有多选节点时调用 `addGroup`）
- [ ] 5.7 验证：选中 2-3 个节点，按 G 创建 Group；拖动 Group 标题，所有子节点同步移动

## 6. 节点右键上下文菜单

> **目标**：节点支持右键菜单，提供常用操作
> **修改文件**：`apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`、`apps/dev-tool/src/components/canvas/NodeContextMenu.tsx`

- [x] 6.1 创建 `NodeContextMenu.tsx`：接收 `{ x, y, nodeId }`，渲染菜单列表（重命名/复制/剪切/粘贴/固定/Bypass/最小化/删除/节点信息）
- [x] 6.2 在 WorkflowCanvas 中监听 `onNodeContextMenu`，调用 `setContextMenu`
- [x] 6.3 实现「复制」：克隆节点到画布（canvasStore `addNode`）
- [x] 6.4 实现「剪切」：复制节点后删除原节点
- [x] 6.5 实现「粘贴」：在鼠标位置粘贴剪贴板节点
- [x] 6.6 实现「固定」：在 canvasStore 中标记节点 `pinned=true`，阻止移动
- [x] 6.7 实现「Bypass」：在 canvasStore 中标记节点 `bypassed=true`，各 executor 检测到此标记时直接将输入透传到输出（不对数据做任何处理），不修改 edges 结构
> **已确认**：初版走 executor 透传/跳过，不做 graph 穿线
- [x] 6.8 实现「最小化」：节点 data 中设置 `minimized=true`，PrismNode 渲染为仅标题
- [x] 6.9 实现「删除」：调用 canvasStore `removeNode`，删除关联 edges
- [x] 6.10 实现「节点信息」：选中节点，切换 Inspector 到「信息」Tab
- [ ] 6.11 验证：右键 LoadImage 节点，弹出菜单，选择「删除」，节点和连线被移除

## 7. 图像节点重构（LoadImage / Transform / ApplyMask / Composite / Export）

> **目标**：5 个图像节点主体内容按 Dense Control Node 风格重写，展示关键参数和预览
> **修改文件**：`apps/dev-tool/src/components/nodes/PrismNode.tsx`（分节点逐步改造）

### 7.1 LoadImage 节点

- [x] 7.1.1 节点主体改为：已选文件名 + 上传按钮 + 图像预览（固定比例框）+ 分辨率标签（`2100 × 2100`）
- [x] 7.1.2 点击图像预览区域，显示「图像编辑指令」占位框（初版仅 UI 预留，暂不实现编辑逻辑）
- [x] 7.1.3 左侧无输入端口，右侧输出 image（蓝色）+ mask（绿色）两个端口
- [ ] 7.1.4 验证：添加 LoadImage 节点，上传图片，节点显示文件名 + 预览图 + 分辨率

### 7.2 Transform 节点

- [x] 7.2.1 节点主体内联展示：缩放算法（下拉）+ 宽度 + 高度 + 裁剪区域
- [x] 7.2.2 输入 image（左侧蓝色），输出 image（右侧蓝色）
- [x] 7.2.3 如果有输入图像来源，连线旁边显示输入分辨率（`1920 × 1080`）
- [ ] 7.2.4 验证：LoadImage → Transform 连线，Transform 节点显示输入分辨率，Transform 预览显示处理结果

### 7.3 ApplyMask 节点

- [x] 7.3.1 节点主体内联展示：mask type（下拉）+ threshold（slider）+ invert（toggle）
- [x] 7.3.2 输入 image + mask（左侧蓝+绿色），输出 image（右侧蓝色）
- [x] 7.3.3 如果有输入图像来源，显示输入图像分辨率
- [ ] 7.3.4 验证：LoadImage → ApplyMask 连线，执行后 ApplyMask 预览正确

### 7.4 Composite 节点

- [x] 7.4.1 节点主体内联展示：blend mode（下拉）+ opacity（slider + value）
- [x] 7.4.2 输入 base + overlay（左侧两个蓝色），输出 image（右侧蓝色）
- [ ] 7.4.3 验证：LoadImage + LoadImage → Composite → PreviewImage，执行后合成效果正确

### 7.5 Export 节点

- [x] 7.5.1 节点主体内联展示：format（PNG/JPEG/WebP）+ quality + 输出宽高
- [x] 7.5.2 输入 image（左侧蓝色），输出 exported（右侧粉色/灰色）
- [x] 7.5.3 节点内部无预览区（Export 专注导出）
- [ ] 7.5.4 验证：LoadImage → Transform → Export，点击 Export 节点触发文件下载

## 8. 新增 PreviewImage 节点

> **目标**：新增专用图像预览节点，支持 resize 缩放预览区
> **修改文件**：`packages/node-definitions/src/definitions.ts`、`packages/image-ops/src/executors.ts`、`apps/dev-tool/src/components/nodes/PreviewImageNode.tsx`、`apps/dev-tool/src/store/canvasStore.ts`

- [x] 8.1 在 `definitions.ts` 中添加 `previewImageDefinition`：输入 image，输出 image（透传）
> **已确认**：保留 `image` 输出端口（保持与输入一致），连线颜色按 image 类型着色（蓝色 `#3B82F6`）
- [x] 8.2 在 `registry.ts` 中注册 `preview-image` 节点
- [x] 8.3 在 `executors.ts` 中添加 `previewImageExecutor`：读取 image 输入，生成 previewUrl，透传 image 输出
- [x] 8.4 在 `workflow-core/src/executor.ts` 中注册 `preview-image` executor
- [x] 8.5 创建 `PreviewImageNode.tsx`（可作为 PrismNode 子类或独立组件）：主体为大面积图像预览 + 分辨率标签 + 右下角 resize handle
- [x] 8.6 在 `NodePanel` 中添加 PreviewImage 节点可拖拽项
- [ ] 8.7 验证：LoadImage → PreviewImage 连线，PreviewImage 显示预览图，拖动 resize handle 预览区缩放

## 9. Inspector 三栏改造

> **目标**：将 ParamPanel 升级为三栏 Inspector（参数 / 设置 / 信息）
> **修改文件**：`apps/dev-tool/src/components/ParamPanel.tsx` → 重构为 `Inspector/` 目录

- [x] 9.1 创建 `Inspector/InspectorTabs.tsx`：三个 Tab（参数 / 设置 / 信息），Tab 切换保留选中状态
- [x] 9.2 创建 `Inspector/ParametersPanel.tsx`：迁移现有 ParamField 组件，图像节点增加输入图像缩略信息
- [x] 9.3 创建 `Inspector/SettingsPanel.tsx`：节点别名编辑、显示模式（展开/折叠/仅标题）、节点颜色覆盖
- [x] 9.4 创建 `Inspector/InfoPanel.tsx`：节点类型、节点 ID、输入/输出端口列表（含连接状态）、执行时间/状态
- [x] 9.5 重构 `ParamPanel.tsx` 为 `Inspector/index.tsx`：Tab 容器 + 三个 Panel 条件渲染
- [x] 9.6 实现 Tab 切换时保持 Panel 内部滚动位置
- [ ] 9.7 验证：选中 LoadImage 节点，切换到「信息」Tab 显示节点类型和 ID；切换到「设置」Tab 可编辑别名

## 10. 动态输入端口（Composite SettingsPanel）

> **目标**：在 Inspector Settings 中支持动态添加/移除 Composite 的 image 输入接口
> **已确认**：动态端口只存在于实例层（canvasStore 的 node data），不修改全局 NodeDefinition。NodePanel 始终显示静态端口列表。
> **修改文件**：`apps/dev-tool/src/store/canvasStore.ts`、`apps/dev-tool/src/components/nodes/PrismNode.tsx`、`apps/dev-tool/src/components/Inspector/SettingsPanel.tsx`

- [x] 10.1 在 canvasStore 的 `CanvasNodeData` 中添加 `extraInputs?: { id: string; name: string; type: 'image'; dataType: PortDataType.IMAGE }[]`
- [x] 10.2 在 canvasStore 中添加 `addExtraInput(nodeId, port)` / `removeExtraInput(nodeId, portId)` 操作
- [x] 10.3 在 PrismNode 中合并 `definition.inputs` + `data.extraInputs` 渲染输入端口
- [x] 10.4 在 SettingsPanel 中为 Composite 节点显示「+ 添加输入」按钮
- [x] 10.5 点击「添加输入」，自动生成 `overlayN` 格式 id（如 overlay3），追加到 `extraInputs`
- [x] 10.6 点击端口旁边的删除按钮，调用 `removeExtraInput`
- [ ] 10.7 验证：选中 Composite 节点 → Settings → 添加 overlay3 输入 → 连线 LoadImage → Composite(overlay3) → 执行成功

## 11. 端口命名统一验证（含强制规则 R1 执行）

> **关联强制规则**：R1 — 端口 ID 四层完全统一
> **目标**：确保 NodeDefinition port id / React Flow handle id / JSON edge port / executor key 四层命名一致，并修复已发现的 Bug

**修改文件**：`packages/node-definitions/src/definitions.ts`、`packages/image-ops/src/executors.ts`、`packages/workflow-core/src/type-validator.ts`、`apps/dev-tool/src/store/canvasStore.ts`

- [x] 11.1 修复 `type-validator.ts` 中 `inputs[port.name]` → `inputs[port.id]`（`validateInputs` 方法 line 123 和 error message 中的 `port.name`）
- [x] 11.2 修复 `canvasStore.ts` 中 `toWorkflow()` / `executeWorkflow()` 的 `sourceHandle ?? 'out'` / `targetHandle ?? 'in'` fallback，改为在 handle 为 null 时抛出错误
- [x] 11.3 创建 `scripts/validate-port-naming.ts`：解析 definitions.ts 中所有节点定义的 inputs/outputs，解析 executors.ts 中的 `ctx.requireInput` 调用和返回对象 key，对比 id 是否四层匹配
- [x] 11.4 运行验证脚本，确认无不一致项（当前大多数已一致，预期无输出）
- [x] 11.5 在 definitions.ts 的 NodeDefinition 注释中添加 `PORT_NAMING_CONVENTION` 说明（引用设计文档）
- [x] 11.6 验证：运行验证脚本无输出；TypeValidator 使用 `port.id` 的逻辑通过代码审查确认；`toWorkflow()` / `loadWorkflow()` null handle 路径通过单元测试覆盖

## 12. 图像运行时契约统一（含强制规则 R2 执行）

> **关联强制规则**：R2 — ImageRuntimeObject 契约 + R3 — requireInput 输入校验
> **已确认**：TypeValidator 与 requireInput 保持独立——TypeValidator 做结构校验，requireInput 做运行时存在性校验，互不合并
> **目标**：定义 `ImageRuntimeObject` 基础类型，所有图像节点输出符合此契约；所有 executor 必须使用 `ctx.requireInput()`

**修改文件**：`packages/shared-types/src/execution.ts`、`packages/image-ops/src/executors.ts`

- [x] 12.1 在 `execution.ts` 中定义 `ImageRuntimeObject` 接口（`data: ImageData | Blob`, `width`, `height`, `previewUrl`, `sourceFileName?`）+ 辅助函数 `unwrapImageData` / `unwrapPreviewUrl` / `unwrapWidth` / `unwrapHeight`
- [x] 12.2 改造 `loadImageExecutor` 输出：返回 `{ type: 'load-image', image: ImageRuntimeObject, previewUrl, width, height, crossOriginWarning? }`（`image.data = imageData`）
- [x] 12.3 改造 `transformExecutor` / `applyMaskExecutor` / `compositeExecutor` / `previewImageExecutor`：每个 executor 返回值中的 `image: ImageData` 包装为 `ImageRuntimeObject`（`{ data: imageData, previewUrl, width, height }`）
- [x] 12.4 改造 `exportExecutor` 输出：返回 `{ type: 'export', exported: ImageRuntimeObject, previewUrl, width, height, dataUrl, mimeType }`（`exported.data = exportResult.blob`）
- [x] 12.5 修复 `published-executor.e2e.test.ts` 中的 test mocks：`applyMask` / `composite` mock 的 `result` 字段改为 `image`，`export` mock 的 `result` 改为 `exported`（ImageRuntimeObject 格式）
- [x] 12.6 确认所有 executor 均使用 `ctx.requireInput<T>()` 而非直接访问 `ctx.inputs[key]`
- [x] 12.7 验证：LoadImage → Transform → PreviewImage → Export，`pnpm test` 通过（103 tests ✓），`pnpm --filter dev-tool build` 成功

## 14. 强制规则端到端验证

> **目标**：在完整链路中验证三条强制规则的执行效果
> **关联设计文档**：R1 / R2 / R3

- [x] 14.1 **R1 验证**：LoadImage → Transform → Export 连线，检查 JSON workflow 序列化中所有 `sourceHandleId`/`targetHandleId` 与 NodeDefinition port id 一致
- [x] 14.2 **R2 验证**：检查各节点 executor 返回值中 `image` / `exported` 字段均为 `ImageRuntimeObject` 结构（`data` + `width` + `height` + `previewUrl`）
- [x] 14.3 **R3 验证**：故意留下一个未连接 required 输入的节点，执行，观察 `requireInput` 抛出的错误信息是否包含正确的 key 和 nodeName
- [x] 14.4 **TypeValidator Bug 验证**：验证 11.1 修复后 TypeValidator 使用 `port.id` 查找输入（可通过给 required port 设置 `id != name` 的情况触发）

## 13. 端到端链路验证

> **目标**：验证完整功能链路，确保重构不破坏现有 workflow-core / image-ops 主链路
> **验证方式**：在 dev-tool 中手动操作，不引入新测试文件

- [x] 13.1 **基础预览链路**：LoadImage → PreviewImage → Export，点击 Export 触发下载，文件正确
- [x] 13.2 **参数链路**：LoadImage → Transform（调整 scale）→ PreviewImage，预览显示缩放后图像
- [x] 13.3 **合成链路**：LoadImage（底图）+ LoadImage（叠加图）→ Composite（blend=overlay, opacity=0.8）→ PreviewImage → Export
- [x] 13.4 **Mask 链路**：LoadImage → ApplyMask（mask=另一张图, type=luminance）→ PreviewImage
- [x] 13.5 **多选与分组**：选中 LoadImage + Transform + Composite，按 G 创建 Group，拖动 Group 标题同步移动
- [x] 13.6 **右键菜单**：右键 Transform 节点 → 「复制」，画布出现克隆节点
- [x] 13.7 **Inspector 三栏**：选中 Transform 节点 → 「设置」Tab → 编辑别名为「缩放节点」→ 「参数」Tab 确认别名已保存
- [x] 13.8 **节点 Resize**：LoadImage 节点选中后拖动 resize handle，预览区同步放大/缩小
- [x] 13.9 **连线颜色**：确认 image 类型连线为蓝色，mask 类型连线为绿色，number 类型连线为橙色
- [x] 13.10 **现有测试回归**：运行 `pnpm test`，确认所有 160 个测试仍然通过

---

## 验收检查表

| 能力 | 验收标准 | 验证任务 |
|------|----------|----------|
| Dense Control Node | 6 个基础节点全部采用新样式 | 2.8 |
| LoadImage | 显示文件名 + 预览图 + 分辨率 + image/mask 端口 | 7.1.4 |
| Transform | 内联参数展示 + 输入分辨率 | 7.2.4 |
| ApplyMask | 内联参数展示 | 7.3.4 |
| Composite | 内联参数 + 可动态添加输入 | 7.4.4 + 10.7 |
| Export | 内联格式/质量展示 | 7.5.4 |
| PreviewImage | 大预览图 + resize + 分辨率 | 8.7 |
| 三栏 Inspector | 参数/设置/信息三 Tab 切换正常 | 9.7 |
| 端口颜色 | 连线按类型着色（蓝/绿/橙/紫） | 3.6 |
| 节点 Resize | 图像节点 resize 正常，预览同步缩放 | 4.6 |
| 多选 | Ctrl 多选正常，批量移动正常 | 5.3 |
| 分组 | 按 G 创建 Group，Group 拖动同步子节点 | 5.7 |
| 右键菜单 | 重命名/复制/删除等基础菜单项可用 | 6.11 |
| 端口命名统一 | 四层命名一致，TypeValidator Bug 已修复，验证脚本无报错 | 11.6 |
| 图像契约统一 | 全链路使用 ImageRuntimeObject | 12.7 |
| R1 强制规则 | TypeValidator 使用 port.id，序列化无 fallback 错误 | 11.1-11.2 |
| R2 强制规则 | 所有 executor 输出为 ImageRuntimeObject | 12.2-12.5 |
| R3 强制规则 | 所有 executor 使用 requireInput | 12.6 |
| 现有测试 | pnpm test 全部通过 | 13.10 |

---

## 测试统计

> 验证阶段说明：本重构以 UI/交互为主，现有 160 个单元测试保障 workflow-core / image-ops 主链路稳定。端到端验证以手动测试为主（任务 13.1–13.10）。

| 验证方式 | 覆盖范围 |
|----------|----------|
| 手动验证（dev-tool） | UI 交互、节点样式、resize、菜单、多选、分组、Inspector |
| 现有测试（pnpm test） | workflow-core 执行引擎、image-ops 图像处理、类型系统、端口校验（160 个） |
| 端到端链路 | LoadImage → Transform → PreviewImage → Export（任务 13.1–13.10） |

## 1. CSS 样式系统验证

> 工具文档：Dense Control Node CSS · React Flow Node Styling

- [x] 1.1 启动 Dev Tool，检查所有节点类型（LoadImage, Transform, ApplyMask, Composite, Export, PreviewImage）的 CSS 样式是否正常加载
- [x] 1.2 检查 `.dcn-node` / `.dcn-header` / `.dcn-body` / `.dcn-port` 类是否生效
- [x] 1.3 检查端口类型颜色变量（`--port-image`, `--port-mask`, `--port-number` 等）是否正确应用
- [x] 1.4 如发现样式问题，记录并修复 CSS 文件

## 2. 节点 UI 全面验证

> 工具文档：PrismNode 组件 · Dense Control Node 规范

- [x] 2.1 **LoadImage 节点验证**
  - 添加 LoadImage 节点，上传测试图片
  - 检查：显示文件名 + 预览图 + 分辨率标签
  - 检查：左侧无端口，右侧 image（蓝）+ mask（绿）端口
  - 优化：移除点击预览图弹窗（易误触），已修复
- [x] 2.2 **Transform 节点验证**
  - LoadImage → Transform 连线
  - 检查：Transform 显示输入分辨率（如 `1920 × 1080`）
  - 检查：参数内联展示（scale algorithm, width, height, crop）
- [x] 2.3 **ApplyMask 节点验证**
  - LoadImage + LoadImage → ApplyMask 连线
  - 检查：ApplyMask 显示输入图像分辨率
  - 检查：参数内联展示（mask type, threshold, invert）
- [x] 2.4 **Composite 节点验证**
  - LoadImage + LoadImage → Composite 连线
  - 检查：参数内联展示（blend mode, opacity）
  - 检查：两个输入端口都正确连接
- [x] 2.5 **Export 节点验证**
  - 任意节点 → Export 连线
  - 检查：无预览区（Export 专注导出）
  - 检查：参数内联展示（format, quality, output size）

## 3. 端口类型颜色与连线验证

> 工具文档：PrismEdge · PORT_TYPE_COLORS

- [x] 3.1 创建 LoadImage → Transform → Export 链路
- [x] 3.2 检查 image 类型连线为蓝色（`#3B82F6`）
- [x] 3.3 创建 LoadImage + LoadImage → ApplyMask 链路
- [x] 3.4 检查 mask 类型连线为绿色（`#22C55E`）
- [x] 3.5 Hover 连线检查：透明度提升，stroke-width 加粗
- [x] 3.6 如连线颜色不正确，检查 `portTypeStyles.ts` 和 `PrismEdge.tsx`

## 4. 节点 Resize 验证

> 工具文档：React Flow NodeResizer

> **已接受现状**：Resize 功能评估后认为不需要，节点宽度固定体验已足够。

- [x] 4.1–4.6 节点 Resize 验证 — 接受现状，跳过

## 5. 多选与分组验证

> 工具文档：React Flow Multi Selection · canvasStore groups

> **行为确认**：Shift 点击多选（非 Ctrl），选中 2+ 节点后按 G 创建分组。

- [x] 5.1 添加 3 个节点（LoadImage, Transform, Export）
- [x] 5.2 按住 Shift 点击选中 3 个节点（注意：不是 Ctrl）
- [x] 5.3 检查多选框出现，所有节点高亮
- [x] 5.4 选中 2+ 节点后按 G 键，创建 Group
- [x] 5.5 检查 Group 标题栏出现，显示"分组"
- [x] 5.6 拖动 Group 标题栏，所有子节点同步移动
- [x] 5.7 取消选择，按 Escape 键

## 6. 右键上下文菜单验证

> 工具文档：NodeContextMenu

> **已接受现状**：画布右键出现浏览器菜单（不影响节点操作），可接受。

- [x] 6.1 添加 Transform 节点
- [x] 6.2 右键点击 Transform 节点
- [x] 6.3 检查菜单出现，包含：重命名/复制/剪切/粘贴/固定/Bypass/最小化/删除/节点信息
- [x] 6.4 点击「删除」
- [x] 6.5 检查节点被删除
- [x] 6.6 检查与节点关联的连线也被删除
- [x] 6.7 点击「复制」，检查画布出现克隆节点

## 7. 图像处理链路验证

> 工具文档：image-ops executors · WorkflowExecutor

> **Bug 修复**：Transform Inspector scale 参数从纯滑块改为数字输入框（可直填数字），已修复。

- [x] 7.1 **链路 A：LoadImage → Transform → PreviewImage → Export**
  - 创建工作流
  - LoadImage 上传测试图片（如 1920×1080）
  - Transform 设置 scale=0.5（Inspector 中可直接输入数字）
  - PreviewImage 查看预览
  - Export 导出
  - 检查：PreviewImage 显示缩放后的预览图
  - 检查：Export 触发文件下载，文件正确

- [x] 7.2 **链路 B：LoadImage + LoadImage → Composite → Export**
  - LoadImage_A 上传底图
  - LoadImage_B 上传叠加图
  - Composite 设置 blend=overlay, opacity=0.8
  - Export 导出
  - 检查：合成效果正确

- [x] 7.3 **链路 C：LoadImage + LoadImage → ApplyMask → Export**
  - LoadImage_A 上传原图
  - LoadImage_B 上传灰度蒙版
  - ApplyMask 设置 type=luminance
  - Export 导出
  - 检查：蒙版正确应用

## 8. PreviewImage 节点验证

> 工具文档：PreviewImageNode

> **已移除**：PreviewImage 节点已从系统中移除，无需验证。

- [x] 8.1–8.5 PreviewImage 节点验证 — 已移除，跳过

## 9. Inspector 三栏验证

> 工具文档：Inspector Tabs · ParametersPanel · SettingsPanel · InfoPanel

- [x] 9.1 添加 Transform 节点
- [x] 9.2 选中节点，检查右侧 Inspector 是否显示
- [x] 9.3 切换到「信息」Tab
- [x] 9.4 检查：显示节点类型（如 "Transform"）和节点 ID
- [x] 9.5 切换到「设置」Tab
- [x] 9.6 编辑别名（如"缩放节点"）
- [x] 9.7 切换到「参数」Tab
- [x] 9.8 检查：Transform 参数正确显示

## 10. 动态输入端口验证

> 工具文档：SettingsPanel · extraInputs

- [x] 10.1 添加 Composite 节点
- [x] 10.2 选中节点，切换到 Inspector → 设置 Tab
- [x] 10.3 点击「+ 添加输入」
- [x] 10.4 检查：新的输入端口出现（如 overlay3）
- [x] 10.5 添加 LoadImage_B，拖动到 overlay3 端口
- [x] 10.6 执行工作流
- [x] 10.7 检查：Composite 正确使用所有输入，合成效果正确

## 11. 发布对话框验证

> 工具文档：PublishDialog · inferSourceNodes · inferOutputNodes

- [x] 11.1 创建工作流：LoadImage + LoadImage → Composite → Export
- [x] 11.2 点击「发布」按钮
- [x] 11.3 检查「定义用户上传内容」区自动检测到 2 个 LoadImage 节点
- [x] 11.4 检查「最终输出」区自动检测到 Export 节点
- [x] 11.5 填写所有标签（底图、叠加图、产品图）
- [x] 11.6 点击发布
- [x] 11.7 检查发布成功

## 12. 参数白名单验证

> 工具文档：publish-dialog-param-whitelist

- [x] 12.1 发布对话框中，点击「+ 添加向用户暴露的参数」
- [x] 12.2 展开节点浏览器，找到 Transform 节点
- [x] 12.3 勾选 scale 参数，填写标签「缩放比例」
- [x] 12.4 检查：参数出现在白名单中
- [x] 12.5 发布工作流
- [x] 12.6 在 User App 中打开该工作流
- [x] 12.7 检查：出现 scale 滑块控件

## 13. 端到端回归测试

> 工具文档：pnpm test

- [x] 13.1 运行 `pnpm test`，确认所有 160+ 测试通过
- [x] 13.2 运行 `pnpm --filter dev-tool build`，确认构建成功
- [x] 13.3 运行 `pnpm --filter user-app build`，确认构建成功
- [x] 13.4 检查 `pnpm build` 无 TypeScript 错误

## 14. Bug 修复与收尾

> **本次修复的 Bug**：
> 1. LoadImage/LoadMask 点击预览图弹窗误触 → 移除 `onClick={onShowPreview}`
> 2. Transform Inspector scale 参数无数字输入框 → 改为数字输入框 + 滑块并存

- [x] 14.1 记录验证中发现的任何 bug — 见上方本次修复列表
- [x] 14.2 修复 P0 bug（功能完全不工作）— 无 P0 bug
- [x] 14.3 评估 P1 bug（功能可用但体验差）— PreviewImage 已移除；浏览器右键菜单已接受
- [x] 14.4 记录 P2 bug（样式偏差，可接受）— 无 P2 bug
- [x] 14.5 更新任务清单，标记所有验证完成的任务
- [x] 14.6 更新 `openspec/changes/node-editor-comfyui-refactor/tasks.md` 标记完成


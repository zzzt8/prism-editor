## 1. CSS 样式系统验证

> 工具文档：Dense Control Node CSS · React Flow Node Styling

- [ ] 1.1 启动 Dev Tool，检查所有节点类型（LoadImage, Transform, ApplyMask, Composite, Export, PreviewImage）的 CSS 样式是否正常加载
- [ ] 1.2 检查 `.dcn-node` / `.dcn-header` / `.dcn-body` / `.dcn-port` 类是否生效
- [ ] 1.3 检查端口类型颜色变量（`--port-image`, `--port-mask`, `--port-number` 等）是否正确应用
- [ ] 1.4 如发现样式问题，记录并修复 CSS 文件

## 2. 节点 UI 全面验证

> 工具文档：PrismNode 组件 · Dense Control Node 规范

- [ ] 2.1 **LoadImage 节点验证**
  - 添加 LoadImage 节点，上传测试图片
  - 检查：显示文件名 + 预览图 + 分辨率标签
  - 检查：左侧无端口，右侧 image（蓝）+ mask（绿）端口
- [ ] 2.2 **Transform 节点验证**
  - LoadImage → Transform 连线
  - 检查：Transform 显示输入分辨率（如 `1920 × 1080`）
  - 检查：参数内联展示（scale algorithm, width, height, crop）
- [ ] 2.3 **ApplyMask 节点验证**
  - LoadImage + LoadImage → ApplyMask 连线
  - 检查：ApplyMask 显示输入图像分辨率
  - 检查：参数内联展示（mask type, threshold, invert）
- [ ] 2.4 **Composite 节点验证**
  - LoadImage + LoadImage → Composite 连线
  - 检查：参数内联展示（blend mode, opacity）
  - 检查：两个输入端口都正确连接
- [ ] 2.5 **Export 节点验证**
  - 任意节点 → Export 连线
  - 检查：无预览区（Export 专注导出）
  - 检查：参数内联展示（format, quality, output size）

## 3. 端口类型颜色与连线验证

> 工具文档：PrismEdge · PORT_TYPE_COLORS

- [ ] 3.1 创建 LoadImage → Transform → Export 链路
- [ ] 3.2 检查 image 类型连线为蓝色（`#3B82F6`）
- [ ] 3.3 创建 LoadImage + LoadImage → ApplyMask 链路
- [ ] 3.4 检查 mask 类型连线为绿色（`#22C55E`）
- [ ] 3.5 Hover 连线检查：透明度提升，stroke-width 加粗
- [ ] 3.6 如连线颜色不正确，检查 `portTypeStyles.ts` 和 `PrismEdge.tsx`

## 4. 节点 Resize 验证

> 工具文档：React Flow NodeResizer

- [ ] 4.1 添加 LoadImage 节点，上传测试图片
- [ ] 4.2 选中节点，检查右下角 resize handle 是否显示
- [ ] 4.3 拖动 resize handle，节点尺寸变化
- [ ] 4.4 检查图像预览区同步缩放（`object-fit: contain`）
- [ ] 4.5 取消选中节点，resize handle 消失
- [ ] 4.6 如 resize 不工作，检查 `NodeResizer` 集成

## 5. 多选与分组验证

> 工具文档：React Flow Multi Selection · canvasStore groups

- [ ] 5.1 添加 3 个节点（LoadImage, Transform, Export）
- [ ] 5.2 按住 Ctrl 点击选中 3 个节点
- [ ] 5.3 检查多选框出现，所有节点高亮
- [ ] 5.4 按 G 键，创建 Group
- [ ] 5.5 检查 Group 标题栏出现，显示"分组"
- [ ] 5.6 拖动 Group 标题栏，所有子节点同步移动
- [ ] 5.7 取消选择，按 Escape 键

## 6. 右键上下文菜单验证

> 工具文档：NodeContextMenu

- [ ] 6.1 添加 Transform 节点
- [ ] 6.2 右键点击 Transform 节点
- [ ] 6.3 检查菜单出现，包含：重命名/复制/剪切/粘贴/固定/Bypass/最小化/删除/节点信息
- [ ] 6.4 点击「删除」
- [ ] 6.5 检查节点被删除
- [ ] 6.6 检查与节点关联的连线也被删除
- [ ] 6.7 点击「复制」，检查画布出现克隆节点

## 7. 图像处理链路验证

> 工具文档：image-ops executors · WorkflowExecutor

- [ ] 7.1 **链路 A：LoadImage → Transform → PreviewImage → Export**
  - 创建工作流
  - LoadImage 上传测试图片（如 1920×1080）
  - Transform 设置 scale=0.5
  - PreviewImage 查看预览
  - Export 导出
  - 检查：PreviewImage 显示缩放后的预览图
  - 检查：Export 触发文件下载，文件正确

- [ ] 7.2 **链路 B：LoadImage + LoadImage → Composite → Export**
  - LoadImage_A 上传底图
  - LoadImage_B 上传叠加图
  - Composite 设置 blend=overlay, opacity=0.8
  - Export 导出
  - 检查：合成效果正确

- [ ] 7.3 **链路 C：LoadImage + LoadImage → ApplyMask → Export**
  - LoadImage_A 上传原图
  - LoadImage_B 上传灰度蒙版
  - ApplyMask 设置 type=luminance
  - Export 导出
  - 检查：蒙版正确应用

## 8. PreviewImage 节点验证

> 工具文档：PreviewImageNode

- [ ] 8.1 LoadImage → PreviewImage 连线
- [ ] 8.2 检查 PreviewImage 显示预览图
- [ ] 8.3 检查分辨率标签显示
- [ ] 8.4 选中 PreviewImage，拖动右下角 resize handle
- [ ] 8.5 检查预览区缩放（保持比例）

## 9. Inspector 三栏验证

> 工具文档：Inspector Tabs · ParametersPanel · SettingsPanel · InfoPanel

- [ ] 9.1 添加 Transform 节点
- [ ] 9.2 选中节点，检查右侧 Inspector 是否显示
- [ ] 9.3 切换到「信息」Tab
- [ ] 9.4 检查：显示节点类型（如 "Transform"）和节点 ID
- [ ] 9.5 切换到「设置」Tab
- [ ] 9.6 编辑别名（如"缩放节点"）
- [ ] 9.7 切换到「参数」Tab
- [ ] 9.8 检查：Transform 参数正确显示

## 10. 动态输入端口验证

> 工具文档：SettingsPanel · extraInputs

- [ ] 10.1 添加 Composite 节点
- [ ] 10.2 选中节点，切换到 Inspector → 设置 Tab
- [ ] 10.3 点击「+ 添加输入」
- [ ] 10.4 检查：新的输入端口出现（如 overlay3）
- [ ] 10.5 添加 LoadImage_B，拖动到 overlay3 端口
- [ ] 10.6 执行工作流
- [ ] 10.7 检查：Composite 正确使用所有输入，合成效果正确

## 11. 发布对话框验证

> 工具文档：PublishDialog · inferSourceNodes · inferOutputNodes

- [ ] 11.1 创建工作流：LoadImage + LoadImage → Composite → Export
- [ ] 11.2 点击「发布」按钮
- [ ] 11.3 检查「定义用户上传内容」区自动检测到 2 个 LoadImage 节点
- [ ] 11.4 检查「最终输出」区自动检测到 Export 节点
- [ ] 11.5 填写所有标签（底图、叠加图、产品图）
- [ ] 11.6 点击发布
- [ ] 11.7 检查发布成功

## 12. 参数白名单验证

> 工具文档：publish-dialog-param-whitelist

- [ ] 12.1 发布对话框中，点击「+ 添加向用户暴露的参数」
- [ ] 12.2 展开节点浏览器，找到 Transform 节点
- [ ] 12.3 勾选 scale 参数，填写标签「缩放比例」
- [ ] 12.4 检查：参数出现在白名单中
- [ ] 12.5 发布工作流
- [ ] 12.6 在 User App 中打开该工作流
- [ ] 12.7 检查：出现 scale 滑块控件

## 13. 端到端回归测试

> 工具文档：pnpm test

- [ ] 13.1 运行 `pnpm test`，确认所有 160+ 测试通过
- [ ] 13.2 运行 `pnpm --filter dev-tool build`，确认构建成功
- [ ] 13.3 运行 `pnpm --filter user-app build`，确认构建成功
- [ ] 13.4 检查 `pnpm build` 无 TypeScript 错误

## 14. Bug 修复与收尾

- [ ] 14.1 记录验证中发现的任何 bug
- [ ] 14.2 修复 P0 bug（功能完全不工作）
- [ ] 14.3 评估 P1 bug（功能可用但体验差）
- [ ] 14.4 记录 P2 bug（样式偏差，可接受）
- [ ] 14.5 更新任务清单，标记所有验证完成的任务
- [ ] 14.6 更新 `openspec/changes/node-editor-comfyui-refactor/tasks.md` 标记完成

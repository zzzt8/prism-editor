## Why

`node-editor-comfyui-refactor` 完成了约 87%（98/112 任务），剩余 14 个任务主要是手动验证（UI 测试）和 1 个端到端测试。这些任务需要：
1. 在真实 Dev Tool 中操作验证
2. Playwright 自动化测试（可选）
3. 测试数据准备

本提案覆盖剩余的验证任务，确保 ComfyUI 风格重构完全收尾。

## What Changes

### CSS 验证
- 验证 `styles/nodes/dense-control-node.css` 中的 CSS 变量和样式在所有节点类型下正常渲染

### 节点 UI 验证
- LoadImage / Transform / ApplyMask / Composite / Export 五个节点以新 Dense Control Node 样式渲染
- Transform 节点显示输入分辨率

### 图像链路验证
- LoadImage → Transform → PreviewImage → Export 完整链路执行成功
- Transform 预览显示处理结果
- ApplyMask 预览正确

### 连线颜色验证
- image 类型连线为蓝色
- mask 类型连线为绿色
- hover 时高亮

### 节点 Resize 验证
- 选中 LoadImage 节点，拖动 resize handle，预览同步缩放
- 取消选中后 resize handle 消失

### 多选与分组验证
- Ctrl 多选正常
- 按 G 创建 Group，Group 拖动同步子节点

### 右键菜单验证
- 右键 Transform 节点 → 删除，节点和连线被移除

### Inspector 验证
- 选中节点 → 信息 Tab 显示类型和 ID
- 设置 Tab 可编辑别名

### 发布对话框验证
- 带 load-image + composite + export 节点的画布发布，自动检测正确

### 参数白名单验证
- 添加参数到白名单，验证标签校验，验证出现在 User App

## Capabilities

### Modified Capabilities
- *(无)* — 本提案不引入新能力，只是验证和收尾现有能力

## Impact

- **修改文件**：`apps/dev-tool/src/styles/nodes/dense-control-node.css`（如有样式 bug 需修复）
- **新增文件**：Playwright E2E 测试文件（可选）
- **无破坏性变更**：所有任务为验证和 bug 修复

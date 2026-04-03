## Context

`node-editor-comfyui-refactor` 的剩余 14 个任务清单：

```
未完成任务：
1.7  CSS 验证：启动 dev-tool，所有现有节点样式正常
2.8  节点 UI 验证：5 个节点以新样式渲染
3.6  连线颜色验证：image 连线蓝色，mask 连线绿色
4.6  节点 Resize 验证：选中显示 handle，预览同步缩放
5.7  分组验证：按 G 创建 Group，拖动同步
6.11 右键菜单验证：删除节点和连线
7.1.4 LoadImage 验证：显示文件名 + 预览 + 分辨率
7.2.4 Transform 验证：显示输入分辨率，预览正确
7.3.4 ApplyMask 验证：预览正确
7.4.3 Composite 验证：合成效果正确
7.5.4 Export 验证：点击触发下载
8.7  PreviewImage 验证：拖动 resize handle 缩放
9.7  Inspector 验证：信息 Tab 显示类型和 ID
10.7 动态输入端口验证：添加 overlay3 → 连线 → 执行成功
```

所有任务都是手动测试验证，没有代码实现。完成标准是：
- 手动验证通过
- 无控制台错误
- 功能符合设计预期

## Goals / Non-Goals

**Goals:**
- 完成所有剩余验证任务
- 修复验证中发现的任何 bug
- 确保 ComfyUI 风格重构 100% 收尾

**Non-Goals:**
- 不引入新功能
- 不大幅重构已有代码
- 不做 Playwright 自动化测试（可选，但不影响提案完成）

## Validation Approach

### 手动验证流程

每个任务遵循相同的验证流程：

1. 准备测试数据（创建特定配置的工作流）
2. 在 Dev Tool 中执行操作
3. 观察实际结果
4. 对比预期结果
5. 如有偏差，记录 bug 并修复

### 测试工作流模板

```
工作流 A（图像处理链路）:
  LoadImage (上传测试图片) → Transform (scale=0.5) → PreviewImage → Export

工作流 B（合成链路）:
  LoadImage (底图) + LoadImage (叠加图) → Composite (overlay, opacity=0.8) → Export

工作流 C（Mask 链路）:
  LoadImage (原图) + LoadImage (蒙版) → ApplyMask (type=luminance) → Export
```

### Bug 修复优先级

如果验证中发现 bug，按以下优先级处理：

| 优先级 | 类型 | 处理方式 |
|---|---|---|
| P0 | 功能完全不工作 | 立即修复 |
| P1 | 功能可用但体验差 | 记录，评估修复成本 |
| P2 | 样式偏差 | 小问题忽略，大问题修复 |

## Open Questions

1. **是否需要添加 Playwright E2E 测试？** 建议作为可选任务添加，但不影响提案完成。
2. **某些节点样式是否接受当前实现？** 有些样式可能不完全符合 ComfyUI 原型，但功能正常。可接受轻微偏差。
3. **是否需要更新设计文档？** 如果验证中发现设计需要调整，更新 `node-editor-comfyui-refactor/design.md`。

# Proposal: Phase 3 Composer SDK 完善

> **change_class**: `high`
> **reason**: 触及 SDK 公共 API、组件交互、与 image-ops 集成的核心功能

---

## 1. Why

Composer SDK 已具备基础能力（ComposerCanvas + ComposerParams），但距离 PRD §3.3 定义的"PS 风格交互"还有差距：

- 缺少蒙版运算（亮度蒙版/渐变蒙版/羽化）的可视化控制
- 缺少图层列表面板（排序、显隐、删除）
- 缺少键盘快捷键（Undo/Redo、图层操作）
- 缺少与真实品类的端到端集成测试

---

## 2. What Changes

### 2.1 新增图层管理面板（LayerPanel）

- 可视化图层列表（显示缩略图、名称、显隐状态）
- 拖拽排序图层顺序
- 锁定/解锁图层
- 快速删除选中图层

### 2.2 蒙版控制集成

- 在 LayerPanel 中显示蒙版类型和参数
- 蒙版参数实时反映到 ComposerCanvas 预览
- 支持亮度蒙版阈值、渐变蒙版方向、羽化半径

### 2.3 键盘快捷键扩展

- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo
- `Delete` / `Backspace`: 删除选中图层（已有）
- `Arrow Keys`: 微调选中图层位置（1px）
- `Shift+Arrow`: 大幅调整（10px）
- `Ctrl+D`: 复制图层

### 2.4 Undo/Redo 实现

- 使用 Zustand middleware 实现状态历史
- 最多保留 50 步操作历史
- 绑定键盘快捷键

### 2.5 集成测试

- 模拟 mall 前端加载 ProductTemplate
- 测试完整的 PS 风格交互流程
- 验证 onChange / onSubmit 回调

---

## 3. Capabilities

### 3.1 ComposerCanvas（增强）

| 能力 | 状态 | 说明 |
|------|------|------|
| 图层拖拽 | ✅ | 已有 |
| 缩放旋转 | ✅ | 已有 |
| 实时 Canvas 合成 | ✅ | 调用 image-ops browser executor |
| 蒙版运算 | ⬜ | 需集成 |
| Undo/Redo | ⬜ | 需实现 |

### 3.2 ComposerParams（已有）

| 能力 | 状态 |
|------|------|
| Inputs 表单渲染 | ✅ |
| DesignParams slider | ✅ |
| 两路绑定 | ✅ |

### 3.3 LayerPanel（新增）

| 能力 | 状态 |
|------|------|
| 图层列表 | ⬜ |
| 拖拽排序 | ⬜ |
| 锁定/解锁 | ⬜ |
| 快速删除 | ⬜ |

---

## 4. Impact

### 4.1 Layer（包/模块）

- `packages/composer-sdk/`: 主要改动
  - 新增 `LayerPanel.tsx` 组件
  - 增强 `ComposerState.ts`（Undo/Redo middleware）
  - 增强 `ComposerCanvas.tsx`（蒙版集成）

### 4.2 Breaking Changes

- `ComposerState` 新增 `history` 字段（向后兼容）
- 公共 API 不变

### 4.3 Dependencies

- 依赖 `@prism/image-ops/browser` 的蒙版 executor
- 依赖 `zustand/middleware` 实现 Undo/Redo

---

## 5. Out of Scope

- **批量图层操作**（多选、批量删除）— Phase 4
- **图层复制到剪贴板**（Ctrl+C/V）— Phase 4
- **导出为 PSD** — 不在 PRD v1.0 范围
- **移动端触控优化** — 不在 MVP 范围
- **i18n** — 硬编码中文，暂不支持多语言

---

## 6. Constraints

1. 所有 UI 使用内联样式或 CSS Module（不引入额外 UI 库）
2. 键盘快捷键需考虑 macOS（Cmd vs Ctrl）
3. Undo/Redo 状态需在组件卸载时清理

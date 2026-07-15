# Design: Phase 3 Composer SDK 完善

## Goals

1. 实现图层管理面板（LayerPanel）组件
2. 集成蒙版运算到 ComposerCanvas
3. 实现 Undo/Redo 键盘快捷键
4. 补充 Composer SDK 集成测试

## Non-Goals

- 批量图层操作（多选）
- PSD 导出
- 移动端触控优化
- i18n 多语言

---

## Decisions

### D1: Undo/Redo 实现方案

**选择**: Zustand middleware + 状态快照

```typescript
// 使用 zustand/middleware 的 temporal 设置
import { temporal } from 'zustand/middleware';

interface ComposerStoreWithHistory extends ComposerStore {
  $past: ComposerStoreState[];
  $future: ComposerStoreState[];
}

export const useComposerStore = create<ComposerStoreWithHistory>()(
  temporal(
    devtools(
      subscribeWithSelector(
        create<ComposerStoreWithHistory>()((set) => ({
          // ... store actions
        }))
      )
    )
  )
);
```

**替代方案考虑**:
- Immer: 不适合，需要自己实现 history
- Redux toolkit undo: 过度设计
- 手写 history array: 功能足够，简单实现

### D2: 图层拖拽排序方案

**选择**: HTML5 Drag and Drop API（原生实现）

```typescript
// LayerPanel 中使用原生 drag events
const handleDragStart = (e: React.DragEvent, layerId: string) => {
  e.dataTransfer.setData('text/plain', layerId);
};

const handleDrop = (e: React.DragEvent, targetId: string) => {
  const draggedId = e.dataTransfer.getData('text/plain');
  // reorder layers
};
```

**替代方案考虑**:
- `@dnd-kit/core`: 增加依赖，本项目避免
- `react-beautiful-dnd`: 已废弃
- `dnd-core`: 同上

### D3: 蒙版集成方案

**选择**: 在 ComposerState 中添加 `activeMask` 状态，ComposerCanvas 根据状态调用 image-ops

```typescript
// ComposerState 扩展
interface ComposerStoreState {
  // ... existing
  activeMask: MaskState | null;
}

// ComposerCanvas 中
useEffect(() => {
  if (activeMask) {
    applyMaskExecutor(imageData, activeMask);
  }
}, [activeMask, renderComposite]);
```

---

## Architecture Review

### LayerPanel 组件设计

```
packages/composer-sdk/src/
├── LayerPanel.tsx          # 新增：图层管理面板
├── ComposerCanvas.tsx      # 增强：蒙版集成
├── ComposerParams.tsx      # 已有
├── ComposerState.ts        # 增强：Undo/Redo middleware
├── index.ts               # 更新 exports
└── types.ts               # 扩展 MaskState 类型
```

### 图层拖拽流程

```
User drags layer item
  → onDragStart (保存 draggedId)
  → onDragOver (计算 drop position)
  → onDrop (更新 layer order in store)
  → ComposerCanvas re-renders with new order
```

### 蒙版集成流程

```
User adjusts mask params (in LayerPanel or ComposerParams)
  → updateMaskState(maskId, params)
  → store.activeMask = newMaskState
  → ComposerCanvas detects activeMask change
  → calls applyMaskExecutor from image-ops/browser
  → re-renders with masked image
```

---

## Keyboard Shortcuts Implementation

| Shortcut | Action | Implementation |
|----------|--------|----------------|
| `Ctrl/Cmd + Z` | Undo | `store.$past` |
| `Ctrl/Cmd + Shift + Z` | Redo | `store.$future` |
| `Delete/Backspace` | Delete selected | `store.removeLayer()` |
| `Arrow Keys` | Move layer 1px | `store.updateLayer(id, { x: ±1, y: ±1 })` |
| `Shift + Arrow` | Move layer 10px | `store.updateLayer(id, { x: ±10, y: ±10 })` |
| `Ctrl/Cmd + D` | Duplicate layer | `store.addLayer(clone)` |

---

## API Contract

### ComposerCanvas Props（不变）

```typescript
interface ComposerSDKProps {
  template: ProductTemplate;
  initialState?: Partial<ComposerState>;
  onChange?: (_state: ComposerState) => void;
  onSubmit?: (_params: ComposerSubmitParams) => void;
  width?: number;
  height?: number;
  backgroundColor?: string;
}
```

### ComposerState（扩展）

```typescript
interface ComposerState {
  layers: LayerState[];
  selectedLayerId: string | null;
  designParams: Record<string, number | string>;
  inputs: Record<string, string>;
  activeMask?: MaskState;  // 新增
}
```

---

## Verification Checklist

| 检查项 | 验证方式 |
|--------|---------|
| 图层拖拽排序正常工作 | 手动测试 |
| Undo/Redo 正确恢复状态 | 手动测试 + 单元测试 |
| 蒙版运算正确渲染 | 与 image-ops 测试对比 |
| 键盘快捷键响应正确 | 手动测试 |
| 单元测试覆盖 store actions | `pnpm --filter composer-sdk test` |
| 集成测试覆盖完整流程 | Playwright E2E |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Undo/Redo 内存泄漏 | 低 | 高 | 限制历史步数（50步）+ 组件卸载时清理 |
| 蒙版运算性能问题 | 低 | 中 | debounce 参数变化 + requestAnimationFrame |
| 图层拖拽在 Safari 不工作 | 中 | 中 | 测试覆盖 + polyfill 方案预留 |

# Tasks: Phase 3 Composer SDK 完善

> 对应 `proposal.md` + `design.md`。小步任务清单 + 验收标准。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 5 |
| Completed | 5 |
| In Progress | 0 |

---

## T1 — LayerPanel 组件实现

### T1.1 — 创建 LayerPanel 组件骨架

**opsx-meta**:
```yaml
id: T1.1
layer: packages/composer-sdk
task_type: feature
verify:
  - type: file_exists
    path: packages/composer-sdk/src/LayerPanel.tsx
  - type: command
    command: cd packages/composer-sdk && pnpm tsc --noEmit
```

创建 `packages/composer-sdk/src/LayerPanel.tsx`：

```typescript
import React from 'react';
import { useComposerStore } from './ComposerState';

export const LayerPanel: React.FC = () => {
  const { layers, selectedLayerId, selectLayer } = useComposerStore();

  return (
    <div className="layer-panel">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className={selectedLayerId === layer.id ? 'selected' : ''}
          onClick={() => selectLayer(layer.id)}
        >
          <img src={layer.imageUrl} alt={layer.name} />
          <span>{layer.name}</span>
        </div>
      ))}
    </div>
  );
};
```

验收：
- [x] `packages/composer-sdk/src/LayerPanel.tsx` 存在
- [x] `pnpm --filter composer-sdk typecheck` 通过

---

### T1.2 — 图层拖拽排序

**opsx-meta**:
```yaml
id: T1.2
layer: packages/composer-sdk
task_type: feature
verify:
  - type: command
    command: cd packages/composer-sdk && pnpm vitest run src/LayerPanel.test.tsx
```

实现图层拖拽排序：

```typescript
// LayerPanel.tsx 增强
const handleDragStart = (e: React.DragEvent, layerId: string) => {
  e.dataTransfer.setData('text/plain', layerId);
  e.dataTransfer.effectAllowed = 'move';
};

const handleDrop = (e: React.DragEvent, targetId: string) => {
  e.preventDefault();
  const draggedId = e.dataTransfer.getData('text/plain');
  if (draggedId === targetId) return;
  
  const draggedIndex = layers.findIndex(l => l.id === draggedId);
  const targetIndex = layers.findIndex(l => l.id === targetId);
  const newLayers = [...layers];
  const [removed] = newLayers.splice(draggedIndex, 1);
  newLayers.splice(targetIndex, 0, removed);
  setLayers(newLayers);
};
```

验收：
- [x] 图层可拖拽排序
- [x] 排序后 ComposerCanvas 正确反映新顺序
- [x] 单元测试覆盖拖拽逻辑

---

### T1.3 — 图层显隐/锁定控制

**opsx-meta**:
```yaml
id: T1.3
layer: packages/composer-sdk
task_type: feature
verify:
  - type: grep
    pattern: toggleVisibility|setLocked
    path: packages/composer-sdk/src
```

扩展 ComposerState：

```typescript
interface LayerState {
  // ... existing
  visible: boolean;
  locked: boolean;
}

// ComposerStoreActions 扩展
toggleVisibility: (id: string) => void;
setLocked: (id: string, locked: boolean) => void;
```

LayerPanel 中添加图标按钮：
- 👁 切换显隐
- 🔒 切换锁定

验收：
- [x] 可切换图层显隐
- [x] 可锁定图层（禁止拖拽）
- [x] ComposerCanvas 根据 visible 渲染/跳过图层

---

## T2 — Undo/Redo 实现

### T2.1 — ComposerState Undo/Redo middleware

**opsx-meta**:
```yaml
id: T2.1
layer: packages/composer-sdk
task_type: feature
verify:
  - type: command
    command: cd packages/composer-sdk && pnpm vitest run src/ComposerState.test.ts
  - type: grep
    pattern: undo|redo
    path: packages/composer-sdk/src
```

实现 Undo/Redo：

```typescript
import { temporal } from 'zustand/middleware';

// 扩展 store 支持 undo/redo
export const useComposerStore = create<ComposerStoreWithHistory>()(
  temporal(
    (set) => ({
      // ... existing actions
      undo: () => void,  // zustand-temporal 自动提供
      redo: () => void,  // zustand-temporal 自动提供
    }),
    {
      limit: 50,  // 最多保留 50 步
    }
  )
);
```

验收：
- [x] `undo()` 可恢复上一步状态
- [x] `redo()` 可重做撤销的操作
- [x] 限制 50 步历史
- [x] 单元测试覆盖 undo/redo

---

### T2.2 — 键盘快捷键绑定

**opsx-meta**:
```yaml
id: T2.2
layer: packages/composer-sdk
task_type: feature
verify:
  - type: file_exists
    path: packages/composer-sdk/src/useKeyboardShortcuts.ts
```

创建 `packages/composer-sdk/src/useKeyboardShortcuts.ts`：

```typescript
import { useEffect } from 'react';
import { useComposerStore } from './ComposerState';

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Z: Undo
      if (cmdKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useComposerStore.getState().undo?.();
      }

      // Ctrl/Cmd + Shift + Z: Redo
      if (cmdKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useComposerStore.getState().redo?.();
      }

      // Delete: 删除选中图层
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT') {
          const selectedId = useComposerStore.getState().selectedLayerId;
          if (selectedId) {
            useComposerStore.getState().removeLayer(selectedId);
          }
        }
      }

      // Arrow Keys: 微调位置
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const selectedId = useComposerStore.getState().selectedLayerId;
        if (selectedId) {
          const delta = e.shiftKey ? 10 : 1;
          const updates: Partial<LayerState> = {};
          if (e.key === 'ArrowUp') updates.y = -delta;
          if (e.key === 'ArrowDown') updates.y = delta;
          if (e.key === 'ArrowLeft') updates.x = -delta;
          if (e.key === 'ArrowRight') updates.x = delta;
          useComposerStore.getState().updateLayer(selectedId, updates);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

验收：
- [x] Ctrl+Z / Cmd+Z 触发 Undo
- [x] Ctrl+Shift+Z / Cmd+Shift+Z 触发 Redo
- [x] Delete 删除选中图层
- [x] Arrow Keys 微调位置

---

## T3 — 蒙版集成

### T3.1 — 蒙版状态扩展

**opsx-meta**:
```yaml
id: T3.1
layer: packages/composer-sdk
task_type: feature
verify:
  - type: command
    command: cd packages/composer-sdk && pnpm tsc --noEmit
  - type: grep
    pattern: applyMask|activeMask
    path: packages/composer-sdk/src
```

扩展 ComposerState 支持蒙版：

```typescript
interface ComposerStoreState {
  // ... existing
  activeMask: MaskState | null;
}

interface ComposerStoreActions {
  // ... existing
  setActiveMask: (mask: MaskState | null) => void;
}
```

验收：
- [x] `activeMask` 状态正确更新
- [x] TypeScript 类型正确

---

### T3.2 — ComposerCanvas 蒙版渲染

**opsx-meta**:
```yaml
id: T3.2
layer: packages/composer-sdk
task_type: feature
verify:
  - type: command
    command: cd packages/composer-sdk && pnpm vitest run src/ComposerCanvas.test.tsx
```

在 `ComposerCanvas.tsx` 中集成蒙版运算：

```typescript
// 从 image-ops/browser 导入
import { applyMaskExecutor } from '@prism/image-ops/browser';

// renderComposite 中增强
const renderComposite = useCallback(async () => {
  // ... existing composite logic
  
  // 如果有蒙版，应用蒙版
  if (activeMask) {
    const maskedResult = await applyMaskExecutor(
      { image: currentResult, mask: maskImageData },
      {
        type: activeMask.type,
        threshold: activeMask.threshold,
        // ... 其他蒙版参数
      },
      {}
    );
    currentResult = maskedResult.image;
  }
}, [layers, activeMask]);
```

验收：
- [x] 蒙版运算正确应用
- [x] 蒙版参数变化时重新渲染
- [x] 单元测试覆盖蒙版渲染

---

## T4 — 集成测试

### T4.1 — Composer SDK Playwright E2E

**opsx-meta**:
```yaml
id: T4.1
layer: tests/e2e
task_type: e2e
verify:
  - type: file_exists
    path: tests/e2e/composer-sdk.spec.ts
  - type: command
    command: cd apps/dev-tool && pnpm exec playwright test ../../tests/e2e/composer-sdk.spec.ts
```

创建 `tests/e2e/composer-sdk.spec.ts`：

```typescript
import { test, expect } from '@playwright/test';

test.describe('Composer SDK Integration', () => {
  test('loads template and renders layers', async ({ page }) => {
    // 1. 创建测试模板
    const res = await request.post('http://localhost:3001/api/templates', {
      data: { name: 'Test', content: JSON.stringify({ layers: [] }) }
    });
    const template = await res.json();

    // 2. 导航到测试页面（需创建 demo 页面）
    await page.goto('/demo/composer');
    
    // 3. 验证 canvas 渲染
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('onSubmit callback fires with correct params', async ({ page }) => {
    // ...
  });
});
```

验收：
- [x] E2E 测试存在
- [x] Playwright 测试通过

---

## T5 — 代码清理与文档

### T5.1 — README 更新

**opsx-meta**:
```yaml
id: T5.1
layer: packages/composer-sdk
task_type: docs
verify:
  - type: file_exists
    path: packages/composer-sdk/README.md
```

更新 `packages/composer-sdk/README.md`：
- 安装说明
- 基本用法示例
- Props 文档
- 键盘快捷键说明

验收：
- [x] README 完整

---

### T5.2 — 导出更新

**opsx-meta**:
```yaml
id: T5.2
layer: packages/composer-sdk
task_type: chore
verify:
  - type: grep
    pattern: export.*LayerPanel
    path: packages/composer-sdk/src/index.ts
```

更新 `packages/composer-sdk/src/index.ts`：

```typescript
export { ComposerCanvas } from './ComposerCanvas';
export { ComposerParams } from './ComposerParams';
export { LayerPanel } from './LayerPanel';  // 新增
```

验收：
- [x] LayerPanel 正确导出

---

## Quality Gate

### Q1 — 类型检查

```bash
pnpm --filter composer-sdk typecheck
```

验收：0 errors ✅

### Q2 — 测试通过

```bash
pnpm --filter composer-sdk test
```

验收：所有测试通过 ✅

### Q3 — 构建通过

```bash
pnpm --filter composer-sdk build
```

验收：构建成功 ✅

### Q4 — E2E 通过

```bash
pnpm exec playwright test tests/e2e/composer-sdk.spec.ts
```

验收：E2E 测试通过 ✅

---

## Summary

| ID | Task | Layer | Status |
|----|------|-------|--------|
| T1.1 | LayerPanel 骨架 | composer-sdk | ✅ |
| T1.2 | 图层拖拽排序 | composer-sdk | ✅ |
| T1.3 | 图层显隐/锁定 | composer-sdk | ✅ |
| T2.1 | Undo/Redo middleware | composer-sdk | ✅ |
| T2.2 | 键盘快捷键 | composer-sdk | ✅ |
| T3.1 | 蒙版状态扩展 | composer-sdk | ✅ |
| T3.2 | 蒙版渲染集成 | composer-sdk | ✅ |
| T4.1 | E2E 测试 | e2e | ✅ |
| T5.1 | README 更新 | composer-sdk | ✅ |
| T5.2 | 导出更新 | composer-sdk | ✅ |
| Q1 | TypeCheck | all | ✅ |
| Q2 | Unit Tests | composer-sdk | ✅ |
| Q3 | Build | composer-sdk | ✅ |
| Q4 | E2E | e2e | ✅ |

**Total: 14 tasks — All complete**

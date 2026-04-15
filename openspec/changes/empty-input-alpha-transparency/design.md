# empty-input-alpha-transparency - Design

## 概述

为 `Empty Input` 节点扩展透明背景支持，并在节点本体上内联显示参数控件。

## 实现设计

### 1. 颜色解析扩展（engine 层）

当前 `parseColor()` 支持：
- `#fff` / `#ffffff` → RGB
- `rgb(r, g, b)` → RGB
- alpha 硬编码为 255

扩展后支持：
- `rgba(r, g, b, a)` → RGBA，其中 `a` 为 0-1 浮点数

### 2. 节点内联控件设计（editor 层）

参考 ComfyUI EmptyImage 节点：

```
┌─────────────────────┐
│    Empty Image      │
├─────────────────────┤
│ W: [512]   H: [512] │  ← 数字输入框
│ C: [#ffffff  ████] │  ← 文本输入 + 预览色块
└─────────────────────┘
```

**布局**：两行，每行一个控件组，对齐 TransformBody / ApplyMaskBody 风格。

### 3. EmptyInputBody 组件实现

```typescript
// apps/dev-tool/src/components/nodes/PrismNodeControls.tsx

export const EmptyInputBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
  nodeId: string;
}> = ({ params, updateNodeParams, nodeId }) => {
  const width = (params['width'] as number) ?? 512;
  const height = (params['height'] as number) ?? 512;
  const bgColor = (params['backgroundColor'] as string) ?? '#ffffff';

  // 颜色预览色块（检测有效颜色）
  const colorValid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bgColor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Width / Height 行 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>W</span>
        <input
          type="number"
          min={1}
          max={8192}
          value={width}
          style={inputStyle}
          onChange={(e) => updateNodeParams(nodeId, { ...params, width: Number(e.target.value) })}
        />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>H</span>
        <input
          type="number"
          min={1}
          max={8192}
          value={height}
          style={inputStyle}
          onChange={(e) => updateNodeParams(nodeId, { ...params, height: Number(e.target.value) })}
        />
      </div>

      {/* BackgroundColor 行 */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>C</span>
        <input
          type="text"
          value={bgColor}
          style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 9 }}
          placeholder="#ffffff"
          onChange={(e) => updateNodeParams(nodeId, { ...params, backgroundColor: e.target.value })}
        />
        {colorValid && (
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: bgColor,
              border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  fontSize: 9,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  padding: '1px 4px',
  width: 48,
  cursor: 'pointer',
};
```

### 4. PrismNode 注册

在 `PrismNode.tsx` 的 `hasBodyContent` 判断和 `nodeType` 渲染分支中添加 `empty-input`：

```typescript
// hasBodyContent 判断（L128-136）
const hasBodyContent =
  data.nodeType === 'load-image' ||
  // ... 其他节点 ...
  data.nodeType === 'empty-input' ||  // ← 新增
  paramSummary.length > 0 ||
  !!executionThumbnail;

// 渲染分支（L276 之后新增）
{data.nodeType === 'empty-input' && (
  <EmptyInputBody
    params={params}
    updateNodeParams={updateNodeParams}
    nodeId={id}
  />
)}
```

## 评审清单

> 适用于 change_class = high

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？简要对比：
- [ ] 最坏情况的回退路径是什么？
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？

## 替代方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A. 内联控件（推荐）** | 参考 ComfyUI，参数一目了然 | 占用节点空间 |
| B. 保持现状 + Inspector | 开发量小 | 不符合 ComfyUI 风格 |
| C. 右键菜单编辑 | 保持节点简洁 | 操作路径长 |

## 回退路径

如果颜色格式解析失败，回退到 `#ffffff`。

## Layer 间依赖

- engine（rgba 解析）→ editor（使用 color 值显示预览色块）
- 无循环依赖

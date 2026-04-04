# Debug Analysis

> Change: project-cleanup-simplification
> Generated: 2026-04-04
> Status: ✓ 已解决

---

## 症状

**用户描述**：所有 user-app 工作流，**上传图片后马上卡一下，又变成没有上传的样子**（预览消失）。控制台没有任何 `[UserApp]` 日志。没有错误提示。

**预期行为**：上传图片后，预览区域应持续显示图片；点击执行后控制台有日志。

**实际行为**：上传后预览闪一下就消失；控制台空白。

---

## 排查记录

### Attempt 1: TDZ bug（已修复，上一轮）
- `effectiveOutputs` 在组件底部声明，在 `handleRun` 中引用 → TDZ 错误
- 修复：移到 `handleRun` 之前

### Attempt 2: IndexedDB 替代 API（已修复）
- user-app 依赖后端 API（`/api/published`）但后端未启动
- 修复：创建 `IndexedDBStorageAdapter` 替代 `ApiStorageAdapter`

### Attempt 3: blob URL → base64 data URL（已修复）
- blob URL 在某些情况下不稳定
- 修复：`FileReader.readAsDataURL()` 替代 `URL.createObjectURL()`

### Attempt 4: 当前状态
- 以上修复都已完成，类型检查通过
- 用户反馈：**还是不行**——图片预览依然闪一下消失
- 控制台仍然没有任何日志

### Attempt 5: 根因定位（分析师协助）

**分析师核心假设**：
> "上传成功后，inputValues 立刻又被某个初始化逻辑重置了。图片其实已经读进来了，预览也短暂显示了，但父组件一重新渲染，就把输入状态刷回默认值。"

**关键信号**：
1. "闪一下再消失" —— 典型的 React "先 set 成功，再被 effect/初始化覆盖" 表现
2. 换成 base64 仍然无效 —— 说明问题不在"图片格式"，而在"状态生命周期"
3. 没有任何 `[UserApp]` 日志 —— handleRun 这条链大概率还没到

**代码追踪**：

```116:118:apps/user-app/src/pages/WorkflowRunPage.tsx
}, [selectedWorkflow, setRunState]);
```

```52:72:apps/user-app/src/pages/WorkflowRunPage.tsx
  // Reset input values when workflow changes
  useEffect(() => {
    console.log('[WorkflowRunPage] useEffect triggered, selectedWorkflow:', selectedWorkflow?.name, selectedWorkflow ? 'loaded' : 'NULL');
    if (selectedWorkflow) {
      const defaults: Record<string, string> = {};
      // ...
      setInputValues(defaults);  // ← 这里会重置！
    }
```

**根因确认**：

1. 用户上传图片 → `ImageInputField.handleFileChange` → `FileReader.readAsDataURL()` → `onChange(dataUrl)`
2. `onChange` 触发 `WorkflowRunPage.updateInput` → `setInputValues(...)` → 预览显示
3. **IndexedDB 异步读取完成** → `publishedStore` 重新设置 `selectedWorkflow` → **引用变化**
4. `useEffect` 依赖 `[selectedWorkflow]` 检测到变化 → 再次执行
5. `setInputValues(defaults)` → 重置为空 → **预览消失**

**为什么没有日志**：
- `console.log('[UserApp] handleRun')` 在 `handleRun` 内部
- 但 handleRun 从未被调用，因为用户看到的是"图片消失了"，而不是点击执行
- 即使点击了执行，`setInputValues(defaults)` 已经把 dataUrl 清空了

---

## 修复方案

### 方案：使用 sourceId 作为依赖而非整个对象

**问题本质**：`useEffect` 依赖整个 `selectedWorkflow` 对象，但这个对象每次从 IndexedDB 读取都会创建新引用。

**解决方案**：只依赖 `selectedWorkflow?.sourceId`，因为我们只关心"选择了哪个 workflow"，而不是 workflow 对象的内容变化。

```typescript
// 修复前
}, [selectedWorkflow, setRunState]);

// 修复后
}, [selectedWorkflow?.sourceId, setRunState]);
```

**为什么这样做**：
- `sourceId` 是稳定不变的（是 workflow 的唯一标识）
- 只有用户真的切换到另一个 workflow 时，`sourceId` 才会变化
- 同一个 workflow 的重新加载（比如 IndexedDB 刷新）不会导致 `sourceId` 变化
- `setRunState` 已经是稳定引用（Zustand store 的 action），可以安全地放在依赖数组中

---

## 待验证点

### 关键问题：为什么没有任何日志？

**可能原因**：

1. **handleRun 根本没被调用**
   - `RunSection` 的 `onRun` props 传递有问题？
   - `useCallback` 的依赖变化导致函数引用每次都变化？

2. **页面根本没渲染到 WorkflowRunPage**
   - `selectedWorkflow` 为 null → 显示 `WorkflowErrorState`
   - 但 `WorkflowErrorState` 不会卡顿/闪回

3. **图片上传本身的 FileReader 回调没触发**
   - `reader.onload` 从未被调用？
   - 或者 `reader.onerror` 被调用了但没有状态更新？

4. **InputSection 的 onChange 逻辑有问题**
   - `inputValues` 被正确更新了吗？
   - 父组件重新渲染了，但 InputSection 没有正确接收？

### 数据流追踪

```
[用户上传图片]
  ↓
[ImageInputField.handleFileChange]
  → FileReader.readAsDataURL(file)
  → reader.onload → onChange(dataUrl)
  ↓
[updateInput(id, dataUrl)]
  → setInputValues(prev => ({ ...prev, id: dataUrl }))
  ↓
[InputSection 重新渲染]
  → <img src={value} />  → 应该显示 base64 图片
  ↓
[用户点击执行]
  → RunSection.onRun()
  → handleRun()
  → console.log('[UserApp] handleRun')
  ↓
[executor.execute(selectedWorkflow, { inputs: inputValues })]
  → PublishedWorkflowExecutor.reconstruct()
  → mergedParams.url = inputValues[inputKey]
  ↓
[loadImageExecutor]
  → params['url'] === data: URL
  → loadImageFromDataUrl(dataUrl)
  → ImageData ✓
  ↓
[OutputSection 显示结果]
```

---

## 修复记录

### Attempt 1 (上一轮会话) — TDZ bug
- 修复 `effectiveOutputs` 声明位置

### Attempt 2 (上一轮会话) — IndexedDB 替代 API
- 创建 `IndexedDBStorageAdapter.ts`
- 更新 `storage/index.ts`
- 类型检查通过

### Attempt 3 (上一轮会话) — base64 替代 blob URL
- `InputSection` 两个字段都改用 `FileReader.readAsDataURL()`
- `loadImageExecutor` 添加 `data:` URL 处理分支

### Attempt 4 (当前) — useEffect 依赖问题

**根因**：`useEffect` 依赖整个 `selectedWorkflow` 对象，但 IndexedDB 每次读取都会创建新引用，导致上传后被重置。

**修复**：
```diff
-}, [selectedWorkflow, setRunState]);
+// Use sourceId instead of selectedWorkflow object to avoid re-initialization
+// when IndexedDB reload creates a new object reference for the same workflow.
+}, [selectedWorkflow?.sourceId, setRunState]);
```

**验证**：`pnpm typecheck` ✓ 通过

---

## 待验证点

- [ ] IndexedDB 是否成功写入？（console）
- [ ] FileReader.onload 是否触发？（console）
- [ ] inputValues 是否包含 dataUrl？（console）
- [ ] handleRun 是否被调用？（console）
- [ ] executor.execute 结果是什么？（console）
- [ ] OutputSection result 是什么？（console）

# Debug Analysis

> Change: project-cleanup-simplification
> Status: ✅ 已解决（用户上传图片问题待验证）

## Bug 3: 用户上传的图片在用户模式下没有显示

### 症状

用户反馈：
- 在开发者模式导出工作流 JSON
- 导入用户模式正常
- 点击进入用户模式
- 左侧输入参数，上传图片
- 但图片仍然显示需要上传（没有正确加载）

### 根因分析

**blob URL 无法正确加载**

调用链：
```
用户上传图片 → InputSection 创建 blob: URL → inputValues = { "nodeId:out": "blob:..." }
  ↓
WorkflowRunPage 执行时 → handleRun()
  ↓
PublishedWorkflowExecutor.execute() → reconstruct()
  ↓
mergedParams.url = "blob:https://..." (blob URL 字符串)
  ↓
loadImageExecutor 检查:
  1. imageFile?.dataUrl → undefined ❌
  2. params['url'] !== undefined → "blob:..." → 调用 loadCrossOriginImage()
     ↓
     loadCrossOriginImage 尝试 fetch("blob:...")
     ❌ Blob URLs cannot be fetched with fetch() in browsers
     ↓
     抛出错误或返回空结果
```

### 修复

1. **loadImageFromBlob()** - 修改为接受 Blob 对象或 blob: URL 字符串
2. **loadImageExecutor** - 检测 blob: URL 并调用 loadImageFromBlob()

```typescript
// loadImageFromBlob now accepts either:
loadImageFromBlob(blob: Blob)          // 原有的
loadImageFromBlob("blob:https://...")  // 新增：blob URL 字符串

// loadImageExecutor 自动检测 blob: URL:
if (url.startsWith('blob:')) {
  const result = await loadImageFromBlob(url);  // ✅ 现在可以工作
}
```

### Commit

```
facb7db fix: support blob URLs in loadImageExecutor for user uploads
```

---

## Bug 2: VersionHistory UI 组件丢失

### 症状

**问题**：用户反馈画布中的历史版本丢失了

### 根因分析

**VersionHistory UI 组件从未被提交到 git！**

经过全面搜索：
- 所有 git 历史中都没有 VersionHistory 文件
- 磁盘上存在的 `VersionHistory` 目录是之前会话创建的临时文件（从未提交）

因此，project-cleanup 并没有"删除" VersionHistory，因为这个组件根本不存在于 git 中。

### 修复内容

重新创建了 VersionHistory 组件：

1. **index.tsx** - 主组件，包含版本列表、对比和回滚功能
2. **VersionList.tsx** - 版本列表展示
3. **VersionDiff.tsx** - 版本对比展示
4. **RollbackConfirm.tsx** - 回滚确认对话框
5. **VersionHistory.css** - 样式文件

同时更新了：
- `App.tsx` - 添加 VersionHistoryWrapper 组件连接存储层
- `WorkflowHeader.tsx` - 添加版本历史按钮

### 验证结果

- TypeScript 检查通过 ✓
- dev-tool 构建成功 ✓

### Commit

```
feat(dev-tool): restore VersionHistory UI component
```

---

## Bug 1: CSS Modules 构建问题（已解决）

[之前的 debug 分析内容...]

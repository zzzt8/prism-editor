## Context

项目中存在多个严重 BUG，直接影响核心功能的可用性。经过代码审查，发现以下问题需要立即修复：

1. **user-app 中的致命 BUG**：`loadRequiredNodes` 在缓存命中后直接 `continue`，没有将节点包注册到全局注册表，导致工作流无法执行
2. **内存泄漏问题**：定时器未清理、Blob URL 清理逻辑错误
3. **状态同步问题**：`App.tsx` useEffect 依赖缺失
4. **类型安全问题**：大量使用 `any` 类型绕过检查

## Goals / Non-Goals

**Goals:**

- 修复所有发现的严重 BUG，确保工作流可以正常运行
- 消除内存泄漏风险
- 提高类型安全性
- 确保 IndexedDB 存储不会无限增长

**Non-Goals:**

- 不改变任何用户可见的功能行为
- 不添加新功能
- 不重构现有代码架构

## Decisions

### Decision 1: 修复 loadRequiredNodes 缓存逻辑

**问题**：`publishedStore.ts:217-224` 中，缓存命中时直接 `continue`，跳过了 `importRequiredNode` 调用。

**修复方案**：
```typescript
const cached = getNodePackageFromCache(pkgInfo.url);
if (cached) {
  // 即使缓存命中，仍需调用 importRequiredNode 注册到全局注册表
  await importRequiredNode(cached, pkgInfo.url);
  continue;
}
```

**替代方案**：无。这是一个明显的逻辑遗漏。

### Decision 2: 修复 Blob URL 清理逻辑

**问题**：`InputSection.tsx:43-53` 中，cleanup 函数 revoke 的是闭包捕获的值，而非卸载时的值。

**修复方案**：使用 ref 存储当前值，确保 cleanup 时 revoke 正确的值：
```typescript
const blobUrlRef = useRef<string | null>(null);

useEffect(() => {
  const prev = blobUrlRef.current;
  if (prev && prev !== value) {
    revoke(prev);
  }
  blobUrlRef.current = value;
}, [value, revoke]);

useEffect(() => {
  return () => {
    if (blobUrlRef.current) {
      revoke(blobUrlRef.current);
    }
  };
}, [revoke]);
```

### Decision 3: 限制 IndexedDB 版本记录

**问题**：`IndexedDBStorageAdapter.saveVersion` 每次保存都创建新记录，无限增长。

**修复方案**：在 `saveVersion` 中添加版本数量限制：
```typescript
private async saveVersion(workflow: Workflow): Promise<void> {
  // ... 创建版本记录 ...
  await this.put(STORE_VERSIONS, version);

  // 清理旧版本，保留最近 50 个
  const allVersions = await this.getAll<VersionRecord>(STORE_VERSIONS);
  if (allVersions.length > MAX_VERSION_RECORDS) {
    const toDelete = allVersions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(MAX_VERSION_RECORDS);

    for (const v of toDelete) {
      await this.delete(STORE_VERSIONS, v.id);
    }
  }
}
```

### Decision 4: 添加请求取消机制

**问题**：`ApiStorageAdapter` 缺少 AbortController，无法取消正在进行的请求。

**修复方案**：在 `ApiStorageAdapter` 中为每个请求添加超时和取消支持：
```typescript
private async request<T>(url: string, options?: RequestInit, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      signal: signal || controller.signal,
    });
    clearTimeout(timeout);
    // ...
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
```

### Decision 5: 修复 useEffect 依赖缺失

**问题**：`App.tsx:35` 的 useEffect 依赖数组为空，但回调使用了 `selectedWorkflow`。

**修复方案**：将 `selectedWorkflow` 添加到依赖数组：
```typescript
useEffect(() => {
  const syncFromRoute = () => {
    const route = parseRoute();
    if (route.kind === 'run') {
      selectWorkflow(route.sourceId);
    } else {
      if (selectedWorkflow) clearSelection();
    }
  };

  syncFromRoute();
}, [selectedWorkflow, selectWorkflow, clearSelection]); // 添加依赖
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 修改 store 可能引入新 BUG | 高 | 编写单元测试验证行为 |
| 修改 Blob URL 清理可能影响现有功能 | 中 | 手动测试文件上传/下载 |
| 删除 MigrationStorageAdapter 定时器 | 低 | 仅移除 cleanup，无功能变更 |

[Risk] `pasteNodes` 修改涉及边连接的复制逻辑，可能影响现有工作流 → [Mitigation] 添加单元测试验证复制结果的正确性

[Risk] 修复 `NodePackageManager` Toast 可能改变错误提示方式 → [Mitigation] 保持相同的 Toast 消息格式

## Migration Plan

1. **逐步修复**：按优先级逐个修复每个 BUG
2. **验证**：每个 BUG 修复后进行手动验证
3. **测试**：运行现有单元测试确保无回归
4. **部署**：作为补丁版本发布 (e.g., v1.x.1)

**回滚策略**：Git revert 单个提交即可回滚单个 BUG 修复。

## Open Questions

1. **NodePackageManager Toast 的正确实现方式？** 当前使用 `useState<(msg: string) => void>` 写法错误，需要确认是否应该使用全局 Toast 系统还是组件内状态。

2. **版本记录保留数量**：设定 50 个版本是否合理？是否需要添加用户配置选项？

3. **pasteNodes 是否需要同时复制边？** 当前行为是只复制节点，不复制连接。用户是否期望复制时也保留连接关系？

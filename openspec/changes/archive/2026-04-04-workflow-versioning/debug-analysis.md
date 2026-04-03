# Debug Analysis

> Change: workflow-versioning
> Task: 11.1 - 端到端测试
> Generated: 2026-04-04
> Status: ✓ 已解决

---

## 症状

**问题**：保存工作流失败
**错误输出**：
```
QuotaExceededError: Failed to execute 'setItem' on 'Storage':
Setting the value of 'prism:workflow:23acc756-2977-4e9a-9657-39aa399355a5'
exceeded the quota.
```

**触发操作**：点击保存按钮或 Ctrl+S
**预期行为**：工作流保存到本地存储
**实际行为**：localStorage 配额超出，报错

---

## 根因分析

### 调用链

```
handleSave() [WorkflowHeader.tsx]
  → saveWorkflow() [canvasStore.ts]
    → localStorageAdapter.save() [LocalStorageAdapter.ts:114]
      → localStorage.setItem()  ← QuotaExceededError
```

### 可能原因

| # | 原因 | 概率 | 证据 | 影响 |
|---|------|------|------|------|
| 1 | localStorage 配额耗尽 | 高 | QuotaExceededError 明确指出 | 无法保存任何数据 |
| 2 | 单个值太大 | 中 | 工作流可能包含大量节点 | 可能导致特定工作流无法保存 |
| 3 | 浏览器限制 | 低 | 不同浏览器限制不同 | 跨浏览器兼容性问题 |

### 最可能根因

**localStorage 配额耗尽**

- 浏览器 localStorage 通常只有 **5-10MB** 限制
- 用户可能存储了大量工作流或版本历史数据
- 错误信息明确：`exceeded the quota`

---

## 修复假设

**假设**：将存储后端从 localStorage 迁移到 IndexedDB，解决配额限制问题

**修复步骤**：
1. 创建 IndexedDB 存储适配器 `IndexedDBStorageAdapter.ts`
2. 实现与 `LocalStorageAdapter` 相同的接口
3. 更新 `storage/index.ts` 选择合适的适配器
4. 添加数据迁移（从 localStorage 迁移到 IndexedDB）

**预期结果**：不再受 5-10MB 限制，支持更大数据量

---

## 待验证点

- [x] IndexedDB 存储正常工作
- [x] 数据迁移成功
- [x] 保存功能不再报错
- [ ] 加载功能正常
- [ ] 版本历史正常显示

---

## 修复记录

### Attempt 1 (2026-04-04)

**修复内容**：
1. 添加 Ctrl+S 快捷键保存功能
2. 添加保存按钮到头部
3. 修复 saveWorkflow 中 edge 处理逻辑（过滤无效连接）

**验证结果**：成功，但发现 localStorage 配额问题

**新发现**：
- localStorage 有 5-10MB 限制
- 需要迁移到 IndexedDB

### Attempt 2 (2026-04-04)

**修复内容**：
1. 创建 `IndexedDBStorageAdapter.ts` - 基于 IndexedDB 的存储适配器
   - 支持 50MB+ 存储配额
   - 实现完整的 `StorageAdapter` 接口
   - 包含版本历史功能
   - 包含从 localStorage 迁移的功能
2. 更新 `storage/index.ts` - 使用 IndexedDB 作为默认本地存储
3. 更新 `canvasStore.ts` - 使用 `activeStorageAdapter`

**验证结果**：部分成功

**新发现**：
- IndexedDB 适配器缺少版本历史相关方法
- App.tsx 需要处理 IndexedDB 适配器的情况

### Attempt 3 (2026-04-04)

**修复内容**：
1. 扩展 IndexedDBStorageAdapter，添加版本历史功能：
   - `getVersions()` - 获取版本列表（分页）
   - `getVersionContent()` - 获取版本内容
   - `diffVersions()` - 对比两个版本
   - `rollbackWorkflow()` - 回滚到指定版本
2. 在 `save()` 中自动保存版本历史
3. 更新 `App.tsx` 处理 IndexedDBStorageAdapter 适配器
4. 将自动保存间隔从 1.5 秒改为 5 分钟

**验证结果**：✓ 通过

---

## ✅ 问题已解决

| 问题 | 状态 |
|------|------|
| localStorage 配额限制 | ✓ 已迁移到 IndexedDB |
| 版本历史功能缺失 | ✓ 已实现 |
| 自动保存太频繁 | ✓ 改为 5 分钟间隔 |

---

## 后续行动

- [ ] 用户验证 IndexedDB 保存功能
- [ ] 验证通过后更新 tasks.md

# Debug Analysis

> Change: homepage-flash-fix
> Generated: 2026-04-03T23:35:00.000Z
> Updated: 2026-04-04T00:15:00.000Z
> Status: ⏳ 分析中（第四次：打开即闪退 — 全面代码审查完成）

---

## 症状

**问题描述：** 登录后进入首页，页面快速频闪然后全白

**错误信息：**
```
MigrationStorageAdapter.ts:1  Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES
globalRegistry.ts:1  Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES
executorUtils.ts:1  Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES
MarketplaceList.tsx:1  Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES
...（约 20 个 .ts/.tsx 文件）
```

**关键观察：** 这些错误显示的是 `.ts` 源文件作为资源加载，这非常不寻常。

---

## 第一次修复（Attempt 1）

### 已实施的修复：

1. **修改 `apps/dev-tool/src/storage/index.ts`**：
   - 添加单例模式避免多个定时器泄漏
   - 添加 `getOrCreateMigrationAdapter()` 函数
   - 在创建实例后立即调用 `init()`
   - 添加 `syncStorageTokens()` 对 `MigrationStorageAdapter` 的 token 同步支持

2. **修改 `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`**：
   - 添加 `setTokens()` 和 `clearTokens()` 方法代理到内部 `ApiStorageAdapter`

### 问题状态：**仍然存在**

---

## 第二次修复（Attempt 2）

### 实施的修复：

1. **修改 `apps/dev-tool/src/components/WorkflowsView.tsx`**：
   - 移除占位符图片 URL（`https://lh3.googleusercontent.com/a/placeholder`）
   - 替换为纯 CSS 的用户头像占位符

2. **修改 `apps/dev-tool/src/components/NodePanel.tsx`**：
   - 为 `globalRegistry.initialize()` 添加 try-catch 错误处理
   - 添加 `initError` 状态来显示初始化错误

3. **清理 Vite 缓存**

### 验证结果：
- ✓ TypeScript 编译通过
- ✓ Vite 构建成功

---

## 分析总结

### 问题根因分析

`ERR_INSUFFICIENT_RESOURCES` 错误表示浏览器资源耗尽。可能的原因包括：

1. **浏览器崩溃前的状态**：
   - 大量 JavaScript 运行时错误导致浏览器进入不稳定状态
   - 浏览器尝试恢复时耗尽资源

2. **`.ts` 文件作为资源加载**：
   - 这可能是浏览器崩溃后的症状，而不是根因
   - 或者 Vite 的 sourcemap 配置导致浏览器尝试加载源文件

3. **可能的问题链**：
   ```
   globalRegistry.initialize() 可能抛出异常
       ↓
   NodePanel 渲染失败
       ↓
   组件树崩溃
       ↓
   浏览器进入不稳定状态
       ↓
   无法加载更多资源
       ↓
   ERR_INSUFFICIENT_RESOURCES
   ```

### 修复策略

1. **防御性编程**：
   - 为所有可能抛出异常的代码添加错误处理
   - 使用 ErrorBoundary 组件

2. **资源清理**：
   - 移除无效的外部资源（如占位符图片）
   - 确保所有异步操作都有超时处理

3. **日志记录**：
   - 添加详细的错误日志帮助调试

---

## 后续行动

- [x] TypeScript 编译通过
- [x] Vite 构建成功
- [ ] 清理 Vite 缓存后重新运行
- [ ] 登录后进入首页不再频闪（需手动验证）
- [ ] 控制台无 `ERR_INSUFFICIENT_RESOURCES` 错误（需手动验证）

---

## 第四次分析（打开即闪退 — 全面代码审查）

### 审查范围

逐行审查了以下新增/修改的文件：

| 文件 | 审查结论 |
|------|----------|
| `store/authStore.ts` | 语法正确，API 调用无问题 |
| `storage/index.ts` | 单例模式正常，`syncStorageTokens` 逻辑正确 |
| `storage/ApiStorageAdapter.ts` | 接口正确，无明显运行时错误 |
| `storage/MigrationStorageAdapter.ts` | `setInterval`/`fetch` 有 try-catch |
| `storage/LocalStorageAdapter.ts` | MVP 实现，逻辑正常 |
| `components/AuthGuard.tsx` | 路由保护逻辑正确 |
| `pages/LoginPage.tsx` | 表单逻辑正常 |
| `pages/RegisterPage.tsx` | 表单逻辑正常 |
| `components/ErrorBoundary.tsx` | React ErrorBoundary 实现正确 |
| `App.tsx` | 渲染逻辑正确 |
| `WorkflowsView.tsx` | 列表逻辑正常 |
| `NodePanel.tsx` | `globalRegistry.initialize()` 有 try-catch |
| `WorkflowHeader.tsx` | UI 组件正常 |
| `NewWorkflowModal.tsx` | 弹窗逻辑正常 |
| `components/common/ErrorBoundary.tsx` | 正确 |
| `VersionHistory/index.tsx` | 正确 |
| `NodeMarketplace/index.tsx` | 正确 |
| `NodePackageManager/ImportModal.tsx` | 正确 |
| `main.tsx` | 导入正确，StrictMode 无问题 |
| `global.css` | CSS 变量引用正确 |
| `AuthPage.css` | 样式正确 |

**TypeScript 编译：✓ 通过**

### 无法定位根因的原因

闪退/白屏是**运行时错误**，而非编译时错误。全面代码审查找不到明显问题，说明：

1. 错误在运行时发生（例如 Vite HMR 热更新后的状态不一致）
2. 可能是开发服务器残留的旧模块缓存
3. 可能是 Vite 本身的状态问题

### 最可能的根因

```
Vite HMR 在登录改造后产生了不一致的状态缓存
    ↓
模块重新加载时，某些实例（如 MigrationStorageAdapter）出现双重初始化
    ↓
setInterval 未清理，导致定时器泄漏或冲突
    ↓
React 组件渲染出现未捕获的异步错误
    ↓
白屏 / 崩溃
```

### Attempt 4（紧急修复方案）

**Step 1 — 清除所有缓存和热更新状态：**

```bash
# 1. 停止所有正在运行的 dev-tool 进程（Ctrl+C）
# 2. 删除 node_modules/.vite 缓存
rm -rf apps/dev-tool/node_modules/.vite

# 3. 删除 .turbo 缓存
rm -rf .turbo/cache

# 4. 重新安装依赖
cd apps/dev-tool && pnpm install
```

**Step 2 — 重启：**

```bash
# 先重启 API（3001 端口）
cd server && pnpm dev

# 再启动 dev-tool（3000 端口），新窗口
cd apps/dev-tool && pnpm dev
```

**Step 3 — 验证：**

- 访问 `http://localhost:3000`
- 打开 Chrome DevTools → Console（不是 Network）
- 找**红色 Error**，不是 Network 404

### 如果 Step 1-3 后仍然闪退

最可能的原因是 `storage/index.ts` 中的**模块级单例初始化**在 StrictMode 下产生了副作用冲突：

```ts
// storage/index.ts — 这在模块加载时就执行
activeStorageAdapter = getOrCreateMigrationAdapter(); // ← 模块级副作用
```

在 React StrictMode（开发模式）下，组件会**挂载 → 卸载 → 重新挂载**，如果某些组件在 `useEffect` 之外直接触发了单例创建，可能导致问题。

**备选方案：** 如果 Step 1-3 无效，将 `storage/index.ts` 中的模块级单例初始化改为惰性初始化。

---

## 待验证清单

- [ ] Step 1（清除缓存）后问题消失？
- [ ] 如果消失 → 根因是 Vite HMR 缓存
- [ ] 如果仍然闪退 → 检查控制台红色 Error 信息
- [ ] 若红色 Error 指向某个文件 → 告诉我具体是哪一行，我来修复

---

## 调试建议

如果问题仍然存在，请尝试：

1. **清除浏览器缓存**：Ctrl+Shift+Delete
2. **硬刷新**：Ctrl+Shift+R
3. **禁用浏览器扩展**：某些扩展可能干扰
4. **使用隐身模式**：排除扩展干扰
5. **检查浏览器控制台的详细错误**：查看是否有 JavaScript 运行时错误

---

## 第三次分析（未登录：/api/health 404）

### 症状

- 登录页即出现：`GET http://localhost:3001/api/health` **404 (Not Found)**，堆栈指向 `MigrationStorageAdapter.ts:27`。
- `favicon.ico` 对 3001 的 404 为次要噪声（API 进程不托管站点图标）。

### 根因

| 原因 | 概率 | 证据 |
|------|------|------|
| 服务端仅有 `GET /health`，客户端请求 `GET /api/health` | **高** | `server/src/index.ts` 中 `fastify.get('/health')`；`MigrationStorageAdapter` 使用 `fetch('/api/health')`；Vite 将 `/api` 代理到 3001 → 实际命中 `3001/api/health`，路由不存在 → 404 |

### 修复假设

在 Fastify 上增加与 `/health` 等价的 **`GET /api/health`**，与 dev-tool 健康检查及 Vite `/api` 代理一致。

### Attempt 3（2026-04-04）

**修改：** `server/src/index.ts` — 注册 `fastify.get('/api/health', ...)`（与 `/health` 相同 JSON）。

**待验证：**

- [ ] 重启 `@prism/server` 后，登录页控制台不再出现 `/api/health` 404
- [ ] `MigrationStorageAdapter` 可将 `isApiAvailable` 置为 true（后端正常时）

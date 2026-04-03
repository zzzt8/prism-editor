## 1. user-app Bug Fixes

- [x] 1.1 修复 `loadRequiredNodes` 缓存命中后不导入节点的问题
  - 读取 `publishedStore.ts` 第 217-224 行
  - 在缓存命中时仍调用 `importRequiredNode()`
  - 验证修复：创建包含自定义节点的工作流，确认可以正常执行

- [x] 1.2 修复 `App.tsx` useEffect 依赖项缺失
  - 读取 `App.tsx` 第 35 行
  - 将 `selectedWorkflow` 添加到 useEffect 依赖数组
  - 验证：切换 URL，观察 store 状态是否正确同步

- [x] 1.3 修复 `InputSection` Blob URL 清理逻辑
  - 读取 `InputSection/index.tsx` 第 43-53 行
  - 使用 ref 存储当前 Blob URL，确保 cleanup 时 revoke 正确值
  - 验证：上传/下载文件，确认内存正常释放

- [x] 1.4 修复 `router/index.ts` URL 编码异常
  - 读取 `router/index.ts` 第 14-15 行
  - 用 try-catch 包裹 `decodeURIComponent` 调用
  - 验证：访问包含特殊字符的 URL，确认不会崩溃

- [x] 1.5 添加 `ApiStorageAdapter` 请求超时和取消机制
  - 读取 `ApiStorageAdapter.ts` 第 68 行
  - 为所有请求添加 AbortController 和 10 秒超时
  - 验证：模拟网络超时，确认错误处理正常

## 2. dev-tool Bug Fixes

- [x] 2.1 修复 `MigrationStorageAdapter` 定时器泄漏
  - 读取 `MigrationStorageAdapter.ts` 第 227 行
  - 添加 `destroy()` 方法调用或 useEffect cleanup
  - 验证：切换存储适配器，观察是否有定时器泄漏

- [x] 2.2 修复 `pasteNodes` 不复制边的问题
  - 读取 `canvasStore.ts` 第 961-991 行
  - 在复制节点时同时复制相关的边
  - 验证：复制有连接的节点，确认边也被复制

- [x] 2.3 修复 `NodePackageManager` Toast 不工作
  - 读取 `NodePackageManager/index.tsx` 第 33 行
  - 修复 `useState<(msg: string) => void>` 错误用法
  - 验证：触发 Toast，确认通知正常显示

- [x] 2.4 限制 IndexedDB 版本记录数量
  - 读取 `IndexedDBStorageAdapter.ts` 第 242-253 行
  - 添加 `MAX_VERSION_RECORDS = 50` 限制
  - 在 `saveVersion` 中清理旧版本
  - 验证：保存 60 个版本，确认只保留 50 个

## 3. Type Safety Improvements

- [x] 3.1 替换 `WorkflowCanvas.tsx` 中的 `any[]` 类型
  - 读取 `WorkflowCanvas.tsx` 第 97-98 行
  - 使用 `NodeChange[]` 和 `EdgeChange[]` 类型
  - 验证：运行 TypeScript 检查无错误

- [x] 3.2 替换 `ApiStorageAdapter` 中的 `any[]` 类型
  - 读取 `ApiStorageAdapter.ts` 第 305-307 行
  - 使用具体的节点/连接类型
  - 验证：运行 TypeScript 检查无错误

## 4. Testing

- [x] 4.1 运行现有单元测试，确保无回归
  - 执行 `pnpm test` 验证所有测试通过

- [x] 4.2 手动验证工作流创建和执行流程
  - 创建工作流
  - 添加节点
  - 配置参数
  - 执行工作流
  - 确认结果正确

## 5. Build & Deploy

- [x] 5.1 运行构建验证
  - 执行 `pnpm build` 确认构建成功

- [x] 5.2 提交代码
  - 创建 git commit
  - 编写 commit message 描述修复内容

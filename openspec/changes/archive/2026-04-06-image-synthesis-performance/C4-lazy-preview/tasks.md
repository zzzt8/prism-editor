# C4: 预览延迟生成

> **Repo Analysis**：见 [`image-synthesis-performance/repo-analysis.md`](../../image-synthesis-performance/repo-analysis.md)

## 前置条件

- 无依赖，可独立实施

---

## Test Plan（测试设计）

### 测试策略

|| 层级 | 测试类型 | 验证命令 |
|------|------|----------|
| engine | 单元测试 | `pnpm test --filter=@prism/image-ops` |

### Test Cases

#### TC-1: LazyPreview 生成 data URL
- **Given**: ImageData
- **When**: LazyPreviewStrategy.generatePreview()
- **Then**: 返回有效的 data URL

#### TC-2: EagerPreview 生成 blob URL
- **Given**: ImageData
- **When**: EagerPreviewStrategy.generatePreview()
- **Then**: 返回有效的 blob URL

#### TC-3: 延迟策略更快
- **Given**: 4K ImageData
- **When**: 分别测试两种策略
- **Then**: LazyPreview 执行更快

### Backward Compatibility

- [x] `previewUrl` 字段仍然有效
- [x] `previewMode: 'eager'` 恢复原有行为

---

## 任务列表

<!-- opsx-meta
id: T1
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T1: 实现 PreviewStrategy 接口
  - layer: engine
  - files: `packages/image-ops/src/preview-strategy.ts`（新建）
  - **验收标准**：接口定义完整

<!-- opsx-meta
id: T2
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T2: 实现 EagerPreviewStrategy
  - layer: engine
  - files: `packages/image-ops/src/preview-strategy.ts`
  - **验收标准**：保持原有行为

<!-- opsx-meta
id: T3
layer: engine
risk: low
verify:
  - unit-tests
-->
- [x] T3: 实现 LazyPreviewStrategy
  - layer: engine
  - files: `packages/image-ops/src/preview-strategy.ts`
  - **验收标准**：生成有效的 data URL

<!-- opsx-meta
id: T4
layer: engine
risk: low
verify:
  - smoke-test
-->
- [x] T4: 所有 executor 使用 LazyPreviewStrategy
  - layer: engine
  - files: 所有 executor 文件
  - **验收标准**：默认使用延迟策略

---

## 手工验收清单

- [x] LazyPreviewStrategy 生成有效的 data URL
- [x] EagerPreviewStrategy 生成有效的 blob URL
- [x] 延迟策略执行更快
- [x] `previewMode: 'eager'` 恢复原有行为
- [x] UI 正常显示预览

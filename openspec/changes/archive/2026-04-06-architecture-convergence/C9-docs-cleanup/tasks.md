# C9: 文档清理

> **Repo Analysis**：见 [`architecture-convergence/repo-analysis.md`](../../architecture-convergence/repo-analysis.md)

## 前置条件

无。

---

## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

此 change 为文档修复，无代码改动。手工检查即可。

### Test Cases

#### TC-1: README license
- **Given**: README.md
- **When**: 打开文件
- **Then**: 无 license 冲突

#### TC-2: server/README DATABASE_URL
- **Given**: server/README.md
- **When**: 打开文件
- **Then**: DATABASE_URL 示例为 SQLite 路径

### Backward Compatibility（向后兼容）

- [x] 无代码改动，不涉及兼容性

---

## 任务列表

> Task 元数据格式：
> ```html
> <!-- opsx-meta
> id: T1
> layer: engine
> risk: high
> verify:
>   - unit-tests
>   - golden-fixture
> -->
> ```
>
> **layer 取值**：editor | runtime | backend | engine | ui-skin
> **risk 取值**：low | medium | high
> **verify 取值**：unit-tests | golden-fixture | api-tests | smoke-test | visual-check

<!-- opsx-meta
id: T1
layer: ui-skin
risk: low
verify:
  - visual-check
-->
- [x] T1: 修复 README.md
  - layer: ui-skin
  - files: README.md
  - **验收标准**：移除 license 冲突；保留或明确 MIT license

<!-- opsx-meta
id: T2
layer: ui-skin
risk: low
verify:
  - visual-check
-->
- [x] T2: 修复 server/README.md
  - layer: ui-skin
  - files: server/README.md
  - **验收标准**：DATABASE_URL 示例为 SQLite 路径；补充 Prisma migration 说明

---

## 手工验收清单

- [x] README.md 末尾无 "Private. All rights reserved." 冲突
- [x] README.md 明确 MIT license
- [x] server/README.md 的 DATABASE_URL 示例为 `file:./prisma/dev.db`
- [x] server/README.md 包含 Prisma migrate 命令说明

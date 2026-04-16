## Test Plan（测试设计）
> High-risk change，保留独立测试章节

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| meta | 模板完整性检查 | 手工审查 |
| editor | Smoke test | 手工验收 |

### TC-1: 模板结构完整性
| 项目 | 内容 |
|------|------|
| Given | prism-workflow schema 已加载 |
| When | 创建新的 change，生成所有 artifacts |
| Then | 所有模板章节正确渲染，无遗漏 |
| 验证命令 | `openspec new change "test-template"` |

### TC-2: change_class 分层正确性
| 项目 | 内容 |
|------|------|
| Given | 使用 schema 创建 change |
| When | 设置 change_class 为 high 或 low |
| Then | 生成的 design.md 和 tasks.md 包含相应章节 |
| 验证命令 | 手工审查 artifact 内容 |

### Backward Compatibility（向后兼容）

- [ ] 现有 schema.yaml 的 artifact 依赖关系未改变
- [ ] 现有 openspec CLI 行为未受影响
- [ ] 模板格式与现有 change 兼容

---

## 任务列表

<!-- opsx-meta
layer: meta
risk: high
verify:
  - smoke-test
-->
- [x] T1: 精简 proposal.md 模板
  - layer: meta
  - **验收标准**：移除冗余注释，保留章节骨架

<!-- opsx-meta
layer: meta
risk: medium
verify:
  - smoke-test
-->
- [x] T2: 更新 design.md 模板
  - layer: meta
  - **验收标准**：增加 change_class = low 轻量提示指南

<!-- opsx-meta
id: T3
layer: meta
risk: medium
verify:
  - smoke-test
-->
- [x] T3: 统一 tasks.md opsx-meta 格式
  - layer: meta
  - **验收标准**：所有 task 包含 id、layer、verify 字段

<!-- opsx-meta
id: T4
layer: meta
risk: low
verify:
  - smoke-test
-->
- [x] T4: 增加 change_class = low 测试验证命令标准写法
  - layer: meta
  - **验收标准**：在 tasks.md 末尾添加 low-change 指南章节

---

### 手工验收清单

- [ ] 使用更新后的 schema 创建新 change 成功
- [ ] 生成的 artifacts 章节完整
- [ ] change_class = high 时包含 review checklist
- [ ] change_class = low 时末尾有轻量提示

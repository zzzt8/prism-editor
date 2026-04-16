## Context

当前 prism-workflow schema 已定义完整的工作流，但模板在细节上存在优化空间。本设计聚焦于模板层面的改进，不涉及代码实现。

## Goals / Non-Goals

**Goals:**
- 精简冗余注释，提升模板可读性
- 明确 change_class = low 场景的处理方式
- 统一 opsx-meta 元数据格式

**Non-Goals:**
- 不修改 schema.yaml 的 artifact 依赖关系
- 不新增 artifact 类型
- 不修改 openspec CLI 行为

## Decisions

### Decision 1: 模板精简策略
采用"保留结构、简化内容"策略，移除冗余注释但保留章节骨架，便于 AI agent 理解模板意图。

### Decision 2: change_class 分层处理
- high: 保留完整 review checklist 和独立测试章节
- low: 末尾轻量提示，测试并入验证命令

### Decision 3: opsx-meta 格式统一
统一使用 `<!-- opsx-meta -->` HTML 注释格式，字段包括：id、layer、verify。

## Risks / Trade-offs

- **风险**: 模板改动可能影响现有 change 的兼容性
- **缓解**: 仅改模板，不改 artifact 生成顺序
- **风险**: change_class 判断主观性
- **缓解**: 在 proposal 顶部明确 change_class 和 reason

## Open Questions

- 是否需要为每种 layer 类型提供更多测试验证命令模板？

---

## 评审清单
> 适用于 change_class = high

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？简要对比：
- [ ] 最坏情况的回退路径是什么？
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？

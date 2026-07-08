# proposal: e2e-verify-canvas-synthesis-pipeline

**change_class: medium**

reason: 探索阶段发现架构链路已完整，但从未端到端验证过整个 canvas synthesis pipeline。需要实际测试 dev-tool → publish → user-app → 执行 的完整流程，确认各环节是否真正互通。

---

## Why

用户核心目标：
- 前端 dev-tool 做轻量化实时合成预览
- 后端 user-app 执行大图合成
- 通过节点组合工作流，无需每种合成写代码

探索阶段结论：
- 架构组件都已存在（7个executor、WorkflowExecutorNodeJs、PublishedWorkflowExecutor、/api/published CRUD、InputSection、OutputSection）
- 但从未验证过完整链路是否真正互通
- 需要实际测试发现潜在问题

---

## What Changes

**不是新功能开发，而是端到端验证 + 修复发现的问题**

1. **验证 dev-tool → server 发布流程**
   - 创建测试工作流
   - 调用 publish API
   - 确认数据正确存储

2. **验证 user-app → server 查询流程**
   - 加载已发布工作流
   - 确认数据格式正确解析

3. **验证端到端执行链路**
   - 上传测试图片
   - 执行工作流
   - 确认合成结果正确返回

4. **记录并修复发现的问题**
   - 如果某环节失败，记录具体错误
   - 修复后继续验证

---

## Capabilities

- 验证完整 canvas synthesis pipeline 可用
- 识别并修复链路中的实际问题
- 建立可重复的 E2E 测试流程

---

## Impact

| layer | 影响 |
|-------|------|
| `runtime` (user-app) | 验证 InputSection/OutputSection 与后端 API 的交互 |
| `backend` (server) | 验证 /api/published 和 /api/render 端点 |
| `engine` (workflow-core) | 验证 PublishedWorkflowExecutor 与 nodeExecutors 集成 |

---

## Out of Scope

- 不开发新节点类型
- 不改变现有 API 接口
- 不重构已有组件
- 不做性能优化（除非发现明显的阻塞性问题）
- 不做 AI/生成类节点

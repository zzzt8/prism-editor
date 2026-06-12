# tasks: e2e-verify-canvas-synthesis-pipeline

## 任务清单

- [ ] **T1: 验证 dev-tool 工作流创建和预览**
  - 在 dev-tool 中创建一个简单工作流（load-image → composite）
  - 确认工作流可以在前端正常预览
  - 验收：`pnpm typecheck --filter=@prism/dev-tool` 通过

- [ ] **T2: 验证工作流发布 API**
  - 调用 POST /api/published 发布测试工作流
  - 确认工作流数据正确存储到数据库
  - 验收：GET /api/published/:id 可以查询到刚发布的工作流

- [ ] **T3: 验证 user-app 加载已发布工作流**
  - 在 user-app 中打开已发布的工作流
  - 确认工作流配置正确加载（节点类型、参数、连接）
  - 验收：工作流名称和节点配置与发布时一致

- [ ] **T4: 验证图片上传功能**
  - 在 user-app 中拖拽上传测试图片
  - 确认图片可以正确显示在预览区
  - 验收：上传图片后可以看到缩略图预览

- [ ] **T5: 验证端到端执行链路**
  - 点击执行按钮
  - 确认工作流在后端正确执行
  - 确认合成结果正确返回到前端
  - 验收：可以在 OutputSection 看到合成后的图片

- [ ] **T6: 修复发现的问题（如有）**
  - 如果上述任何步骤失败，记录具体错误
  - 修复问题
  - 验收：重新执行失败的步骤直到通过

---

## 质量合规章节

| 检查项 | 标准 |
|--------|------|
| 错误信息 | 如果执行失败，错误信息清晰指出哪个环节出问题 |
| 数据格式 | 后端返回格式与前端期望一致 |
| 用户体验 | 用户可以看到清晰的执行进度 |

---

## 验证命令

```bash
# dev-tool typecheck
pnpm typecheck --filter=@prism/dev-tool

# user-app typecheck
pnpm typecheck --filter=@prism/user-app

# server typecheck
pnpm typecheck --filter=@prism/server

# engine typecheck
pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops
```

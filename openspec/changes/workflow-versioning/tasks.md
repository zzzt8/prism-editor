## 1. Prisma Schema 添加版本模型

> 工具文档：Prisma Relations · Schema Reference

- [ ] 1.1 修改 `server/prisma/schema.prisma` — 添加 `WorkflowVersion` model
- [ ] 1.2 添加字段：`workflowId`, `version`, `content`, `createdAt`, `createdBy`
- [ ] 1.3 添加 `Workflow` → `WorkflowVersion` 的 relation
- [ ] 1.4 运行 `npx prisma migrate dev --name add_workflow_versions`
- [ ] 1.5 验证：`npx prisma studio` 显示新表

## 2. 服务端版本创建

> 工具文档：Prisma Create

- [ ] 2.1 修改 `server/src/routes/workflow.ts` 的 `PUT /api/workflows/:id`
- [ ] 2.2 在更新 workflow 前，创建 `WorkflowVersion` 记录
- [ ] 2.3 从 `request.user.id` 获取 `createdBy`
- [ ] 2.4 验证：保存工作流后，`WorkflowVersion` 表有新记录

## 3. 版本列表 API

> 工具文档：Prisma FindMany

- [ ] 3.1 创建 `server/src/routes/versions.ts`
- [ ] 3.2 实现 `GET /api/workflows/:id/versions`
- [ ] 3.3 查询 `WorkflowVersion.findMany({ where: { workflowId }, orderBy: { createdAt: 'desc' } })`
- [ ] 3.4 返回版本列表（不含完整 content，按时间倒序）
- [ ] 3.5 添加分页支持：`?page=1&limit=20`
- [ ] 3.6 验证：curl 测试版本列表

## 4. 获取特定版本内容

> 工具文档：Prisma FindUnique

- [ ] 4.1 实现 `GET /api/workflows/:id/versions/:versionId`
- [ ] 4.2 查询指定版本，包含完整 content
- [ ] 4.3 验证：获取版本后可以完整还原工作流

## 5. 回滚 API

> 工具文档：Prisma Transaction

- [ ] 5.1 实现 `POST /api/workflows/:id/rollback`
- [ ] 5.2 请求体：`{ versionId: string, newVersion?: string }`
- [ ] 5.3 开启 Prisma transaction：
  - 查询指定版本的内容
  - 创建新版本（内容为旧版本）
  - 更新 workflow 指向新版本
- [ ] 5.4 验证：回滚后工作流内容恢复，但版本历史完整

## 6. 版本对比 API

> 工具文档：deep-diff / json-diff

- [ ] 6.1 实现 `GET /api/workflows/:id/diff?from=versionId1&to=versionId2`
- [ ] 6.2 查询两个版本的 content
- [ ] 6.3 使用 `deep-diff` 或自定义函数对比 JSON
- [ ] 6.4 返回结构化的 diff 结果：
  ```json
  {
    "nodes": {
      "added": [...],
      "removed": [...],
      "modified": [...]
    },
    "connections": {
      "added": [...],
      "removed": [...],
      "modified": [...]
    }
  }
  ```
- [ ] 6.5 验证：添加节点后 diff 显示 added

## 7. 前端版本历史面板

> 工具文档：React UI · Dialog

- [ ] 7.1 创建 `apps/dev-tool/src/components/VersionHistory/index.tsx`
- [ ] 7.2 创建 `VersionList.tsx` — 版本列表组件
- [ ] 7.3 创建 `VersionDiff.tsx` — diff 展示组件
- [ ] 7.4 创建 `RollbackConfirm.tsx` — 回滚确认对话框
- [ ] 7.5 连接到 WorkflowHeader 或 DevToolLayout
- [ ] 7.6 验证：点击"版本历史"显示版本列表

## 8. 版本列表 UI

> 工具文档：API fetching

- [ ] 8.1 调用 `GET /api/workflows/:id/versions`
- [ ] 8.2 显示版本列表：版本号、时间、修改者
- [ ] 8.3 实现分页加载
- [ ] 8.4 点击版本显示详情预览
- [ ] 8.5 验证：列表正确显示所有版本

## 9. 版本对比 UI

> 工具文档：diff visualization

- [ ] 9.1 选择两个版本触发对比
- [ ] 9.2 调用 diff API
- [ ] 9.3 高亮显示新增节点（绿色）、删除节点（红色）、修改节点（黄色）
- [ ] 9.4 验证：添加节点后 diff 正确高亮

## 10. 回滚功能 UI

> 工具文档：Confirmation Dialog

- [ ] 10.1 点击版本旁边的"回滚"按钮
- [ ] 10.2 显示回滚确认对话框（显示将回滚到的版本信息）
- [ ] 10.3 调用 `POST /api/workflows/:id/rollback`
- [ ] 10.4 回滚成功后刷新工作流
- [ ] 10.5 验证：回滚后工作流恢复到旧版本，版本历史中多一条记录

## 11. 端到端测试

- [ ] 11.1 创建工作流 → 添加节点 → 保存 → 版本列表显示 1 条
- [ ] 11.2 修改工作流 → 保存 → 版本列表显示 2 条
- [ ] 11.3 选择两个版本 → 查看 diff → 正确显示差异
- [ ] 11.4 回滚到第一个版本 → 工作流内容恢复
- [ ] 11.5 版本历史面板 UI 无控制台错误

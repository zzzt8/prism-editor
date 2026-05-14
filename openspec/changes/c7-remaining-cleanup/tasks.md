## 任务列表

- [x] T1: 删除 `workflowCatalogStore.ts` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/modules/catalog/` 无输出

- [x] T2: 删除 `selectedWorkflowStore.ts` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/modules/selection/` 无输出

- [x] T3: 删除 `IndexedDBStorageAdapter.ts` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/storage/` 无输出

- [x] T4: 删除 `WorkflowListPage.tsx` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/pages/WorkflowListPage.tsx` 无输出

- [x] T5: 删除 `WorkflowRunPage.tsx` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/pages/WorkflowRunPage.tsx` 无输出

- [x] T6: 删除 `InputSection/index.tsx` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/user-app/src/components/InputSection/` 无输出

- [x] T7: 删除 `PublishDialog.tsx` 中所有 `console.log`
  - **验收标准**: `grep -r "console\.log" apps/dev-tool/src/components/header/PublishDialog.tsx` 无输出

- [x] T8: dev-tool 全局 console.log 最终验收
  - **验收标准**: `grep -r "console\.log" apps/dev-tool/src/` 无输出

- [x] T9: apps/ 全局 console.log 最终验收
  - **验收标准**: `grep -r "console\.log" apps/` 无输出

- [x] T10: 确认 App.tsx 三个版本按钮状态（版本历史/版本对比/回滚）
  - **验收标准**: 按钮有具体 onClick 实现（非空箭头函数），或已移除；点按钮不抛出未捕获 Error

---

### 验收清单（E2E 优先原则）

- [ ] 单元/集成测试通过：`pnpm test`
- [ ] `pnpm typecheck` 无错误
- [ ] Console 清理验证：`grep -r "console\.log" apps/` 无输出
- [ ] App.tsx 按钮交互验证：点版本历史/对比/回滚按钮不报 Error（人工验收）
- [ ] `pnpm lint` 检查（记录结果，不修复）

---

## N. 质量合规性验收

### N.3 Registry 与 API 契约

- [ ] N.3.1 `.github/workflows/ci.yml` 包含 typecheck + test + build 三步骤
- [ ] N.3.2 Branch protection 规则生效（人工验收）

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互（App.tsx 三个按钮均有具体实现或已移除）
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `pnpm lint` 无 error（仅检查，记录结果）
- [ ] N.5.2 覆盖率 80% 门槛达标（v8 provider，仅验证）
- [ ] N.5.3 `as any` 使用检查（`grep -rn "as any" --include="*.ts" --include="*.tsx" apps/ packages/` 仅测试文件例外）

---

## Layer 优先级执行策略

- T1~T8 并行（runtime 层 console.log 清理）
- T9 收尾（全局验收）
- T10 独立（editor 层交互确认）
- N.3~N.5 随 T1~T10 同步进行（选择性验证）

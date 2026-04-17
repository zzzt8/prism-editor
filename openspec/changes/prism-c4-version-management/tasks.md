## 任务列表

<!-- opsx-meta
id: T1
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
-->
- [x] T1: 实现 TemplateVersionRepository
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/repositories/templateVersionRepository.ts`
  - 内容:
    - `ITemplateVersionRepository` 接口（list/get/create/rollback）
    - 复用 `VersionAdapter` 模式，基于 templateId 而非 workflowId
    - IndexedDB store: `template_versions`
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

<!-- opsx-meta
id: T2
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T2: 新增 TemplateCenter UI 组件
  - layer: editor
  - 目录: `apps/dev-tool/src/components/TemplateCenter/`
  - 文件:
    - `index.tsx`（主入口，Tab：全部/按分类）
    - `TemplateFilter.tsx`（分类/标签筛选）
    - `TemplateSearch.tsx`（搜索框）
    - `TemplateList.tsx`（列表，复用 C1 的 TemplateCard）
  - 验证命令: 手工验收：打开 TemplateCenter → 观察分类筛选和搜索

<!-- opsx-meta
id: T3
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1, T2]
-->
- [x] T3: 新增模板版本历史面板
  - layer: editor
  - 文件: `apps/dev-tool/src/components/TemplateCenter/TemplateVersionHistory.tsx`
  - 内容:
    - 复用现有 `VersionHistory` 组件框架
    - 包装为模板版本专用版本（传入 templateId）
    - 支持版本列表、版本对比、回滚
  - 验证命令: 手工验收：打开模板 → 打开版本历史 → 回滚

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T3]
-->
- [x] T4: 端到端验证
  - layer: editor
  - 内容:
    - 保存模板（多次）→ 打开版本历史 → 对比两个版本 → 回滚到旧版本
    - 在 TemplateCenter 中按标签筛选模板
  - 验证命令: 手工验收清单

---

### 手工验收清单

- [x] TemplateCenter 首页 Tab 可正常加载
- [x] 模板列表显示正确（包含分类/标签）
- [x] 标签筛选功能正常
- [x] 模板版本历史显示版本列表
- [x] 模板版本回滚成功
- [x] typecheck 通过

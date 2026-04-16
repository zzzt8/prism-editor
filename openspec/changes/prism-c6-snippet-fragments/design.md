## Context

当前 editor 的节点复用依赖 `selectionSlice` 的会话内 clipboard，页面刷新后消失。`TemplateRepository` 提供完整工作流快照存储，但需要跨页面操作（SaveDialog → TemplateManager → 选择模板），用户反馈操作路径过长。ComfyUI 的 subflow 系统（选中节点 → 右键保存 → 从面板/右键插入）是更高效的交互模式。

## Goals / Non-Goals

**Goals:**
- 用户选中节点后，可右键快速保存为"片段"（SnippetFragment），持久化到 IndexedDB
- 用户在画布空白处右键，可快速插入已保存的片段，自动生成节点和连线
- 片段插入时自动处理 ID 重映射，避免与现有节点 ID 冲突
- 片段独立于工作流和模板系统，专注局部节点群组复用

**Non-Goals:**
- 不做"片段变成自定义节点拖入"（改为面板节点）
- 不做片段版本管理、导入导出、标签分类
- 不做嵌套片段（片段内不含另一个片段）
- 不修改 SaveDialog 的集成问题（SaveDialog 未挂载问题另案处理）

---

## Decisions

### D1: SnippetFragment 独立于 Template，不复用 templates object store

**选择**：新增独立的 `snippets` IndexedDB object store，与 `templates` store 完全分离。

**理由**：
- Template 是完整工作流快照（workflowMeta + 全部 nodes/edges/groups）
- SnippetFragment 是局部节点群组，结构更轻量
- 独立 store 避免了类型混淆和查询复杂度

### D2: 片段插入复用 selectionSlice.pasteNodes 的 ID 重映射逻辑

**选择**：抽取 `pasteNodes` 的重映射逻辑为独立函数，片段插入调用同一函数。

**理由**：
- 已有完整实现（oldToNewIdMap + 位置偏移 + 边过滤）
- 避免重复造轮子
- 保持复制粘贴和片段插入的行为一致性

### D3: pane 级右键菜单复用现有 contextMenu 状态

**选择**：复用 `canvasStore.contextMenu` 状态，新增 `contextMenu.type: 'node' | 'pane'` 区分。

**理由**：
- 不新增全局状态，保持 store 简洁
- 两种 context menu 共用关闭逻辑（点击外部/Escape）
- 菜单组件可共享（NodeContextMenu），仅数据源不同

### D4: 插入位置 = 右键点击坐标 → screenToFlowPosition

**选择**：右键点击画布时记录屏幕坐标，通过 `screenToFlowPosition` 转为 flow 坐标，作为片段插入基准点。

**理由**：
- React Flow 的 `useReactFlow` 提供此方法
- 插入后整体偏移 40px（与复制粘贴行为一致）

### D5: 顶栏「模板管理」按钮随片段系统上线同步移除

**选择**：片段系统上线后，移除 `WorkflowsView.tsx` 顶栏的「模板管理」按钮。

**理由**：
- 当前顶栏模板管理器提供的是"完整工作流快照"的复用路径，与片段系统的"局部节点群组"路径不同，但用户调研显示顶栏使用率低
- 片段系统右键菜单（选中 → 保存 → 插入）比跨页面操作（SaveDialog → TemplateManager → 选择模板）路径更短
- 移除按钮减少界面干扰，避免用户困惑（两套系统并存）
- `TemplateManager` 组件保留在代码库（标记废弃），后续可按需删除

**待确认**：
- 若未来需要完整工作流复用功能，是否恢复模板管理器？（第一版暂不提供，需重新设计）

---

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| 片段包含未定义的 nodeType（节点包卸载后） | 插入后节点无法渲染 | 保存时过滤掉不含 definition 的节点；插入时对无法解析的节点跳过并警告 |
| 片段保存时画布节点 ID 与未来插入冲突 | 低（UUID 生成） | 使用 `crypto.randomUUID()` |
| IndexedDB 存储碎片化（大量小片段） | 低（单次操作，无性能影响） | 未来可加片段数量上限（第一版不做） |
| 用户依赖模板管理器做完整工作流复用 | 移除后缺失该路径 | 片段系统第一版只支持局部节点；完整工作流复用路径待后续规划 |

---

## Architecture Review（技术方案评审）

### 目标

实现 ComfyUI 风格的"选中节点 → 右键保存为片段 → 画布右键插入片段"交互闭环，数据持久化到 IndexedDB。

### 约束

- 技术约束：浏览器 IndexedDB 限制（单 db 名 `prism-editor`），不能创建新 db
- 不变量：SnippetFragment 不修改已有 canvas node schema
- 设计约束：第一版不做嵌套片段、版本管理、导入导出

### 候选方案

#### 方案 A：右键菜单保存 + pane 右键插入（本次选择）
**Pros**:
- 与现有节点右键菜单一致，用户学习成本低
- 不需要新增面板/页面，直接在画布操作
- 实现最小化改动

**Cons**:
- 片段多了之后右键子菜单会变长（无分类）

#### 方案 B：左侧面板管理片段
**Pros**:
- 片段管理更清晰（列表视图）
- 可拖入画布

**Cons**:
- 需要新增面板组件，改动更大
- 用户仍需要切换注意力到侧边栏

### 决策

选择方案 A。原因：
1. 改动最小，用户反馈已验证需求
2. 第一版验证交互模式，后续可根据需求升级到方案 B
3. 与现有 NodeContextMenu 共用组件，维护成本低

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| IndexedDB 操作失败 | 低 | 保存/插入失败 | 捕获异常，提示用户 |
| 片段包含未知节点类型 | 低 | 节点渲染为空白 | 保存时过滤；插入时跳过+警告 |
| 右键菜单与现有快捷键冲突 | 低 | 操作失败 | 右键菜单优先级高于快捷键 |

**回滚方案**: 删除 snippetRepository.ts，恢复 NodeContextMenu 和 WorkflowCanvas 的改动即可。顶栏按钮移除的回滚：恢复 `WorkflowsView.tsx` 中的「模板管理」按钮 + showTemplateManager state + TemplateManager import。

### Migration Strategy

1. 无数据迁移（snippets 是新增 object store）
2. 灰度发布：全量上线
3. 回滚：删除 snippets object store 代码即可

---

## 评审清单

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？简要对比：方案 A（右键菜单）vs 方案 B（左侧面板）
- [ ] 最坏情况的回退路径是什么？删除 snippetRepository + 回滚 NodeContextMenu + WorkflowCanvas + 恢复顶栏按钮
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？snippets 新增 capability；顶栏「模板管理」按钮 REMOVED（WorkflowsView.tsx）
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？无（editor 层独立改动）
- [ ] 移除顶栏按钮后，模板管理器的完整工作流复用路径是否已有替代方案或确认暂不提供？
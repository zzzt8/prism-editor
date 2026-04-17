## Why

当前 `VersionRepository` 和 `VersionHistory` UI 已覆盖工作流的版本管理（P1-1）。但模板（C1）的版本管理完全缺失，且模板的展示/搜索/分类 UI 也是空白。

现状：
1. **模板无法版本化**：模板修改后无版本历史，无法回滚，无法对比变更
2. **模板无分类/搜索**：团队成员无法快速找到合适模板，只能靠口头传递
3. **模板中心空白**：第一阶段目标用户"内部设计师"没有集中的模板发现入口

**为什么是现在**：C1 完成后模板有了独立身份，C4 紧接着做模板的版本管理和资产沉淀是自然的时序。先有模板，再管模板，最后让团队用起来。

---

## What Changes

- TemplateVersionRepository（模板版本管理）
- TemplateCenter UI（模板列表 + 分类 + 标签筛选 + 搜索）
- 模板版本历史面板（复用现有 VersionHistory UI 框架）
- 模板版本 Diff（复用现有 VersionDiff 组件）

---

## Capabilities

### New Capabilities

- `template-versioning`: 模板的版本生命周期管理
- `template-center`: 模板的分类/标签/搜索展示

### Modified Capabilities

- 无

---

## Impact

- **受影响文件**: `apps/dev-tool/` 新增/扩展模板版本和模板中心相关文件
- **依赖方**: C1（完成后模板才有身份可做版本管理）
- **向后兼容**: 完全向后兼容，仅新增功能

---

## Out of Scope

- 模板分享/权限（→ C5 基础权限）
- 模板市场/付费（→ P2）

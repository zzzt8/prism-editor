# Changelog — prism-c2-publish-protocol

归档时间：2026-04-17
状态：archived

## 变更摘要

本次归档涉及以下代码变更：

| 文件 | 变更 |
|------|------|
| `apps/dev-tool/src/components/header/PublishDialog.tsx` | 增强参数可见性/控件类型/校验规则 UI |
| `apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts` | 实现 controlType 推断逻辑 |
| `apps/dev-tool/src/modules/editor/stores/publishSlice.ts` | 新增参数定义状态管理 |
| `apps/user-app/src/components/InputSection/index.tsx` | 实现 ParamControlRenderer |
| `apps/user-app/src/components/ParamsSection/index.tsx` | 参数控件渲染器 |
| `apps/user-app/src/utils/workflowImport.ts` | 发布物导入工具 |

涉及 layers：`editor`, `runtime`

## 关键决策

1. **PublishedParamDefinition 字段设计**：保留 `nodeId + paramId` 定位锚，新增 `controlType`、`options`、`defaultValue`、`validation`、`visibility` 字段
2. **控件类型推断逻辑**：从 `NodeDefinition.paramSchema` 自动推断 controlType，减少作者配置负担
3. **向后兼容**：新增 `paramDefinitions` 字段同时保留 `exposedParams`，旧数据降级处理

## README 同步建议

**当前 README 内容：**
> 发布态协议与参数模型：独立的 PublishedParamDefinition，支持来源映射/显示名/控件类型/默认值/校验/可见性

**Proposal Goal：**
> 将 `PublishedParamConfig` 升级为 `PublishedParamDefinition`，支持完整参数元信息；user-app 端按参数类型渲染控件，实现"非开发者也能跑链路"

**同步检查：**
- [x] README 是否准确反映本次 change 的核心目标？ — 是，简洁描述了核心能力
- [ ] 是否需要同步至总 README？ — 建议在项目总 README 的功能列表中添加"发布态参数模型"条目

## 归档元数据

- Git commit：`8c5c5e9`
- 涉及 layers：editor, runtime
- Tasks 完成数：7/7（所有任务 + 手工验收清单）

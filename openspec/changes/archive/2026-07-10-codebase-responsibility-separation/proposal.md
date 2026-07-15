# Proposal: Codebase Responsibility Separation

**change_class**: high
**reason**: 触及 store/node schema/engine 层，涉及跨包接口变更

---

## Why

当前代码库存在以下架构问题：

1. **上帝文件**：`useCanvasStore.ts`（1367行）承担了过多职责，Graph/Selection/Draft/Execution 状态混在一起，Live preview 订阅逻辑渗透其中
2. **业务逻辑渗透 UI**：图片处理（FileReader、Image 加载、canvas 操作）在 `PrismNodeControls.tsx` 中
3. **类型与规则耦合**：`PORT_COMPATIBILITY` 在 `shared-types` 中，而非独立的规则层
4. **页面直接依赖 Repository**：`HomePage.tsx` 直接 `new ProductTemplateRepository()`

## What Changes

### P0 重构
1. 拆分 `useCanvasStore.ts`：将 live preview 逻辑抽至 `livePreviewService.ts`
2. 去重 `PrismNodeControls.tsx`：抽取 `useImageFileProcessor` hook 和 `lib/imageUtils.ts`

### P1 重构
3. 封装 `HomePage.tsx`：添加 `useTemplates()` hook
4. 分离 `PORT_COMPATIBILITY`：移至 `packages/node-definitions/src/rules/`

## Capabilities

- Store 职责单一化，每个 service/slice 专注一个领域
- UI 组件只负责渲染，业务逻辑可独立测试
- 类型合同与产品规则分离
- 页面作为"总控"角色，只负责组装

## Impact

### 影响的包/模块
- `apps/dev-tool/src/store/`
- `apps/dev-tool/src/components/nodes/`
- `apps/dev-tool/src/pages/`
- `packages/shared-types/`

### 风险
- Store 重构可能影响现有 UI 组件（需要更新引用）
- 需确保 `livePreviewService` 与 `useCanvasStore` 的交互正确

## Out of Scope

- 不修改 `workflow-core` 核心执行逻辑
- 不修改 `node-definitions` 节点定义
- 不修改 `composer-sdk`（已符合职责分离原则）
- 不修改 server 层
- 不进行样式重构（内联样式问题暂不处理）

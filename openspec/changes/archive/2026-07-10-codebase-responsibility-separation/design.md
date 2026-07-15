# Design: Codebase Responsibility Separation

## Goals

1. **Store 单一职责**：`useCanvasStore.ts` 专注状态管理，live preview 逻辑抽离
2. **UI 组件纯净**：组件只负责渲染，图片处理逻辑下沉至 lib 层
3. **规则独立**：`PORT_COMPATIBILITY` 从 `shared-types` 移至 `node-definitions/rules/`

## Non-Goals

- 不修改执行引擎（workflow-core）
- 不修改节点定义（node-definitions 本体）
- 不做全量重构，保持渐进式改进

---

## Decisions

### D1: Live Preview Service 拆分

**问题**: `useCanvasStore.ts` 中 live preview 订阅逻辑（`_liveTimer`, `_liveSubscriptionTeardown`, 指纹计算等）与状态管理混在一起。

**候选方案**:

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 抽至独立 service | 创建 `livePreviewService.ts`，暴露 `subscribe()`, `unsubscribe()`, `triggerPreview()` | 职责清晰，易测试 | 需要传递 store 引用 |
| B. 使用 Middleware | Zustand middleware 模式 | 不破坏现有 API | 复杂度增加 |
| C. Hook 封装 | 创建 `useLivePreview()` hook | React 友好 | 可能引入闭包问题 |

**决策**: 方案 A — `livePreviewService.ts` 工厂函数模式

**理由**:
- 保持 Zustand store 作为唯一数据源
- Service 作为订阅层，不直接修改 store 状态
- 与现有的 `autosaveService.ts`, `executionService.ts` 模式一致

**接口设计**:
```typescript
interface LivePreviewService {
  subscribe: (store: CanvasStore) => () => void; // 返回取消订阅函数
  triggerPreview: () => void;
  isActive: () => boolean;
}
```

---

### D2: 图片处理逻辑抽离

**问题**: `PrismNodeControls.tsx` 中的 `processImageFile()`, `useExecutionThumbnail()`, `usePreviewImage()` 与 UI 组件耦合。

**候选方案**:

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| A. 抽至 `lib/imageUtils.ts` | 纯函数处理图片加载、缩略图生成 | 可独立测试 | 需要传递 canvas context |
| B. 抽至 hook `useImageProcessor` | 自定义 hook 封装状态 | React 友好 | hook 依赖 store |
| C. 两个都做 | hook 内部调用 lib 函数 | 最佳分离 | 工作量增加 |

**决策**: 方案 C — `lib/imageUtils.ts` + `useImageProcessor` hook

**理由**:
- `lib/imageUtils.ts`: 纯函数，便于单元测试和复用
- `useImageProcessor`: 处理 React 状态和副作用
- `LoadImageBody` 和 `LoadMaskBody` 可共享该 hook，仅传入类型参数

**接口设计**:
```typescript
// lib/imageUtils.ts
export function loadImageFile(file: File): Promise<ImageFileValue>;
export function createThumbnail(imageData: ImageData, maxSize: number): string;
export function extractPreviewUrl(result: unknown, key?: string): string | null;

// useImageProcessor.ts
export function useImageProcessor(nodeId: string, paramKey: string);
```

---

### D3: PORT_COMPATIBILITY 迁移

**问题**: `PORT_COMPATIBILITY` 定义在 `shared-types/src/port-types.ts`，与类型定义耦合。

**决策**: 移至 `packages/node-definitions/src/rules/port-compatibility.ts`

**理由**:
- `PORT_COMPATIBILITY` 是产品规则（哪些 port 类型可以连接），不是基础类型合同
- 未来可能需要动态修改兼容性规则，独立文件便于维护
- `shared-types` 应保持为"最小类型定义"，不含业务规则

---

### D4: HomePage Hook 封装

**问题**: `HomePage.tsx` 直接 `new ProductTemplateRepository()`。

**决策**: 创建 `useTemplates()` hook 封装数据访问

**接口设计**:
```typescript
// hooks/useTemplates.ts
export function useTemplates(): {
  templates: Template[];
  loading: boolean;
  error: Error | null;
  createTemplate: (name: string) => Promise<Template>;
};
```

---

## Architecture Review

### 目标架构

```
apps/dev-tool/src/
├── lib/                          [新增: 纯函数库]
│   └── imageUtils.ts              [图片处理]
├── hooks/                        [新增: 自定义 hooks]
│   ├── useTemplates.ts
│   └── useImageProcessor.ts
├── modules/editor/
│   ├── services/
│   │   ├── livePreviewService.ts [新增: live preview 逻辑]
│   │   ├── executionService.ts
│   │   └── autosaveService.ts
│   └── stores/
│       ├── canvasStoreHelpers.ts
│       └── slices/               [已存在]
└── components/nodes/
    └── PrismNodeControls.tsx     [简化后]
```

```
packages/
├── shared-types/src/
│   └── types/                    [仅类型定义]
└── node-definitions/src/
    ├── rules/                    [新增: 产品规则]
    │   └── port-compatibility.ts
    └── definitions.ts
```

### 迁移策略

1. **先新增，再重定向，最后删除**
   - 新增 `livePreviewService.ts`
   - 现有代码同时支持旧调用和新 service
   - 确认稳定后删除旧代码

2. **Store 引用保持兼容**
   - `useCanvasStore` 导出不变
   - 内部实现改为委托给 service

---

## Review Checklist

- [ ] Live preview 功能在重构后保持一致
- [ ] 图片上传/预览功能保持一致
- [ ] 所有 import 路径更新正确
- [ ] TypeScript 编译无错误
- [ ] 单元测试通过（如果存在）
- [ ] 手动验证 editor 页面加载正常

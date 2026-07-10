# Tasks: Codebase Responsibility Separation

## P0 Tasks

### T1: 拆分 useCanvasStore — Live Preview Service

- [x] **task_id**: T1
- **layer**: apps/dev-tool/src/store
- **description**: 将 live preview 逻辑从 `useCanvasStore.ts` 抽至 `livePreviewService.ts`
- **verify**: `pnpm typecheck`

```markdown
## T1: Live Preview Service 拆分

### Subtasks

#### T1.1: 创建 livePreviewService.ts

```typescript
// src/modules/editor/services/livePreviewService.ts

interface LivePreviewService {
  subscribe: (store: CanvasStore) => () => void;
  triggerPreview: () => void;
  isActive: () => boolean;
}

export function createLivePreviewService(): LivePreviewService;
export function getLivePreviewService(): LivePreviewService;
```

#### T1.2: 迁移 live preview 逻辑

从 `useCanvasStore.ts` 迁移以下内容：
- `_liveTimer` 状态
- `_liveSubscriptionTeardown` 状态
- `_pendingLiveResults` 状态
- `_lastNodesFingerprint` 状态
- `shouldFireLive()` 函数
- `armLiveTimer()` 函数
- `installLiveSubscription()` 函数
- `nodeExecFingerprint()` 函数
- `nodesExecFingerprint()` 函数

#### T1.3: 更新 useCanvasStore 初始化

```typescript
// useCanvasStore.ts 模块级
import { getLivePreviewService } from '../services/livePreviewService';

// store 初始化后
getLivePreviewService().subscribe(useCanvasStore);
```

#### T1.4: 导出兼容接口

保持 `useCanvasStore` 导出不变，现有组件无需修改 import。

**验收标准**:
- [ ] `pnpm typecheck` 通过
- [ ] Editor 页面加载正常
- [ ] 修改节点参数后 live preview 触发正常
```

---

### T2: PrismNodeControls 去重 — 图片处理逻辑

- [x] **task_id**: T2
- **layer**: apps/dev-tool/src/components
- **description**: 抽取图片处理逻辑至 lib 层
- **verify**: `pnpm typecheck && pnpm test`

```markdown
## T2: 图片处理逻辑去重

### Subtasks

#### T2.1: 创建 lib/imageUtils.ts

```typescript
// src/lib/imageUtils.ts

export interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

export function loadImageFile(file: File): Promise<ImageFileValue>;
export function createThumbnail(imageData: ImageData, maxSize: number): string;
export function createFullPreview(imageData: ImageData, maxSize: number): string;
export function extractPreviewUrl(result: unknown, key?: string): string | null;
```

#### T2.2: 创建 useImageProcessor hook

```typescript
// src/hooks/useImageProcessor.ts

export function useImageProcessor(
  nodeId: string,
  paramKey: 'imageFile' | 'maskFile',
  updateNodeParams: (id: string, params: Record<string, unknown>) => void
): {
  previewUrl: string | null;
  isDragOver: boolean;
  handlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
};
```

#### T2.3: 重构 LoadImageBody

```typescript
// 使用 useImageProcessor 重构
const { previewUrl, displayW, displayH, handlers } = useImageProcessor(
  id, 'imageFile', updateNodeParams
);
```

#### T2.4: 重构 LoadMaskBody

```typescript
// 使用 useImageProcessor 重构，传入 'maskFile'
const { previewUrl, displayW, displayH, handlers } = useImageProcessor(
  id, 'maskFile', updateNodeParams
);
```

#### T2.5: 删除重复代码

- 删除 `PrismNodeControls.tsx` 中的 `processImageFile()` 函数
- 删除 `useExecutionThumbnail()`（已由 `lib/imageUtils.ts` 替代）
- 删除 `usePreviewImage()`（已由 `lib/imageUtils.ts` 替代）

**验收标准**:
- [ ] `pnpm typecheck` 通过
- [ ] 图片上传功能正常
- [ ] 图片预览功能正常
- [ ] 拖拽替换功能正常
```

---

## P1 Tasks

### T3: HomePage Hook 封装

- [x] **task_id**: T3
- **layer**: apps/dev-tool/src/pages
- **description**: 封装 HomePage 数据访问
- **verify**: `pnpm typecheck`

```markdown
## T3: HomePage Hook 封装

### Subtasks

#### T3.1: 创建 useTemplates hook

```typescript
// src/hooks/useTemplates.ts

interface UseTemplatesResult {
  templates: Template[];
  loading: boolean;
  error: Error | null;
  createTemplate: (name: string, description?: string) => Promise<Template>;
}

export function useTemplates(): UseTemplatesResult;
```

#### T3.2: 重构 HomePage

```typescript
// HomePage.tsx
const { templates, loading, createTemplate } = useTemplates();

// 在按钮点击中
await createTemplate('New Template', '');
```

**验收标准**:
- [ ] `pnpm typecheck` 通过
- [ ] 模板列表加载正常
- [ ] 创建模板功能正常
```

---

### T4: PORT_COMPATIBILITY 架构确认

- [x] **task_id**: T4
- **layer**: packages/shared-types
- **description**: 确认 PORT_COMPATIBILITY 位置正确（shared-types），更新导出
- **verify**: `pnpm typecheck && pnpm build`

```markdown
## T4: PORT_COMPATIBILITY 架构确认

### 分析结果

检查结果：
- `node-definitions` 依赖 `shared-types`
- `shared-types` 不依赖 `node-definitions`
- `PORT_COMPATIBILITY` 已在 `shared-types` 正确位置

### 子任务

#### T4.1: 确认架构合理性

`PORT_COMPATIBILITY` 是**跨节点类型**的通用连接规则，属于 shared-types 的职责范围。
无需移动，保持现状。

#### T4.2: 更新导出

确认 `PORT_COMPATIBILITY` 从 `shared-types` 正确导出，供其他包使用。

**验收标准**:
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `canConnect()` 调用正常
```

---

## P2 Tasks

### T5: 更新 imports 和清理

- [x] **task_id**: T5
- **layer**: apps/dev-tool/src
- **description**: 确保所有 import 路径正确，删除无用导出
- **verify**: `pnpm typecheck && pnpm lint`

---

## 执行顺序

```
T1 (T1.1 → T1.2 → T1.3 → T1.4) → T2 (T2.1 → T2.2 → T2.3 → T2.4 → T2.5) → T3 → T4 → T5
```

**依赖关系**:
- T1 必须先完成（T2 依赖 T1 的 service 模式）
- T5 必须在最后执行（清理工作）

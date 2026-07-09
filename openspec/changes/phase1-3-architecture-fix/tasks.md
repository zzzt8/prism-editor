# Tasks: phase1-3-architecture-fix

## Phase 1 Core: image-ops 算法层统一

### T1.1 — 修复 nodejs/composite-executor 调用路径

**opsx-meta**:
```yaml
id: T1.1
layer: packages/image-ops/src/nodejs
verify:
  - typecheck
  - test:nodejs/composite-executor
```

将 `packages/image-ops/src/nodejs/composite-executor.ts` 的 import 从：
```typescript
import { compositeImages } from '../core/composite-math';
```
改为：
```typescript
import { compositeImages } from '../core/composite/composite';
```

验收：
- [ ] `npm run typecheck` 通过
- [ ] `packages/image-ops/src/nodejs/composite-executor.test.ts` 测试通过

---

### T1.2 — 修复 nodejs/transform-executor 调用路径

**opsx-meta**:
```yaml
id: T1.2
layer: packages/image-ops/src/nodejs
verify:
  - typecheck
  - test:nodejs/transform-executor
```

检查 `packages/image-ops/src/nodejs/transform-executor.ts` 是否调用 `core/transform/transform.ts`。

验收：
- [ ] `npm run typecheck` 通过
- [ ] `packages/image-ops/src/nodejs/transform-executor.test.ts` 测试通过（如存在）

---

### T1.3 — 修复 nodejs/apply-mask-executor 调用路径

**opsx-meta**:
```yaml
id: T1.3
layer: packages/image-ops/src/nodejs
verify:
  - typecheck
  - test:nodejs/apply-mask-executor
```

检查 `packages/image-ops/src/nodejs/apply-mask-executor.ts` 是否调用 `core/mask/mask.ts`。

验收：
- [ ] `npm run typecheck` 通过
- [ ] `packages/image-ops/src/nodejs/apply-mask-executor.test.ts` 测试通过（如存在）

---

### T1.4 — 补充 nodejs executor 单元测试

**opsx-meta**:
```yaml
id: T1.4
layer: packages/image-ops/src/nodejs
verify:
  - test:nodejs
```

为以下 executor 补充 Vitest 单元测试：
- `nodejs/composite-executor.test.ts`
- `nodejs/transform-executor.test.ts`
- `nodejs/apply-mask-executor.test.ts`

每个测试文件需包含：
- Happy path 测试
- 错误处理测试（缺少输入等）

验收：
- [ ] 所有 nodejs executor 测试通过
- [ ] 测试覆盖主要执行路径

---

## Phase 1 Core: 节点 platforms 配置

### T1.5 — 补充节点 definitions platforms 配置

**opsx-meta**:
```yaml
id: T1.5
layer: packages/node-definitions
verify:
  - typecheck
  - test:node-definitions
```

修改 `packages/node-definitions/src/definitions.ts`，将 7 个节点的 `platforms` 字段从 `['browser']` 改为 `['both']`：

```typescript
export const loadImageDefinition: NodeDefinition = {
  // ...
  platforms: ['both'],  // 从 ['browser'] 改为 ['both']
  // ...
};

export const loadMaskDefinition: NodeDefinition = {
  // ...
  platforms: ['both'],
  // ...
};

// 其余 5 个节点同样处理
```

验收：
- [ ] `npm run typecheck` 通过
- [ ] dev-tool 节点面板能按 targetPlatform 正确过滤

---

## Phase 1 Core: 旧实现清理

### T1.6 — 归档旧 composite-math.ts

**opsx-meta**:
```yaml
id: T1.6
layer: packages/image-ops/src/core
verify:
  - typecheck
  - grep:composite-math
```

1. 确认无其他 consumer 引用 `core/composite-math.ts`
2. 将其移动到 `packages/image-ops/src/core/_archive/composite-math-v1.ts`
3. 删除原文件

验收：
- [ ] `npm run typecheck` 通过
- [ ] `grep` 无引用 `composite-math`

---

## Phase 3: composer-sdk 集成 image-ops

### T3.1 — 重构 ComposerCanvas 使用 image-ops

**opsx-meta**:
```yaml
id: T3.1
layer: packages/composer-sdk
verify:
  - typecheck
  - test:composer-sdk
```

重构 `packages/composer-sdk/src/ComposerCanvas.tsx`：

1. Import image-ops browser executor
2. 在 `renderComposite()` 中调用 executor 执行合成
3. 将合成结果渲染到 canvas

```typescript
// 伪代码
import { compositeExecutor } from '@prism/image-ops/browser';

const renderComposite = useCallback(async () => {
  // 构建 inputs
  const inputs = {
    base: backgroundImageData,
    overlay: foregroundImageData,
  };
  
  // 调用 executor
  const result = await compositeExecutor(inputs, {
    blendMode: layer.blendMode,
    opacity: layer.opacity,
    // ...
  }, {});
  
  // 渲染到 canvas
  // ...
}, [layers, loadedImages]);
```

验收：
- [ ] `npm run typecheck` 通过
- [ ] ComposerCanvas 能正确渲染图层合成
- [ ] 叠加模式（normal/multiply/screen/overlay/soft-light）正确工作

---

### T3.2 — 补充 cross-platform 一致性测试

**opsx-meta**:
```yaml
id: T3.2
layer: packages/image-ops
verify:
  - test:image-ops:cross-platform
```

创建 `packages/image-ops/src/core/cross-platform-consistency.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { compositeImages } from './core/composite/composite';

describe('Cross-platform consistency', () => {
  it('browser and nodejs composite should produce identical results', async () => {
    // 1. 用 core/composite/composite.ts 执行
    const browserResult = compositeImages(baseData, overlayData, options);
    
    // 2. 用 sharp 执行（通过 nodejs executor）
    const nodejsResult = await compositeExecutor(inputs, params, {});
    
    // 3. Pixel-level diff
    expect(pixelDiff(browserResult.data, nodejsResult.image.data)).toBeLessThan(1);
  });
});
```

验收：
- [ ] cross-platform 一致性测试通过
- [ ] pixel diff < 1%（允许舍入误差）

---

## Phase 2: ProductTemplate Editor 完善

### T2.1 — 补全 ProductTemplate 编辑器 inputs tab

**opsx-meta**:
```yaml
id: T2.1
layer: apps/dev-tool
verify:
  - typecheck
```

补全 `apps/dev-tool/src/components/ProductTemplateEditor/` 中的 inputs tab：
- 渲染 inputs 配置表单
- 连接 ProductTemplateRepository 保存

验收：
- [ ] inputs tab 能正确渲染和保存 inputs 配置

---

### T2.2 — 补全 ProductTemplate 编辑器 bindings tab

**opsx-meta**:
```yaml
id: T2.2
layer: apps/dev-tool
verify:
  - typecheck
```

补全 `apps/dev-tool/src/components/ProductTemplateEditor/BindingsEditor.tsx`：
- 实现 FlowBinding 可视化编辑
- 连接 FlowRepository 绑定关系

验收：
- [ ] bindings tab 能正确渲染和保存绑定关系

---

### T2.3 — 补全 ProductTemplate 编辑器 assets tab

**opsx-meta**:
```yaml
id: T2.3
layer: apps/dev-tool
verify:
  - typecheck
```

补全 assets tab：
- 素材上传功能
- 素材列表管理

验收：
- [ ] assets tab 能正确上传和管理素材

---

## 质量门禁

### Q1 — 类型检查通过

```bash
npm run typecheck
```

验收：所有 9 个 packages typecheck 通过

---

### Q2 — 测试通过

```bash
npm run test -- -- --run
```

验收：所有测试通过，无 regression

---

### Q3 — lint 通过

```bash
npm run lint
```

验收：lint 无错误

---

## Summary

| ID | Task | Layer | Status |
|----|------|-------|--------|
| T1.1 | 修复 nodejs/composite-executor 调用 | image-ops/nodejs | ⬜ |
| T1.2 | 修复 nodejs/transform-executor 调用 | image-ops/nodejs | ⬜ |
| T1.3 | 修复 nodejs/apply-mask-executor 调用 | image-ops/nodejs | ⬜ |
| T1.4 | 补充 nodejs executor 单元测试 | image-ops/nodejs | ⬜ |
| T1.5 | 补充节点 platforms: ['both'] | node-definitions | ⬜ |
| T1.6 | 归档旧 composite-math.ts | image-ops/core | ⬜ |
| T3.1 | 重构 ComposerCanvas 使用 image-ops | composer-sdk | ⬜ |
| T3.2 | 补充 cross-platform 一致性测试 | image-ops | ⬜ |
| T2.1 | 补全 ProductTemplate inputs tab | dev-tool | ⬜ |
| T2.2 | 补全 ProductTemplate bindings tab | dev-tool | ⬜ |
| T2.3 | 补全 ProductTemplate assets tab | dev-tool | ⬜ |
| Q1 | 类型检查通过 | all | ⬜ |
| Q2 | 测试通过 | all | ⬜ |
| Q3 | lint 通过 | all | ⬜ |

**Total: 14 tasks**

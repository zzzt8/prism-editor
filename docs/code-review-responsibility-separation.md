# 代码审查报告：按"职责"拆代码

**审查日期**: 2026-07-10
**审查原则**: "不要按'页面'堆代码，要按'职责'拆代码"

---

## 1. Impact Map（分层概览）

```
prism-editor
├── packages/
│   ├── shared-types/      [合同层 - 类型定义]
│   ├── node-definitions/  [产品规则层 - 节点元信息]
│   ├── workflow-core/     [业务核心 - 执行引擎]
│   ├── composer-sdk/       [业务核心 - Composer 状态]
│   └── image-ops/         [算法层 - 图像操作]
├── apps/dev-tool/src/
│   ├── store/             [状态管理层]
│   ├── modules/
│   │   ├── editor/stores/ [编辑器状态]
│   │   ├── editor/services/[编辑器服务]
│   │   └── repositories/  [数据访问层]
│   ├── components/        [UI 组件层]
│   ├── pages/             [页面层]
│   └── storage/           [存储适配器]
└── server/src/
    ├── services/          [业务服务层]
    ├── routes/            [路由层]
    └── schemas/           [Schema 层]
```

---

## 2. 审查发现详情

### 2.1 ✅ shared-types — 类型合同层（部分合格）

**现状**:
- `workflow.ts`: 纯粹的数据结构定义 ✅
- `port-types.ts`: 包含 `PORT_COMPATIBILITY` 规则函数

**问题**:
```typescript
// port-types.ts:48-55 — 产品规则混入类型定义
export const PORT_COMPATIBILITY: Record<PortType, PortType[]> = {
  image:   ['image'],
  mask:    ['mask'],
  // ...
} as const;
```

**建议**: `PORT_COMPATIBILITY` 和 `canConnect()` 应移至 `lib/rules/` 或 `packages/node-definitions/src/rules/`

---

### 2.2 ✅ node-definitions — 产品规则层（职责清晰）

`definitions.ts` 定义的 7 个节点元信息（输入/输出/参数）单独管理，产品规则抽离良好。

---

### 2.3 ⚠️ HomePage.tsx — 职责渗透

```typescript
// HomePage.tsx:9 — 数据访问在 UI 层
const repo = new ProductTemplateRepository();

// HomePage.tsx:28-34 — 错误处理在 UI 层
try {
  const t = await repo.create(...);
  navigate(`/templates/${t.id}`);
} catch (e) {
  console.error(e);
}
```

**问题**:
1. 页面直接 `new ProductTemplateRepository()` — 违反依赖倒置
2. `try/catch` + `console.error` 在 UI 层
3. 内联样式散落

**建议**: 使用 hook 封装（如 `useTemplates()`）或 connect 模式

---

### 2.4 ⚠️ useCanvasStore.ts — 上帝文件（1367 行）

**问题**:
- Graph/Selection/Draft/Execution 状态混在一个 store
- Live preview 逻辑（定时器、指纹订阅）混入 store
- 模块级状态散布（`_currentLog`, `_liveTimer`, `_pendingLiveResults`）

**已有改进**: 已拆分 `executionSlice.ts`, `selectionSlice.ts`, `draftSlice.ts`

**剩余问题**: Live preview 订阅逻辑应抽至 `modules/editor/services/livePreviewService.ts`

---

### 2.5 ✅ workflow-core — 业务核心层（职责清晰）

`executor.ts` 专注执行编排，无 UI 代码。分层合理。

---

### 2.6 ✅ services/ — 服务层（职责清晰）

`executionService.ts` 和 `autosaveService.ts` 采用工厂模式，职责分离。

---

### 2.7 ✅ repositories/ & storage/ — 数据访问层（职责清晰）

适配器模式 + 接口抽象，支持 IndexedDB/API/JSON 文件切换。

---

### 2.8 ✅ WorkflowCanvas.tsx — 页面即组装者

注释清楚说明由哪些 hooks 组成，组件本身是"总控"。

---

### 2.9 ⚠️ PrismNodeControls.tsx — 代码重复 & 业务逻辑渗透

**问题 1: 代码重复**
- `LoadImageBody` 和 `LoadMaskBody` 几乎完全相同
- `useExecutionThumbnail` 和 `usePreviewImage` 逻辑重复

**问题 2: 业务逻辑在 UI 层**
- FileReader, Image 加载, canvas 操作在组件里
- `processImageFile()` 应该在 `lib/imageUtils.ts`

**建议**:
1. 抽取 `useImageFileProcessor()` hook
2. 抽取 `lib/imageUtils.ts` 处理图片加载和缩略图

---

### 2.10 ⚠️ server/app.ts — 路由与业务逻辑混合

```typescript
// app.ts:37-53 — 路由直接调用 service，错误处理也在路由层
fastify.post('/templates', async (request, reply) => {
  const parsed = CreateProductTemplateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({...});
  }
  try {
    const template = await create(parsed.data);
    return reply.status(201).send(template);
  } catch (err) {
    // 错误处理在路由层
  }
});
```

**建议**: 路由只负责参数解析和响应格式化，业务逻辑已正确抽至 `product-template-service.ts`

---

## 3. 总结：按"职责"评分

| 层次 | 包/模块 | 评分 | 说明 |
|------|---------|------|------|
| 合同 | shared-types | ⭐⭐⭐ | 类型定义清晰，规则混入 |
| 规则 | node-definitions | ⭐⭐⭐⭐ | 产品规则独立 |
| 核心 | workflow-core | ⭐⭐⭐⭐⭐ | 职责清晰 |
| 核心 | composer-sdk | ⭐⭐⭐⭐ | Store 设计良好 |
| 服务 | services/ | ⭐⭐⭐⭐⭐ | 工厂模式 |
| 数据 | repositories/ | ⭐⭐⭐⭐ | 适配器模式 |
| UI | WorkflowCanvas | ⭐⭐⭐⭐ | 总控角色 |
| UI | PrismNodeControls | ⭐⭐⭐ | 重复代码需抽离 |
| 页面 | HomePage | ⭐⭐⭐ | 需 hook 封装 |
| 页面 | useCanvasStore | ⭐⭐ | 上帝文件，需拆分 live preview |

---

## 4. 建议优先级

### P0（立即处理）
1. **useCanvasStore.ts 拆分**: 将 live preview 逻辑抽至 `livePreviewService.ts`
2. **PrismNodeControls.tsx 去重**: 抽取 `useImageFileProcessor` 和 `lib/imageUtils.ts`

### P1（下一迭代）
3. **HomePage.tsx**: 添加 `useTemplates()` hook
4. **shared-types**: 将 `PORT_COMPATIBILITY` 移至 `lib/rules/`

### P2（持续改进）
5. **server/app.ts**: 考虑使用 controller 层进一步分离路由和响应处理

---

## 5. 架构演进方向

```
当前状态                    目标状态
─────────────────────────────────────────────────────
页面直接 new Repo     →    页面用 hook
useCanvasStore 1367行 →    Store slices + services
组件内 canvas 操作   →    lib/imageUtils
PORT_COMPATIBILITY    →    lib/rules/port-rules.ts
类型+规则混在一起    →    types/ + rules/ + lib/
```

---

*待确认后启动 /opsx-propose 创建 change 进行重构*

# Tasks (BDD 示范格式)

> 此文件展示新规范格式。存量任务保留在下方「legacy」目录。
> 新任务使用此格式。

---

## 格式说明

### 任务类型标签

| 标签 | 含义 | 验证规则 |
|------|------|----------|
| `[CORE]` | 核心逻辑（执行器、工具函数、数据变换） | 强烈建议写测试，验证失败阻止继续 |
| `[BUGFIX]` | Bug 修复 | 必须有复现测试 |
| `[UI]` | UI 样式、布局、组件 | 不强制，人工验收 |
| `[AUTO]` | 自动验证任务 | 命令结果即验证结果 |
| `[EXPLORE]` | 探索性任务 | 跳过验证 |

### BDD 格式模板

```markdown
### X.Y 任务标题 [TYPE]

**GIVEN** <前置条件>
**WHEN** <触发动作>
**THEN** <预期结果>

**测试建议**：
```typescript
it('GIVEN <前置> WHEN <动作> THEN <结果>', () => { ... });
```

**验证命令**：`pnpm test -- {testFile}`
```

---

## 示范任务

### 节点包上传 API [CORE]

**GIVEN** 用户在 Dev Tool 中打开节点市场
**WHEN** 用户上传一个有效的节点包 JSON 文件
**THEN** 系统验证 manifest 格式，存储到数据库，返回创建的 NodePackage

**测试建议**：
```typescript
// server/src/routes/nodes.test.ts
describe('POST /api/nodes', () => {
  it('GIVEN 有效的 manifest JSON WHEN 上传 THEN 返回创建的节点包', async () => {
    const res = await api.post('/api/nodes').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'load-image',
      latestVersion: '1.0.0',
    });
  });

  it('GIVEN 无效的 manifest（缺少 required 字段）WHEN 上传 THEN 返回 400', async () => {
    const res = await api.post('/api/nodes').send(invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
```

**验证命令**：`pnpm test -- server/src/routes/nodes.test.ts`

---

### 节点包列表 API [CORE]

**GIVEN** 数据库中存在多个节点包
**WHEN** 用户访问 GET /api/nodes
**THEN** 返回分页结果，支持搜索、分类筛选

**测试建议**：
```typescript
// server/src/routes/nodes.test.ts
describe('GET /api/nodes', () => {
  it('GIVEN 多个节点包 WHEN 获取列表 THEN 返回分页结果', async () => {
    const res = await api.get('/api/nodes?page=1&limit=10');
    expect(res.body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: 10,
    });
  });

  it('GIVEN 数据库中有 "load-image" 节点 WHEN 搜索 "load" THEN 只返回匹配结果', async () => {
    const res = await api.get('/api/nodes?search=load');
    expect(res.body.data.every(n => n.name.includes('load'))).toBe(true);
  });
});
```

**验证命令**：`pnpm test -- server/src/routes/nodes.test.ts`

---

### Zod 验证 Schema [CORE]

**GIVEN** 节点包 manifest schema 定义
**WHEN** 传入不同格式的 manifest
**THEN** 正确验证并返回错误信息

**测试建议**：
```typescript
// server/src/schemas/node-package.test.ts
describe('uploadNodePackageSchema', () => {
  it('GIVEN 符合规范的 manifest WHEN 验证 THEN 通过', () => {
    const result = uploadNodePackageSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it('GIVEN name 为空 WHEN 验证 THEN 返回 name required 错误', () => {
    const result = uploadNodePackageSchema.safeParse({ ...validManifest, name: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['name']);
  });

  it('GIVEN version 格式错误 WHEN 验证 THEN 返回 version 格式错误', () => {
    const result = uploadNodePackageSchema.safeParse({ ...validManifest, version: 'invalid' });
    expect(result.success).toBe(false);
  });
});
```

**验证命令**：`pnpm test -- server/src/schemas/node-package.test.ts`

---

### 图像处理链路 - LoadImage → Transform [CORE]

**GIVEN** 用户在画布上创建 LoadImage → Transform 链路
**WHEN** 执行工作流
**THEN** 图片正确加载，Transform 应用缩放参数

**测试建议**：
```typescript
// packages/image-ops/src/executors/transform.test.ts
describe('Transform Executor', () => {
  it('GIVEN 1920x1080 图片和 scale=0.5 WHEN 执行 THEN 输出 960x540 图片', async () => {
    const input = createTestImageData(1920, 1080);
    const result = await executeTransform(input, { scale: 0.5 });
    expect(result.width).toBe(960);
    expect(result.height).toBe(540);
  });

  it('GIVEN 无效的 scale 值 (-1) WHEN 执行 THEN 抛出错误', async () => {
    await expect(executeTransform(testImage, { scale: -1 }))
      .rejects.toThrow('scale must be between 0 and 10');
  });
});
```

**验证命令**：`pnpm test -- packages/image-ops/src/executors/transform.test.ts`

---

### 图像处理链路 - Composite 合成 [CORE]

**GIVEN** 两个图片（底图 + 叠加图）
**WHEN** 通过 Composite 节点使用 blend=overlay 执行
**THEN** 正确合成两张图片

**测试建议**：
```typescript
// packages/image-ops/src/executors/composite.test.ts
describe('Composite Executor', () => {
  it('GIVEN 底图和叠加图 WHEN 使用 overlay 模式 THEN 正确混合', async () => {
    const base = createTestImageData(100, 100, [255, 0, 0, 255]); // 红色
    const overlay = createTestImageData(50, 50, [0, 0, 255, 128]); // 半透明蓝色
    const result = await executeComposite(base, overlay, { blendMode: 'overlay', opacity: 1 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });
});
```

**验证命令**：`pnpm test -- packages/image-ops/src/executors/composite.test.ts`

---

### 端口类型连线颜色 [UI]

**GIVEN** 用户在画布上创建 LoadImage → Transform 连线
**WHEN** 连线渲染
**THEN** image 类型连线显示蓝色（#3B82F6）

**人工验收清单**：
- [ ] image 类型连线为蓝色 #3B82F6
- [ ] mask 类型连线为绿色 #22C55E
- [ ] hover 时透明度提升
- [ ] hover 时 stroke-width 加粗

**风险等级**：低（UI 样式调整）
**验证方式**：人工验收

---

### PreviewImage 节点预览 [UI]

**GIVEN** LoadImage → PreviewImage 连线
**WHEN** 工作流执行完成
**THEN** PreviewImage 显示处理后的预览图

**人工验收清单**：
- [ ] 预览图正确显示
- [ ] 分辨率标签可见
- [ ] resize handle 可用
- [ ] 预览区按比例缩放

**风险等级**：低（UI 展示）
**验证方式**：人工验收

---

### Prisma Migration 验证 [CORE]

**GIVEN** Prisma schema 中定义了 NodePackage 模型
**WHEN** 运行 `npx prisma migrate dev`
**THEN** 迁移成功，数据库创建新表

**测试建议**：
```typescript
// server/prisma/migrate.test.ts
describe('Database Migration', () => {
  it('GIVEN 新增 NodePackage 模型 WHEN 运行迁移 THEN 表创建成功', async () => {
    // 检查表是否存在
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    expect(tables).toContainEqual({ table_name: 'NodePackage' });
    expect(tables).toContainEqual({ table_name: 'NodePackageVersion' });
  });
});
```

**验证命令**：`npx prisma migrate status`

---

### CI 回归测试 [AUTO]

**GIVEN** 代码库当前状态
**WHEN** 运行完整 CI 检查
**THEN** 所有检查通过

**验证命令**：
```bash
pnpm test
pnpm typecheck
pnpm build --filter @prism/dev-tool
pnpm build --filter @prism/user-app
```

**风险等级**：自动验证，无需人工干预

---

### BUGFIX 任务模板

> 以下是 BUGFIX 类型的标准格式示例

**GIVEN** 用户上传 PNG 图片后刷新页面
**WHEN** 缓存恢复，PreviewImage 尝试加载
**THEN** 正确显示缓存的图片，而不是显示空白

**必须先写复现测试**：
```typescript
// apps/dev-tool/src/components/PreviewImage.test.tsx
describe('PreviewImage Cache Recovery', () => {
  it('GIVEN 图片已缓存 WHEN 页面刷新后 THEN 正确恢复预览', async () => {
    // 1. 上传图片
    // 2. 刷新页面
    // 3. 验证预览恢复
  });
});
```

**验证命令**：`pnpm test -- src/components/PreviewImage.test.tsx`

---

## 新建 Change 模板

当创建新的 change 时，使用以下模板：

```markdown
# Tasks

## 格式说明

- `[CORE]` 核心逻辑 — 建议测试，失败阻止
- `[BUGFIX]` Bug 修复 — 必须复现测试
- `[UI]` UI/样式 — 人工验收
- `[AUTO]` 自动验证 — 命令即验证
- `[EXPLORE]` 探索性 — 跳过验证

---

## 1. <功能模块>

### 1.1 <子任务> [TYPE]

**GIVEN** <前置条件>
**WHEN** <触发动作>
**THEN** <预期结果>

**测试建议**：
```typescript
it('GIVEN <前置> WHEN <动作> THEN <结果>', () => { ... });
```

**验证命令**：`pnpm test -- {file}`
```

---

## 关联文件

- 旧格式任务：`legacy/tasks-legacy.md`
- 新建 change 时复制此模板

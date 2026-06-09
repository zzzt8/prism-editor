## Context

本设计针对项目全面扫描后发现的 7 个代码逻辑和安全问题。

涉及 packages: image-ops、workflow-core、user-app、server。

## Goals / Non-Goals

**Goals:**
- 修复 `exportExecutor` 硬编码参数问题，使 Export 节点支持用户配置的格式和质量
- 修复 `ParamsSection` React hooks 调用顺序违规
- 修复 JWT AccessToken 黑名单检查缺失的安全漏洞
- 修复 `transform.ts` 中 translateX/Y 参数被忽略的问题
- 修复 `published-executor.ts` 中 params 合并顺序与注释矛盾
- 修复 WorkerPool 中重复 push 和轮询索引 bug
- 修复 Content-Disposition 特殊字符过滤不完整

**Non-Goals:**
- 不修改任何 API 契约
- 不修改 Prisma schema
- 不修改 node definition schema
- 不修改 workflow JSON 格式
- 不添加新功能

## Decisions

### D1: exportExecutor 参数修复

直接修改 `exportImage` 调用，从 `_params` 读取用户配置。无新增类型，无新增函数。

**方案**: 读取 `params['format']`、`params['quality']`、`params['width']`、`params['height']`，转为正确类型后传给 `exportImage`。

### D2: ParamsSection hooks 修复

将 `useCallback` 移到条件返回之前。

**方案**: 在 `if (visibleFields.length === 0) return null` 之前声明 `useCallback`。

### D3: Auth AccessToken 黑名单

在 `authenticate` middleware 中添加 `isTokenBlacklisted` 检查。

**方案**: 复用已有的 `isTokenBlacklisted()` 函数，模式与 `/me` 端点一致。

### D4: transform translateX/Y

添加 `translateX` / `translateY` 到 `transformOptions`，并在 `transformImage` 中实现。

**方案**: 修改 `transformOptions` 对象 + 实现平移逻辑（使用 canvas translate）。

### D5: params 合并顺序

调整 spread 顺序，使 `_internalParams` 优先级最高。

**方案**: `{ ...params, ..._internalParams, ...exposedParams }`。

### D6: WorkerPool push + selectWorker

**push bug**: catch 块前添加守卫。
**selectWorker bug**: 删除循环体中的 `this.currentWorkerIndex++`。

### D7: Content-Disposition

使用更安全的文件名处理。

**方案**: 保留字母数字汉字，移除所有其他字符。

## Risks / Trade-offs

- **D1**: 用户可能传非法 format 值 → 加默认值回退
- **D2**: hooks 修复可能影响渲染时机 → 验证 React DevTools 无异常
- **D3**: 每次请求多一次 DB 查询 → 黑名单表小，索引有效

---

## Architecture Review（high）

### 目标

修复 7 个代码逻辑/安全 bug，确保：
1. Export 节点参数不再被忽略
2. React hooks 调用顺序正确
3. JWT 黑名单完整覆盖
4. Transform 节点平移参数生效
5. Published workflow params 锁定机制正确
6. WorkerPool 状态稳定
7. 文件名安全导出

### 约束

- 技术约束: TypeScript strict mode，不引入 `as any`
- 时间约束: 无
- 不变量: 所有修复必须向后兼容现有数据

### 候选方案

#### 方案 A（选择）

逐一修复每个 bug，不重构周边代码。

**Pros**: 风险小，每行改动可单独 review。
**Cons**: 改动分散。

#### 方案 B

重构 executor 参数读取方式，集中管理。

**Pros**: 统一。
**Cons**: 改动范围大，引入新风险。

选择方案 A。

### 决策

选择方案 A，逐一修复。对应 bug 的具体改动见 tasks.md。

### 回滚方案

每个 bug 修复对应一个 git commit，可单独 revert。

---

## Review Checklist

### 完整版（high）

- [x] 方案是否覆盖 proposal 中所有 goal？ 是
- [x] 是否存在更简单的替代方案？ 无，逐一修复已是最简
- [x] 最坏情况回退路径是什么？ git revert 单个 commit
- [x] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED？ 无
- [x] Layer 间是否有隐式依赖？ 无

---

## 质量合规性

本设计遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序：无改动
- 节点级错误隔离：exportExecutor 已有 try/catch，修复保留
- Cancellation 链路：无改动

### 不变量检查

- Node Registry：无新增 type，无变更
- API 契约：auth middleware 改动不改变接口，只改变内部行为

### 测试策略

- [x] 单元测试：`pnpm test --filter=@prism/workflow-core --run && pnpm test --filter=@prism/image-ops --run`
- [x] 集成测试：server 测试覆盖 auth middleware
- [x] 手工验收：浏览器中测试 Export/Transform 节点参数

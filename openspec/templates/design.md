# Design Template

> 每个 OpenSpec change 必须包含此文件。描述技术方案、数据流、文件影响。

---

## Goals

> 要实现的 3-5 个具体目标

1. <!-- goal 1 -->
2. <!-- goal 2 -->
3. <!-- goal 3 -->

## Non-Goals

> 明确不做的目标

- ~~<!-- goal 1 -->~~
- ~~<!-- goal 2 -->~~

---

## Decisions

### D1: 决策标题

**决策**: <!-- 决策内容 -->

**理由**:
- <!-- 理由 1 -->
- <!-- 理由 2 -->

### D2: 决策标题

**决策**: <!-- 决策内容 -->

**理由**:
- <!-- 理由 1 -->

---

## Architecture Review

### A1: 当前结构分析

```<!-- diagram or code showing current structure -->
```

**问题**:
- 问题 1
- 问题 2

### A2: 方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| 方案 A | ... | ... | ✅ |
| 方案 B | ... | ... | ❌ |

---

## Data Flow

```
<!-- ASCII diagram of data flow -->

用户操作
    ↓
组件 A
    ↓
模块 B
    ↓
API C
    ↓
存储
```

---

## File Changes

### 新增文件

| 文件 | 用途 |
|------|------|
| `packages/foo/src/new-file.ts` | 新增功能 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/bar/src/existing.ts` | 修改逻辑 |

### 删除文件

| 文件 | 删除原因 |
|------|----------|
| `packages/baz/src/old.ts` | 重构移除 |

---

## API Design

### 新增 API

```typescript
// 端点: POST /api/foo
// 请求:
interface FooRequest {
  name: string;
  value: number;
}

// 响应:
interface FooResponse {
  id: string;
  created: boolean;
}
```

### 修改 API

| 端点 | 修改内容 |
|------|----------|
| `GET /api/bar` | 增加 `include` 参数 |

---

## Error Handling

### 错误码

| 错误码 | 含义 | 用户提示 |
|--------|------|----------|
| `FOO_NOT_FOUND` | 资源不存在 | "找不到指定资源" |
| `FOO_INVALID` | 输入无效 | "请检查输入格式" |

### 错误边界

<!-- 错误如何被捕获和展示 -->

---

## State Management

### 状态定义

```typescript
// Zustand store 状态
interface FooState {
  items: Foo[];
  loading: boolean;
  error: string | null;
}
```

### 状态转换

```
idle → loading → success → idle
              → error → idle
```

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | <!-- --> | TypeScript 检查 |
| Core | <!-- --> | CI 无平台依赖 |
| Build | <!-- --> | 构建成功 |
| Test | <!-- --> | 测试通过 |
| Dev-tool | <!-- --> | 手动测试 |
| E2E | <!-- --> | Golden fixture |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| <!-- risk --> | 中 | 高 | <!-- --> |

---

## Quality Compliance

本设计遵循 [项目全局质量与交付规范](../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序: <!-- 是否改动 / 改动影响 -->
- 节点级错误隔离: <!-- executor 清单 / 错误处理方案 -->
- Cancellation 链路: <!-- 哪些节点参与取消 / signal 传递路径 -->

### 不变量检查

- Node Registry: <!-- 新增 type / 复用现有 -->
- API 契约: <!-- 是否涉及 schema 变更 / 向后兼容方案 -->

### 测试策略

- [ ] 单元测试: <!-- 拓扑排序 + cycle detection -->
- [ ] 集成测试: <!-- executor 报错 → 下游节点继续 -->
- [ ] 手工验收: <!-- 取消操作 → 结果保留验证 -->

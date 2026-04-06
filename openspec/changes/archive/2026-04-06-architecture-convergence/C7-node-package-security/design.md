# C7: 节点包安全边界

> 引用自 meta-change `architecture-convergence/design.md` 的拆分原则。

## 1. Source Policy

| Source Type | Trust Level | 执行方式 |
|-------------|-----------|---------|
| inline | **untrusted** | Worker + sandbox eval |
| url | **trusted** | Worker + fetch，URL 需在白名单 |
| package | **verified** | Worker + package registry 签名验证 |

## 2. 信任级别说明

- **untrusted**：代码可能有害，必须在 Worker 中执行，且不能用 eval 直接执行
- **trusted**：URL 已人工审核，但仍需在 Worker 中执行
- **verified**：package 已签名，可直接执行

## 3. 白名单配置

```typescript
interface SecurityConfig {
  allowedUrlPrefixes: string[];
  trustedPackageRegistries: string[];
  requireSignatures: boolean;
}
```

## 4. Worker 隔离

inline executor 不能在主线程执行，使用 Web Worker + Function 构造替代 eval。

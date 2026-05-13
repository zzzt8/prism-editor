---
name: c4-security-hardening
change_class: high
change_profile: medium
reason: "在 C1 鉴权基础上加固安全：rate limiting、token revocation、OSS 错误处理、安全配置默认值调整"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c4-security-hardening`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] C1 完成后才做 C4（C4 依赖 C1 的鉴权基础设施）

## Why

C1 修了 API 鉴权，但还有几个安全缺口：登录接口没有限流（可暴力破解）、登出后 token 没有作废（被盗后持续有效）、OSS 删除失败时静默忽略。

## What Changes

1. 登录接口加 rate limiting（同一 IP 5 分钟内最多 10 次登录尝试）
2. Token 登出时在内存黑名单记录 jti（TTL = token 剩余有效期）
3. Refresh token Cookie 加 `Secure` 标志
4. 生产构建下 `requireSignatures` 默认为 `true`
5. OSS `deleteFromOss` 失败时抛出错误而非静默忽略
6. `.env.example` 加生产环境安全配置注释

## Capabilities

### Modified Capabilities

- **Auth API**: 登录接口限流；Token 登出即时作废
- **Node Package Runtime**: 生产环境强制签名验证

## Impact

- server/src/routes/auth.ts
- server/src/services/oss.ts
- apps/user-app/src/modules/node-runtime/securityConfig.ts
- .env.example

## Out of Scope

- Admin 后台的 rate limiting 管理界面
- Token 黑名单的持久化（重启后清空，开发环境可接受）
- 完整的 CSP / CORS 配置（本只在 cookie flag 上小改）

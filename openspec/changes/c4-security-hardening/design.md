## Context

C1 完成了 API 鉴权，但认证层面还有缺口：
1. `/auth/login` 和 `/auth/register` 没有限流，可暴力破解
2. JWT 登出只是删了 cookie，服务端 token 仍然有效（如果被盗，在过期前仍可使用）
3. Refresh token cookie 在 dev 环境没有 `Secure` 标志
4. OSS 删除失败时静默成功，导致本地 DB 记录删了但 OSS 文件还在
5. Node package 签名验证在生产环境默认关闭

## Goals / Non-Goals

**Goals:**
- 登录接口防暴力破解
- Token 登出即时作废
- Cookie 安全标志完善
- OSS 删除错误正确处理
- 生产环境签名验证默认开启

**Non-Goals:**
- Admin 管理界面（限流配置 UI）
- Token 黑名单持久化
- Admin 权限体系

## Decisions

### 1: Rate Limiting 实现

使用 `@fastify/rate-limit`：对 `/auth/login` 和 `/auth/register` 单独配置 `max: 10`，时间窗口 `15 * 60 * 1000`（15 分钟）。

```ts
await fastify.register(rateLimit, {
  max: 10,
  timeWindow: '15 minutes',
  keyGenerator: (req) => req.ip,
});
```

### 2: Token 黑名单

在 auth 路由模块内维护一个 `Set<string>`（内存黑名单），记录已登出的 jti：
```ts
const tokenBlacklist = new Set<string>();
```

登出时：`tokenBlacklist.add(token.jti)`，设置 setTimeout 在 token 剩余有效期后自动删除。

中间件中检查：若 `tokenBlacklist.has(jti)` → 401。

### 3: Cookie Secure Flag

```ts
reply.setCookie(REFRESH_COOKIE_NAME, token, {
  // ...existing options...
  secure: process.env.NODE_ENV === 'production', // 已有的判断保留
});
```

### 4: OSS 删除错误处理

```ts
// 修复前：
} catch {
  // OSS not enabled or failed, ignore
}

// 修复后：
} catch (err) {
  fastify.log.error({ err }, 'OSS delete failed');
  if (config.enabled) {
    throw new Error(`OSS delete failed: ${err.message}`);
  }
}
```

### 5: 生产环境签名验证

```ts
// securityConfig.ts
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  // ...
  requireSignatures: process.env.NODE_ENV === 'production',
};
```

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 内存黑名单重启后丢失 | 高 | 重启后旧 token 仍有效 | 黑名单设计为最佳努力，安全感知的登出；持久化在二期考虑 |
| rate limit 误伤共享 IP 用户 | 中 | 用户被限流 | 使用 IP + userId 组合 key |
| NODE_ENV 判断不准确 | 低 | prod 没开启 Secure cookie | 在 .env.example 明确注释 |

**回滚方案**: `git revert` 所有文件

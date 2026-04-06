// SecurityConfig - 白名单和信任级别配置
// 定义节点包加载的安全策略

import type { NodePackageManifest } from '@prism/shared-types';

export type TrustLevel = 'untrusted' | 'trusted' | 'verified';

export interface SecurityConfig {
  // URL 白名单：只有以这些前缀开头的 URL 才能作为 executor 加载
  allowedUrlPrefixes: string[];
  // 可信的包注册源：只有这些注册源的包才能被加载
  trustedPackageRegistries: string[];
  // 是否要求 package 必须有签名
  requireSignatures: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  // 默认允许 localhost 和 https URLs（生产环境应缩小范围）
  allowedUrlPrefixes: ['https://', 'http://localhost'],
  // 默认信任空（生产环境应配置具体注册源）
  trustedPackageRegistries: [],
  // 默认不要求签名（生产环境应改为 true）
  requireSignatures: false,
};

export function isUrlAllowed(url: string, config: SecurityConfig): boolean {
  return config.allowedUrlPrefixes.some((prefix) => url.startsWith(prefix));
}

export function isRegistryTrusted(registry: string, config: SecurityConfig): boolean {
  return config.trustedPackageRegistries.some((trusted) => registry.startsWith(trusted));
}

// ─── Manifest 校验（T2）─────────────────────────────────────────────────────

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;

export function validateManifest(
  manifest: NodePackageManifest,
  config: SecurityConfig
): ManifestValidationResult {
  const errors: string[] = [];

  // 1. 版本格式校验
  if (!SEMVER_REGEX.test(manifest.version)) {
    errors.push(`Invalid semver version "${manifest.version}"`);
  }

  // 2. 空定义检查
  if (!manifest.definitions || manifest.definitions.length === 0) {
    errors.push('Package must have at least one node definition');
  }

  // 3. 空 executor 检查
  if (!manifest.executors || manifest.executors.length === 0) {
    errors.push('Package must have at least one executor');
  }

  // 4. executor 必须有有效 source
  for (const exec of manifest.executors) {
    if (!exec.source) {
      errors.push(`Executor "${exec.id}" has no source`);
      continue;
    }
    if (exec.source.type === 'url' && !isUrlAllowed(exec.source.url, config)) {
      errors.push(`Executor "${exec.id}" URL not in whitelist: ${exec.source.url}`);
    }
  }

  // 5. signature 校验（如果 requireSignatures 为 true）
  if (config.requireSignatures && !('signature' in manifest)) {
    errors.push('Package signature is required but not present');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
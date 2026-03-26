# CDN CORS 配置指南

> 本文档说明如何为阿里云 OSS、七牛云、又拍云配置 CORS 响应头，以支持 Prism Editor 跨域加载图片。

## 工作原理

Prism Editor 在加载图片时会使用 `fetch(url, { mode: 'cors' })` 发送预检请求，检查返回头中是否包含：

```
Access-Control-Allow-Origin: *          ← 允许所有来源（推荐）
```
或
```
Access-Control-Allow-Origin: https://your-app.com   ← 仅允许你的域名
```

如果响应头缺失或 origin 不匹配，编辑器会在 LoadImage 节点上显示 **跨域警告** ⚡，并拒绝加载图片（canvas 不会污染）。

---

## 阿里云 OSS（Alibaba Cloud OSS）

### 控制台路径

存储桶列表 → 选择存储桶 → **数据管理** → **权限管理** → **跨域设置**

### 跨域规则配置

| 字段 | 推荐值 |
|------|--------|
| **来源（AllowedOrigin）** | `*`（允许所有）或你的域名，如 `https://prism.yourapp.com` |
| **AllowedMethods** | `GET`, `HEAD` |
| **AllowedHeaders** | `*` |
| **ExposeHeaders** | `*` |
| **缓存时间（MaxAge）** | `86400`（秒，24小时） |

### 示例：允许所有来源（开发环境）

```
AllowedOrigins: *
AllowedMethods: GET, HEAD
AllowedHeaders: *
ExposeHeaders: Content-Length, Content-Type
MaxAgeSeconds: 86400
```

### 示例：仅允许特定域名（生产环境）

```
AllowedOrigins:
  - https://prism.yourapp.com
  - https://www.yourapp.com
AllowedMethods: GET, HEAD
AllowedHeaders: *
ExposeHeaders: Content-Length, Content-Type
MaxAgeSeconds: 86400
```

### SDK 方式（Node.js）

```javascript
import OSS from 'ali-oss';

const client = new OSS({
  bucket: 'your-bucket',
  // ...
});

// 设置跨域规则
await client.putCORSRule('your-bucket', [
  {
    allowedOrigin: '*',
    allowedMethod: 'GET, HEAD',
    allowedHeader: '*',
    exposeHeader: '*',
    maxAge: 86400,
  },
]);
```

---

## 七牛云（Qiniu Cloud）

### 控制台路径

**对象存储** → 选择存储空间 → **域名管理** → **跨域配置**

### 跨域规则配置

| 字段 | 推荐值 |
|------|--------|
| **来源** | `*` 或具体域名 |
| **操作方法** | `GET`, `HEAD` |
| **AllowedHeaders** | `*` |
| **MaxAge** | `86400` |

### SDK 方式（Node.js）

```javascript
import qiniu from 'qiniu';

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config();
const bucketManager = new qiniu.rs.BucketManager(mac, config);

// 设置跨域规则
const rules = [
  {
    origin: '*',
    methods: 'GET, HEAD',
    headers: '*',
    maxAge: 86400,
  },
];

await bucketManager.setCors(bucketName, rules);
```

---

## 又拍云（UPyun）

### 控制台路径

**云存储** → 选择服务 → **访问控制** → **CORS 跨域**

### 跨域规则配置

| 字段 | 推荐值 |
|------|--------|
| **来源** | `*` 或具体域名 |
| **AllowedMethods** | `GET`, `HEAD` |
| **AllowedHeaders** | `*` |
| **MaxAge** | `86400` |

### SDK 方式（Node.js）

```javascript
import formstream from 'multiparty';
import upyun from 'upyun';

// 注意：又拍云通过 API 设置 CORS 需要使用特定的 HTTP Header
const service = new upyun.Service(bucketName, username, password);

const headers = {
  'X-Origin-Accept': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};
```

> ⚠️ **又拍云**：部分版本的又拍云控制台不直接支持可视化配置 CORS，需要在**安全配置**或通过工单联系客服开启。

---

## 常见问题排查

### 问题：响应头里有 CORS，但仍然报错

**可能原因：**
- 域名协议不匹配（页面用 `https://`，但 CDN 配置了 `http://`）
- 图片通过 CDN 缓存了错误响应（清除 CDN 缓存）
- 存储桶绑定了多个域名，其中一个未配置 CORS

**排查步骤：**
```bash
# 检查响应头
curl -I -X OPTIONS -H "Origin: https://your-app.com" \
  -H "Access-Control-Request-Method: GET" \
  https://your-cdn.com/image.jpg
```

### 问题：DevTools 显示警告但图片仍能加载

**原因：** 你的图片 URL 与 DevTools 的 Origin 相同（同源），不触发 CORS 检查。
跨域警告仅在 `crossOrigin = 'anonymous'` 且 URL 跨域时才会出现。

### 问题：配置了 `*` 但仍失败

**原因：** 部分 CDN 不支持通配符 `*` 与某些认证模式组合。
**解决：** 确认图片不涉及用户凭证（Session Cookie），或显式列出允许的 origin。

---

## 验证方法

在浏览器 DevTools Console 中运行：

```javascript
// 测试单个 URL
fetch('https://your-cdn.com/image.jpg', { mode: 'cors' })
  .then(r => console.log('CORS OK:', r.headers.get('access-control-allow-origin')))
  .catch(e => console.error('CORS Failed:', e));
```

或查看 DevTools → Network → 找到图片请求 → 查看 Response Headers 中是否有 `Access-Control-Allow-Origin`。

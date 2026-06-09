---
name: ecc-api-design
description: 针对 API / schema / contract 类 task 的项目内 ECC lane，约束先定接口再改实现。
version: "1.0.0"
category: apply
tags:
  - ecc
  - api
  - backend
  - layer:backend
aliases:
  - /ecc-api-design
depends_on:
  - ecc-openspec-bridge
permissions:
  - file-write
verify:
  - typecheck
  - api-tests
---

## 适用范围

当 `opsx-meta.task_type` 为 `api-design` 时使用。

典型目标：
- `server/routes/*`
- `server/schemas/*`
- `server/db/*`
- `server/prisma/*`
- `packages/shared-types/*`
- repository / storage adapter / published workflow contract

## SOP

1. **先定 contract**
   - 读 task 描述、design.md、proposal.md
   - 明确 request / response / error shape
   - 确认兼容性：是否要保持旧字段、旧状态码、旧 schema 可读

2. **再定边界**
   - route 做 HTTP 边界、参数校验、状态码
   - repository / service 做数据访问与业务拼装
   - shared-types 做跨端 contract
   - 不把 UI 细节泄漏到 API 层

3. **最小实现**
   - 优先改 schema / types，再改 route / repository
   - 只动与当前 contract 直接相关的文件
   - 如果改动触发 runtime/editor 适配，拆成后续 task，不在当前 task 横向扩散

4. **验证顺序**
   - 先跑对应 package `typecheck`
   - 再跑 `api-tests` 或最小相关测试
   - 若无 API 测试，至少验证 shared-types 与 route schema 一致

## 产出要求

摘要中必须回答：
- contract 改了什么
- 是否保持兼容
- 哪些文件是 route/schema/types/repository
- 跑了哪些验证

## 禁止事项

- 不先改实现、后猜接口
- 不把 repository 细节泄露到 route 返回结构
- 不把 unrelated 数据迁移混入当前 task

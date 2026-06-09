---
name: ecc-build-error-resolver
description: 针对 typecheck / lint / build / CI 故障的项目内 ECC lane，要求按错误输出最小迭代修复。
version: "1.0.0"
category: debug
tags:
  - ecc
  - build
  - typecheck
  - ci
  - layer:meta
aliases:
  - /ecc-build-error-resolver
depends_on:
  - ecc-openspec-bridge
permissions:
  - file-write
verify:
  - typecheck
  - cli-output
---

## 适用范围

当 `opsx-meta.task_type` 为 `build-fix` 时使用。

典型目标：
- TypeScript 报错
- ESLint 失败
- package build 失败
- layer smoke / full verification 失败

## SOP

1. **先读错误，不先猜**
   - 记录首个真实失败点：文件、行号、错误类型
   - 区分编译错误、类型错误、测试启动错误、lint 规则错误

2. **判断 related / unrelated**
   - 失败位于本 task 改动文件或直接依赖链 → related
   - 完全无关路径 → unrelated，记录但不扩散处理
   - 不确定时先按 related 处理一轮

3. **最小修复**
   - 一次只改一组同因错误
   - 改完立即重跑最小命令
   - 不把“顺手优化”混进 build 修复

4. **重跑节奏**
   - 单文件 / 单 package 错误 → 先跑最小 typecheck / test
   - layer 级错误 → 重跑 layer smoke
   - full verify 错误 → 最后再回到 `pnpm typecheck && pnpm test --run`

5. **停止条件**
   - 连续 2 轮最小修复后仍无进展 → 停止并报告 blocker
   - unrelated 失败不阻断 archive，但要写入摘要

## 产出要求

摘要中必须回答：
- 首个失败点是什么
- 判定为 related 还是 unrelated
- 这轮改动修了哪一类错误
- 重跑了哪些命令，结果如何

## 禁止事项

- 不看错误直接大改
- 一轮修复混入多种无关问题
- 把 unrelated 老错误伪装成当前 task 已解决

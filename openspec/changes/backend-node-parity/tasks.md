# tasks: backend-node-parity

## 任务清单

- [x] **T1: empty-input-executor** — 生成空白画布
  - 创建 `packages/image-ops/src/nodejs/empty-input-executor.ts`
  - 实现：接收 width/height/backgroundColor 参数，输出 blank canvas base64
  - 验收：`pnpm test --filter=@prism/image-ops` 包含 empty-input 相关测试 PASS

- [x] **T2: load-image-executor** — 加载图片（URL/Path/Buffer）
  - 创建 `packages/image-ops/src/nodejs/load-image-executor.ts`
  - 实现：支持三种输入源，输出 ImageData
  - 验收：可处理任意尺寸图片，内存不溢出

- [x] **T3: load-mask-executor** — 加载遮罩
  - 创建 `packages/image-ops/src/nodejs/load-mask-executor.ts`
  - 实现：复用 load-image，输出类型为 mask
  - 验收：输出 mask 类型正确

- [x] **T4: apply-mask-executor** — 应用遮罩
  - 创建 `packages/image-ops/src/nodejs/apply-mask-executor.ts`
  - 实现：alpha/brightness/luminance 三种 mask 模式
  - 验收：三种模式输出与前端一致

- [x] **T5: transform-executor** — 图像变换（合并 crop）
  - 创建 `packages/image-ops/src/nodejs/transform-executor.ts`
  - 实现：translate/scale/rotate + 合并现有 crop 功能
  - 验收：与前端 transform 输出视觉一致

- [ ] **T6: 更新 nodejs/index.ts** — 导出新执行器
  - 添加所有新 executor 到 `nodeExecutors` map
  - 验收：`pnpm typecheck --filter=@prism/image-ops` 通过

- [ ] **T7: 集成测试** — 端到端验证
  - 使用 WorkflowExecutorNodeJs 执行完整 pipeline
  - 验收：前端相同配置，后端输出视觉一致

---

## 质量合规章节

| 检查项 | 标准 |
|--------|------|
| 类型安全 | 所有 executor 参数/返回值有 TypeScript 类型 |
| 错误处理 | 缺少输入/非法参数抛出明确错误 |
| 内存管理 | 大图处理用 stream，避免 Buffer 峰值过高 |
| 测试覆盖 | 至少覆盖 happy path + 边界条件 |

---

## 验证命令

```bash
# engine layer typecheck
pnpm typecheck --filter=@prism/workflow-core --filter=@prism/image-ops --filter=@prism/node-definitions

# engine layer test
pnpm test --filter=@prism/image-ops
```

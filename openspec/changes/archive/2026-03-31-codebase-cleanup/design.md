## Context

项目经过多轮迭代后，积累了一些结构性问题需要系统性清理。问题集中在以下几个维度：

1. **文件级问题**：Windows 路径大小写不敏感导致同一文件出现两个版本（正斜杠/反斜杠）
2. **职责混乱**：shared-types 名为"类型"包，实际还包含了 3 个 Zustand store
3. **类型系统冗余**：PortType 和 PortDataType 两套并存，CacheEntry 两处定义
4. **归档冲突**：OpenSpec 归档目录下存在与活跃目录同名的变更，内容可能不同步
5. **文件过大**：PrismNode、WorkflowCanvas、executors.ts 都超过 1000 行

这些问题不影响功能，但严重阻碍代码维护和新人理解项目结构。

## Goals / Non-Goals

**Goals:**
- 删除所有无用、重复、错误位置的文件
- 消除 shared-types 中的状态管理职责，使其回归纯类型包
- 统一或明确两套类型系统的边界
- 解决 OpenSpec 归档冲突
- 拆分超大文件但不引入过度设计

**Non-Goals:**
- 不改变任何功能逻辑或 API 契约
- 不重构状态管理方案（Zustand 本身没问题，只是放错了包）
- 不拆分管线（节点类型、executor 逻辑保持不变）
- 不引入新的抽象层级（保持简单，不做"防御性过度设计"）

## Decisions

### Decision 1: 删除 vs 保留 — 宁可激进删除，不要保守观望

**Choice**: 对于重复文件、错误文件（ui desgin、test-setup.ts 错误位置）、归档冲突目录，直接删除，不留备份。

**Rationale**: 重复文件是技术债务，留着只会继续造成混乱。test-setup.ts 错误编译进了 dist；归档冲突会导致未来维护时不知道哪个是权威版本。宁可删错了再从 git 恢复，也不要带着问题继续。

**Alternative considered — 全部保留观察**: 被否决，因为问题已经清晰，保留只会继续污染。

### Decision 2: shared-types stores 移入 dev-tool，不建新包

**Choice**: 将 `shared-types/src/stores/` 下的 3 个 store 直接复制到 `apps/dev-tool/src/store/`，然后从 shared-types 删除。

**Rationale**: 这 3 个 store 都是 dev-tool 专属的（canvasStore 操作 React Flow，workflowStore 操作用户工作流，executionStore 管理执行状态），没有任何其他包需要它们。专门建一个 `@prism/stores` 包是过度设计——dev-tool 自己的 store 就放在 dev-tool 里。

**Alternative considered — 建新包 `@prism/stores`**: 过度设计，只有 dev-tool 一个消费者。

**Alternative considered — 保持现状**: 违反单一职责，且污染了 types 包的使用者。

### Decision 3: PortType / PortDataType — 保留 PortDataType，逐步废弃 PortType

**Choice**: `PortType` 保持作为 `PortDataType` 的简写别名，内部统一使用 `PortDataType`。接口签名中已使用 `PortDataType` 的地方不变；`PortType` 仅保留在需要简短类型的内部场景（已知的 5 种）。

**Rationale**: 现有代码中 `PortDefinition.dataType: PortDataType` 和 `TypedPortRef.type: PortType` 并存是因为历史原因。完全废弃 `PortType` 需要改很多地方（TypedPortRef 及其消费者），且收益有限。更好的做法是让它们共存——PortDataType 是权威定义，PortType 是方便简写。

### Decision 4: CacheEntry — 扩展版留在 workflow-core，shared-types 中的删除

**Choice**: 从 `shared-types/src/execution.ts` 中删除 `CacheEntry` 定义，从 `workflow-core/src/cache.ts` 导出 `CacheEntry`。其他包如果需要，用 factory 函数从 workflow-core 获取。

**Rationale**: `CacheEntry` 的 `accessCount` 是 workflow-core 的 LRU 驱逐逻辑专用的，不应该定义在 shared-types 里。shared-types 中当初定义它是为了共享，但实际只有 workflow-core 自己用这个类型。

### Decision 5: executors.ts 拆分 — 按节点类型分文件

**Choice**: 将 `image-ops/src/executors.ts` 中的 6 个 executor 实现拆分到已存在的各自节点文件中（`load-image.ts`、`composite.ts`、`transform.ts`、`export-image.ts`、`apply-mask.ts`），主文件只做 re-export 聚合。

**Rationale**: executor 实现和节点类型逻辑本身是同一关注点，放在一起更内聚。现有的 `executors.ts` 是把所有 executor 堆在一起导致文件过大。

### Decision 6: PrismNode 拆分 — 按 UI 区域分组件

**Choice**: 将 PrismNode.tsx 按 UI 区域拆分为：
- `PrismNodeHeader.tsx` — 标题栏、折叠按钮、删除按钮
- `PrismNodePorts.tsx` — 输入/输出端口渲染
- `PrismNodeControls.tsx` — 参数控件渲染（Input、Slider、Select 等）
- `PrismNode.tsx` — 组合上述子组件

**Rationale**: 1213 行的组件里混合了渲染逻辑、状态逻辑、事件处理，按 UI 区域拆分是最自然的边界。

## Risks / Trade-offs

- **[Risk]** 删除 Windows 反斜杠路径文件时，如果它们确实有不同内容，会丢失修改。 → **Mitigation**：先对比内容，只删除完全相同的文件；对于内容不同的文件，统一用正斜杠路径版本

- **[Risk]** 移动 store 后，旧的 import 路径失效。 → **Mitigation**：由于是 package 内部移动，路径变化有限，逐个修正 import 即可

- **[Risk]** 拆分大文件时引入了错误的组件边界。 → **Mitigation**：按 UI 区域拆分是最稳定的边界，不需要理解业务逻辑就能判断

- **[Trade-off]** OpenSpec 归档删除后，如果以后需要参考历史设计，需要从 git 历史恢复。 → **Mitigation**：git 记录完整，可以随时恢复

## Migration Plan

### 阶段一（低风险）
1. 删除重复文件和错误文件（文件操作，无依赖）
2. 删除 OpenSpec 归档冲突目录
3. 运行 `pnpm build` 验证无破坏

### 阶段二（中风险）
4. 移动 Zustand store 到 dev-tool，更新所有 import 路径
5. 运行 `pnpm build` + `pnpm test` 验证

### 阶段三（需谨慎）
6. 统一 PortType / PortDataType 类型系统
7. 合并 CacheEntry 定义
8. 拆分 executors.ts、PrismNode.tsx

## Open Questions

~~`image-ops/test-setup.ts` 是否还有其他测试依赖它？如果测试框架（Vitest）有特殊要求，删除后测试是否能正常运行？~~
**已确认：不可删除！** `vitest.config.ts` 中 `setupFiles: ['./src/test-setup.ts']` 直接引用了该文件。**删除后 Vitest 无法初始化 canvas/ImageData/FileReader 等 Node.js polyfill，所有测试会失败。** 从清理清单移除。

~~`ui desgin/` 目录中是否有 git 没有追踪但确实有价值的代码？在删除前需要确认其内容。~~
**已确认：目录不存在。**

~~OpenSpec archive 中的 `specs/` 子目录是否包含独立的设计决策值得保留？~~
**已处理：4 个归档目录共 23 个 spec 文件全部平铺到归档根目录（重命名为 `<name>-spec.md`），空 specs/ 子目录已删除。**

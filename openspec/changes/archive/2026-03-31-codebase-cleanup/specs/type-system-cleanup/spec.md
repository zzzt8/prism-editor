## ADDED Requirements

### Requirement: PortType 和 PortDataType 统一
项目 SHALL 明确 PortType 和 PortDataType 两套类型系统的关系。

#### Scenario: PortType 作为 PortDataType 的别名
- **WHEN** 代码中需要简短类型标注（如内部工具函数）
- **THEN** 使用 `PortType` 作为 `PortDataType` 的子集别名：`type PortType = 'image' | 'mask' | 'number' | 'string' | 'boolean'`
- **AND** `PortDataType` 保持作为权威定义，包含 11 种完整类型

#### Scenario: TypedPortRef 使用 PortDataType
- **WHEN** `TypedPortRef` 接口定义 port 类型
- **THEN** 使用 `dataType: PortDataType` 而非 `type: PortType`
- **AND** 现有使用 `type: PortType` 的地方保持不变（向后兼容）

#### Scenario: 文档化类型映射关系
- **WHEN** 开发者需要理解两套系统的关系
- **THEN** 在 `shared-types/src/port-data-types.ts` 文件顶部添加注释，说明 PortType 是 PortDataType 的简写子集

### Requirement: CacheEntry 定义统一
项目 SHALL 删除 shared-types 中的 CacheEntry，保留 workflow-core 中的完整定义。

#### Scenario: CacheEntry 仅存在于 workflow-core
- **WHEN** `packages/workflow-core/src/cache.ts` 中的 `CacheEntry` 接口包含 `accessCount` 字段
- **THEN** 其他包不定义独立的 `CacheEntry`，需要时从 `@prism/workflow-core` 导入
- **AND** 从 `packages/shared-types/src/execution.ts` 中删除 `CacheEntry` 定义

#### Scenario: 共享类型使用 Pipeline 类型
- **WHEN** 多个包需要共享缓存相关类型（如 TTL 配置）
- **THEN** 在 `shared-types/src/execution.ts` 中定义精简的 `CacheConfig` 接口（不含 LRU 专用字段）
- **AND** `workflow-core/src/cache.ts` 中的 `CacheEntry` 扩展 `CacheConfig`

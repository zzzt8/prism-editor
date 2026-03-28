# Port Data Types - 实现任务列表

> **开发约束**
>
> 1. **每次 apply 最多选择 2-4 个小分支实现**，不要贪多
> 2. **按顺序逐项实现**，确保每项完成后进行测试
> 3. **测试不通过必须找出问题**，不要跳过或忽略错误
> 4. **通过后标记 `[x]`，失败后记录问题并修复**
>
> **测试策略**：
> - 类型定义完成后验证 TypeScript 编译
> - 转换器注册后编写单元测试
> - 执行引擎集成后进行集成测试

## 实施顺序建议

| 优先级 | 章节 | 说明 |
|--------|------|------|
| 1 | 1. PortDataType 枚举 | 类型基础 |
| 2 | 2. PipelineData 包装器 | 数据结构基础 |
| 3 | 3. 类型兼容性矩阵 | 校验规则基础 |
| 4 | 4. TypeConverterRegistry | 转换器框架 |
| 5 | 5. 内置转换器 | 常用转换 |
| 6 | 6. 执行引擎集成 | 引擎集成 |
| 7 | 7. 节点定义更新 | 更新现有节点 |

## 1. PortDataType 枚举与类型

- [x] 1.1 在 `packages/shared-types` 中定义 `PortDataType` 枚举
- [x] 1.2 定义 `DataMetadata` 接口
- [x] 1.3 导出类型到共享包
- [x] 1.4 验证 TypeScript 编译通过

## 2. PipelineData 标准化包装器

- [x] 2.1 定义 `PipelineData<T>` 泛型接口
- [x] 2.2 实现 `toPipeline()` 辅助函数
- [x] 2.3 实现 `isPipelineData()` 类型守卫函数
- [x] 2.4 导出 PipelineData 相关类型和函数
- [x] 2.5 编写单元测试

## 3. 类型兼容性矩阵

- [x] 3.1 定义 `TYPE_COMPATIBILITY` 类型兼容性矩阵
- [x] 3.2 实现 `canConnectByDataType()` 校验函数
- [x] 3.3 实现 `isCompatible()` 辅助函数
- [x] 3.4 编写兼容性测试用例
- [x] 3.5 验证所有类型对的兼容性规则

## 4. TypeConverterRegistry 转换器注册表

- [x] 4.1 定义 `TypeConverterFn` 接口
- [x] 4.2 创建 `TypeConverterRegistry` 类
- [x] 4.3 实现单例导出
- [x] 4.4 编写注册表单元测试

## 5. 内置转换器

- [x] 5.1 实现 `IMAGE → MASK` 转换器（提取 Alpha 通道）
- [x] 5.2 实现 `MASK → IMAGE` 转换器（灰度化）
- [x] 5.3 实现 `FILE → IMAGE` 转换器（加载图片）
- [x] 5.4 在 Registry 初始化时注册内置转换器
- [x] 5.5 编写转换器单元测试

## 6. 执行引擎集成

- [x] 6.1 在 `WorkflowExecutor` 中添加类型校验
- [x] 6.2 实现自动转换调用
- [x] 6.3 实现类型错误信息
- [x] 6.4 添加 Feature Flag 支持（dev/prod 模式）
- [x] 6.5 编写集成测试

## 7. 节点定义更新

- [x] 7.1 更新 `PortDefinition` 接口添加 `dataType` 字段
- [x] 7.2 更新 LoadImage 节点定义
- [x] 7.3 更新 Transform 节点定义
- [x] 7.4 更新 Composite 节点定义
- [x] 7.5 更新 Export 节点定义
- [x] 7.6 添加 dataType 默认推断逻辑

## 8. Dev Tool 集成

- [x] 8.1 在连线时显示类型提示
- [x] 8.2 不兼容连线时显示警告
- [x] 8.3 节点端口显示类型颜色标识
- [x] 8.4 编写 UI 集成测试

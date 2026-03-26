# Port Data Types - 技术设计方案

## Context

当前 Prism Editor 的节点端口结构定义为：

```typescript
interface PortDefinition {
  name: string;
  label: string;
  optional?: boolean;
}
```

但缺失了最关键的部分：**端口内部流转的数据类型**。这导致：

1. 插件可以输出任意类型的数据，下游节点无法预知
2. 引擎执行时才发现类型不匹配，调试困难
3. 缺乏统一的类型规范，插件开发无据可依

需要建立完整的端口数据类型系统，确保插件之间的数据流转类型安全。

## Goals / Non-Goals

**Goals:**
- 定义完整的 PortDataType 枚举，覆盖所有图像处理相关数据类型
- 设计 PipelineData 标准包装器，统一数据传递格式
- 建立类型兼容性矩阵，定义哪些类型可以互通
- 实现 TypeConverter 注册表，支持类型自动转换
- 在连线时进行类型校验，拒绝不兼容连接

**Non-Goals:**
- 不实现所有类型之间的转换（只实现必要的转换）
- 不实现复杂的类型推导系统
- 不实现 TypeScript 编译时类型检查（纯运行时）

## Decisions

### 1. PortDataType 枚举定义

**决策**：定义标准数据类型枚举

```typescript
enum PortDataType {
  // 媒体类型
  IMAGE = 'image',       // ImageData - 标准像素数据
  MASK = 'mask',         // ImageData (单通道) - Mask 数据
  VIDEO = 'video',       // HTMLVideoElement / 视频帧
  AUDIO = 'audio',       // 音频数据

  // 文件类型
  FILE = 'file',         // File / Blob - 原始文件
  JSON = 'json',         // JSON 对象

  // 标量类型
  STRING = 'string',     // 字符串
  NUMBER = 'number',     // 数值
  BOOLEAN = 'boolean',   // 布尔值

  // 特殊类型
  ANY = 'any',           // 任意类型（慎用）
  VOID = 'void',         // 无输出
}
```

**原因**：
- 枚举比字符串字面量更安全，TypeScript 编译期检查
- 覆盖了图像处理工作流的常见数据类型
- `ANY` 类型作为兼容性折中，`VOID` 用于无输出端口

**替代方案**：
- 使用字符串字面量联合类型：`type PortDataType = 'image' | 'mask' | ...`
  - 缺点：枚举更易扩展和添加方法
- 使用接口层次结构（ImagePort, MaskPort 等）
  - 过于复杂，增加继承层次

### 2. PipelineData 标准化包装器

**决策**：使用泛型包装器封装所有流转数据

```typescript
interface PipelineData<T = unknown> {
  readonly type: PortDataType;
  readonly data: T;
  readonly metadata: DataMetadata;
}

interface DataMetadata {
  readonly width?: number;      // 图像宽度
  readonly height?: number;     // 图像高度
  readonly channels?: number;   // 通道数
  readonly mimeType?: string;   // MIME 类型
  readonly timestamp?: number;  // 时间戳
  readonly sourceNodeId?: string;
}
```

**使用示例**：
```typescript
// LoadImage 节点输出
const output: PipelineData<ImageData> = {
  type: PortDataType.IMAGE,
  data: imageData,
  metadata: {
    width: imageData.width,
    height: imageData.height,
    channels: 4,
    mimeType: 'image/png',
  }
};

// Transform 节点接收 IMAGE 类型
async execute(
  inputs: { image: PipelineData<ImageData> },
  params: TransformParams,
  ctx: ExecutionContext
): Promise<{ image: PipelineData<ImageData> }> {
  // 直接访问 inputs.image.data
}
```

**原因**：
- 类型安全：`PipelineData<ImageData>` 明确告知数据类型
- 元信息丰富：包含尺寸、MIME 类型等，方便节点使用
- 可追溯：`sourceNodeId` 标记数据来源，便于调试
- 统一格式：所有节点使用相同的数据结构

**替代方案**：
- 直接传递裸数据（ImageData, Blob 等）
  - 缺点：丢失元信息，无法进行类型校验
- 使用 tagged union
  - 缺点：模式匹配复杂，不如对象直观

### 3. PortDefinition 扩展

**决策**：在现有 PortDefinition 中添加 dataType 字段

```typescript
interface PortDefinition {
  name: string;
  label: string;
  dataType: PortDataType;
  optional?: boolean;
  description?: string;
}
```

**类型推断默认值**：
```typescript
const DEFAULT_PORT_DATATYPE: Record<string, PortDataType> = {
  'image': PortDataType.IMAGE,
  'mask': PortDataType.MASK,
  'src': PortDataType.IMAGE,
  'dest': PortDataType.IMAGE,
};
```

**原因**：
- 向后兼容：现有代码可逐步迁移
- 类型推断：常见命名自动推断类型，减少样板代码

### 4. 类型兼容性矩阵

**决策**：定义严格的类型兼容性规则

```typescript
const TYPE_COMPATIBILITY: Record<PortDataType, PortDataType[]> = {
  // IMAGE 可接受
  [PortDataType.IMAGE]: [
    PortDataType.IMAGE,
    PortDataType.MASK,        // MASK 可作为 IMAGE 使用（灰度图）
    PortDataType.FILE,         // 文件需要 LoadImage 节点转换
  ],

  // MASK 只能接受
  [PortDataType.MASK]: [
    PortDataType.MASK,
    PortDataType.IMAGE,        // IMAGE 可降级为 MASK（取灰度）
  ],

  // 标量类型严格匹配
  [PortDataType.STRING]: [PortDataType.STRING],
  [PortDataType.NUMBER]: [PortDataType.NUMBER],
  [PortDataType.BOOLEAN]: [PortDataType.BOOLEAN],

  // 特殊类型
  [PortDataType.ANY]: Object.values(PortDataType),
  [PortDataType.VOID]: [],
  [PortDataType.FILE]: [PortDataType.FILE],
  [PortDataType.JSON]: [PortDataType.JSON],
};
```

**连线校验函数**：
```typescript
function canConnect(
  sourcePort: PortDefinition,
  targetPort: PortDefinition
): ConnectionResult {
  const compatible = TYPE_COMPATIBILITY[targetPort.dataType]
    .includes(sourcePort.dataType);

  if (!compatible) {
    return {
      valid: false,
      reason: `Cannot connect ${sourcePort.dataType} to ${targetPort.dataType}`,
    };
  }

  return { valid: true };
}
```

**原因**：
- 明确规则：开发者清楚哪些类型可以连接
- 严格控制：IMAGE → MASK 的降级需要显式处理
- 防止错误：运行前即可发现类型问题

### 5. TypeConverter 注册表

**决策**：实现类型转换器注册表

```typescript
interface TypeConverter<TFrom, TTo> {
  from: PortDataType;
  to: PortDataType;
  convert(data: PipelineData<TFrom>): PipelineData<TTo>;
}

class TypeConverterRegistry {
  private converters: Map<string, TypeConverter<any, any>> = new Map();

  register<TFrom, TTo>(converter: TypeConverter<TFrom, TTo>): void {
    const key = `${converter.from}->${converter.to}`;
    this.converters.set(key, converter);
  }

  canConvert(from: PortDataType, to: PortDataType): boolean {
    const key = `${from}->${to}`;
    return this.converters.has(key);
  }

  convert<TFrom, TTo>(
    data: PipelineData<TFrom>,
    to: PortDataType
  ): PipelineData<TTo> | null {
    const key = `${data.type}->${to}`;
    const converter = this.converters.get(key);
    return converter ? converter.convert(data) : null;
  }
}
```

**内置转换器**：
```typescript
// IMAGE -> MASK (提取 Alpha 通道)
const imageToMaskConverter: TypeConverter<ImageData, ImageData> = {
  from: PortDataType.IMAGE,
  to: PortDataType.MASK,
  convert(data) {
    const alphaData = extractAlphaChannel(data.data);
    return {
      type: PortDataType.MASK,
      data: new ImageData(alphaData, data.data.width, data.data.height),
      metadata: data.metadata,
    };
  },
};

// MASK -> IMAGE (灰度化)
const maskToImageConverter: TypeConverter<ImageData, ImageData> = {
  from: PortDataType.MASK,
  to: PortDataType.IMAGE,
  convert(data) {
    // 灰度图转 RGBA
  },
};

// FILE -> IMAGE (加载图片)
const fileToImageConverter: TypeConverter<File, ImageData> = {
  from: PortDataType.FILE,
  to: PortDataType.IMAGE,
  convert(data) {
    // 加载 File 为 ImageData
  },
};
```

**原因**：
- 可扩展：第三方插件可注册自己的转换器
- 显式转换：开发者知道何时进行类型转换
- 内置常用转换：减少重复代码

**替代方案**：
- 自动隐式转换
  - 缺点：难以追踪转换逻辑，调试困难
- 无转换器，要求严格类型匹配
  - 缺点：过于死板，用户体验差

### 6. 执行引擎类型校验

**决策**：在节点执行前校验输入类型

```typescript
class WorkflowExecutor {
  async executeNode(
    node: Node,
    inputs: Record<string, PipelineData<any>>,
    context: ExecutionContext
  ): Promise<Record<string, PipelineData<any>>> {
    const nodeDef = getNodeDefinition(node.type);

    // 校验所有输入端口
    for (const port of nodeDef.inputs) {
      const input = inputs[port.name];
      if (!input) {
        if (!port.optional) {
          throw new TypeError(`Missing required input: ${port.name}`);
        }
        continue;
      }

      // 类型兼容性检查
      if (!TYPE_COMPATIBILITY[port.dataType].includes(input.type)) {
        throw new TypeError(
          `Type mismatch for input '${port.name}': ` +
          `expected ${port.dataType}, got ${input.type}`
        );
      }
    }

    // 执行节点逻辑
    return await nodeDef.execute(inputs, node.params, context);
  }
}
```

**原因**：
- 防御性编程：执行前发现问题
- 清晰的错误信息：告知具体是哪个端口的类型问题

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 插件未声明 dataType | 旧插件可能不兼容 | 提供默认推断和警告 |
| 转换器循环依赖 | A→B→A 导致死循环 | 记录转换路径，检测循环 |
| 运行时类型检查性能 | 大量节点时校验耗时 | dev 模式详细检查，prod 模式简化 |
| PipelineData 样板代码 | 每个节点需要包装数据 | 提供 `toPipeline()` 辅助函数 |

## Migration Plan

1. **阶段一**：添加 PortDataType 枚举和 PipelineData 类型
2. **阶段二**：更新 PortDefinition，添加 dataType 字段
3. **阶段三**：实现 TypeConverterRegistry
4. **阶段四**：集成类型校验到执行引擎
5. **阶段五**：更新现有节点定义，补充 dataType
6. **阶段六**：dev-tool 连线时显示类型信息

**回滚策略**：通过 Feature Flag 控制类型检查启用，关闭后回退到无检查模式

## Open Questions

1. **第三方插件类型声明**：如何验证第三方插件的 dataType 声明正确性？
2. **动态类型**：某些节点输出类型取决于输入（如条件分支），如何处理？
3. **序列化支持**：PipelineData 是否需要支持 JSON 序列化？
4. **类型版本**：当 PortDataType 枚举扩展时，旧数据如何兼容？

## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | packages/workflow-core | <!-- 描述 --> |
| editor | apps/dev-tool | <!-- 描述 --> |
| runtime | apps/user-app | <!-- 描述 --> |
| backend | server/ | <!-- 描述 --> |
| ui-skin | packages/shared-ui | <!-- 描述 --> |

## 相关目录

```
affected/
├── packages/workflow-core/src/
├── apps/dev-tool/src/
├── apps/user-app/src/
├── server/src/
├── server/prisma/
└── packages/shared-ui/src/
```

## 关键模块

### 模块名称
- **位置**: `...`
- **职责**: ...
- **数据流**: ...
- **调用链**: ...

## 复用点

- 现有 executor 在 `packages/workflow-core/` 可复用
- shared-types 中定义的标准接口
- shared-ui 中的组件

## 现有问题

1. ...
2. ...

## Impact Summary

本次 change 影响：
- **新增依赖**: ...
- **破坏性变更**: ...
- **向后兼容**: ...

## 数据流变化

```
[Before]
...

[After]
...
```
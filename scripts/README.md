# Scripts

工具脚本目录，包含项目维护和开发辅助脚本。

## 目录结构

```
scripts/
├── validate-port-naming.ts       # 端口命名验证脚本
└── (未来可能的其他脚本)
```

## 脚本说明

### validate-port-naming.ts

端口命名验证脚本，用于检查节点定义的端口命名是否符合规范。

```bash
# 运行端口命名验证
pnpm ts-node scripts/validate-port-naming.ts

# 或使用 npx
npx ts-node scripts/validate-port-naming.ts
```

### 添加新脚本

1. 在 `scripts/` 目录创建 TypeScript 文件
2. 遵循 TypeScript 类型规范
3. 添加适当的错误处理和日志输出
4. 更新本 README 文件

## 示例：创建新脚本

```typescript
// scripts/example.ts
import { getNodeDefinitions } from '@prism/node-definitions';

async function main() {
  const nodes = getNodeDefinitions();
  console.log(`Found ${nodes.length} node definitions`);
  
  for (const node of nodes) {
    console.log(`- ${node.type}: ${node.label}`);
  }
}

main().catch(console.error);
```

## 相关资源

- [.cursor/](../.cursor/) - Cursor AI Agent Skills
- [openspec/](../openspec/) - 变更管理系统

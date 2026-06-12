# Design: E2E Verify Canvas Synthesis Pipeline

## Goals

- 验证 dev-tool → server → user-app 完整链路可正常工作
- 识别并修复发现的任何断点
- 建立可重复的 E2E 测试流程

## Non-Goals

- 不开发新功能
- 不改变现有接口
- 不做性能优化（除非明显阻塞）

---

## Architecture Review

### 当前架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                         完整执行链路                                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [dev-tool]  ── POST /api/published ──►  [server DB]                 │
│       │                                    │                            │
│       │                           GET /api/published/:id                │
│       │                                    │                           │
│       │                                    ▼                           │
│       │                           [user-app]                          │
│       │                                    │                           │
│       │                           POST /api/render/workflow           │
│       │                                    │                           │
│       │                                    ▼                           │
│       │                    ┌─────────────────────────────────┐        │
│       │                    │ WorkflowExecutorNodeJs           │        │
│       │                    │ • 使用 nodeExecutors (7个)       │        │
│       │                    │ • 不检查 platforms 字段          │        │
│       │                    └─────────────────────────────────┘        │
│       │                                    │                           │
│       │                                    ▼                           │
│       │                           返回合成结果 JSON                     │
│       │                                    │                           │
│       │                                    ▼                           │
│       │                    [user-app OutputSection]                   │
│       │                    显示合成后的图片                            │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 候选方案

#### 方案 A：端到端手动验证（推荐）

**做法**：按以下步骤手动验证每个环节

1. dev-tool 创建简单工作流（load-image → composite）
2. 调用 publish API
3. user-app 加载并执行
4. 观察结果

**优点**：
- 快速发现实际问题
- 不需要写测试代码
- 可以中途发现新问题

**缺点**：
- 无法自动化回归测试
- 依赖手动操作

#### 方案 B：写 E2E 测试用例

**做法**：用 Playwright 或类似工具写自动化 E2E 测试

**优点**：可自动化回归测试

**缺点**：如果链路不通，测试代码本身也可能有问题，定位困难

### 决策

采用**方案 A**：手动端到端验证，快速发现问题。

验证通过后，如果需要，可以补充方案 B 的自动化测试。

---

## Verification Checklist

- [ ] dev-tool 中创建简单工作流（load-image → composite）
- [ ] 工作流可以正常预览（前端执行）
- [ ] 工作流可以正常发布（调用 publish API）
- [ ] user-app 可以加载已发布工作流
- [ ] user-app 可以上传测试图片
- [ ] user-app 执行后可以看到合成结果
- [ ] 后端返回的数据格式与前端期望一致

---

## Test Workflow Definition

最小测试工作流：
```
[load-image:bg] ──┐
                  ├──► [composite] ──► [export]
[load-image:logo] ┘
```

参数配置：
- composite: blendMode=normal, opacity=1.0
- 其他参数默认

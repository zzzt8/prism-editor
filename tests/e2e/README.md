# Prism Editor E2E Tests

## 核心用户路径

本目录包含 Prism Editor 最核心的 3 条用户路径的端到端测试。

---

## 路径 1: 用户登录

### 用户目标

用户能够成功登录应用并访问工作流列表页面。

### 操作步骤

1. 访问登录页面 `/login`
2. 输入邮箱和密码
3. 点击 "Sign in" 按钮
4. 验证跳转到首页 `/`

### 断言标准

| 断言 | 预期结果 |
|------|----------|
| 页面标题/Logo 可见 | 登录页面加载成功 |
| 邮箱输入框存在 | 表单元素完整 |
| 密码输入框存在 | 表单元素完整 |
| 登录按钮可点击 | 按钮状态正常 |
| 登录成功跳转 | URL 变为 `/` |
| 工作流列表页面可见 | 首页渲染完成 |

### 失败截图/Trace

```
失败时输出:
- screenshot: tests/e2e/screenshots/login-<timestamp>.png
- trace: tests/e2e/traces/login-<timestamp>.zip
```

---

## 路径 2: 创建新工作流

### 用户目标

用户能够创建一个空白工作流并跳转到编辑器页面。

### 操作步骤

1. 在工作流列表页面点击 "New Workflow" 按钮
2. 选择 "New Blank Workflow" 卡片
3. 输入工作流名称
4. 选择目标平台（Frontend/Backend）
5. 点击 "Create Workflow" 按钮
6. 验证跳转到编辑器页面

### 断言标准

| 断言 | 预期结果 |
|------|----------|
| 新建按钮可见 | 页面加载成功 |
| Modal 打开 | 输入表单可见 |
| 工作流名称输入框存在 | 表单完整 |
| 目标平台选项存在 | 可选择 browser/nodejs |
| 创建按钮可用 | 名称非空时启用 |
| 跳转成功 | URL 变为 `/workflow/:id` |
| 编辑器画布可见 | 核心组件渲染 |

### 失败截图/Trace

```
失败时输出:
- screenshot: tests/e2e/screenshots/create-workflow-<timestamp>.png
- trace: tests/e2e/traces/create-workflow-<timestamp>.zip
```

---

## 路径 3: 打开并查看工作流详情

### 用户目标

用户能够从列表中打开一个已存在的工作流，并在编辑器中查看节点。

### 操作步骤

1. 确保工作流列表页面有至少一个工作流
2. 点击列表中的工作流项
3. 验证跳转至编辑器 `/workflow/:id`
4. 验证画布 (ReactFlow) 渲染
5. 验证左侧节点面板可见

### 断言标准

| 断言 | 预期结果 |
|------|----------|
| 工作流列表加载 | 页面显示工作流项 |
| 点击后跳转 | URL 包含 workflow id |
| 画布组件渲染 | ReactFlow 容器存在 |
| 节点面板可见 | 左侧面板加载 |
| 无 JS 错误 | 控制台无 Error 级别日志 |

### 失败截图/Trace

```
失败时输出:
- screenshot: tests/e2e/screenshots/open-workflow-<timestamp>.png
- trace: tests/e2e/traces/open-workflow-<timestamp>.zip
```

---

## 运行测试

### 前置条件

1. 安装依赖: `pnpm install`
2. 启动开发服务器: `pnpm dev`（后台运行）
3. 确保 `http://localhost:5173` 可访问

### 本地运行

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 运行单个测试文件
pnpm playwright test tests/e2e/login.spec.ts

# 运行并打开 UI
pnpm playwright test --ui

# 运行并生成 Trace
pnpm playwright test --trace on
```

### CI 运行（Headless）

```bash
# CI 中自动使用 headless 模式
pnpm test:e2e
```

### 查看报告

```bash
# 打开 HTML 报告
pnpm playwright show-report
```

---

## 测试配置

- 基础 URL: `http://localhost:5173`
- 超时: 30 秒
- 重试: 2 次
- 并行: 1（避免状态冲突）

---

## 故障排查

### 测试超时

增加超时时间或检查开发服务器是否正常运行。

### 元素未找到

使用 Playwright Inspector 检查选择器：
```bash
pnpm playwright test --debug
```

### 状态问题

测试间使用独立的浏览器上下文，确保隔离。

---

## 添加新测试

1. 在 `tests/e2e/` 创建 `.spec.ts` 文件
2. 使用 `test.describe()` 组织相关测试
3. 使用 `page.goto()` 导航到页面
4. 使用 `expect()` 进行断言
5. 使用 `test.beforeEach()` 设置通用状态

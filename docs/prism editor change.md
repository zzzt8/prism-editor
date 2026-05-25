# Prism 产品构建总控台

> 当前阶段目标：先不要急着继续写功能。先把 Prism 当作一个真实产品，从产品经理视角重新定义：它为什么存在、服务谁、解决什么问题、最小闭环是什么、技术护城河是什么、第一阶段应该怎么做。

---

## 0. 一句话定义

**Prism 是一个 Agent-assisted image workflow workspace。**

它不是单纯的节点编辑器，也不是普通的一句话修图工具，而是一个面向通用图像合成与图像处理的智能工作台：

- 用 **Canvas** 承载视觉结果
- 用 **Agent** 帮用户表达意图、生成方案、修改流程
- 用 **Workflow / Composition Document** 承载可复现的处理逻辑
- 用 **后端 Runtime** 负责最终渲染、模型 API 调用、任务队列与历史记录

更短的版本：

> **Prism 让用户用自然语言和可视化画布共同完成图像处理，并把每一次处理自动沉淀为可复现、可修改、可复用的工作流。**

---

## 1. 当前已知状态

### 已经有的东西

- 已经开发了一部分 Prism Editor
- 当前能力主要集中在 **前端图像合成**
- 已经有类似 dev-tool / user-app 的分离结构
- 已经有节点化、画布化、工作流化的基础探索
- 已经开始思考 Agent、Tool Use、Workflow IR、前后端渲染分工

### 当前最大问题

现在不是继续堆功能，而是要回答这些产品根问题：

1. Prism 最终到底是什么？
2. 它不是 ComfyUI、不是 Photoshop、不是一键 AI 修图工具，那它的独特点在哪里？
3. 用户第一次打开 Prism 应该看到什么？
4. 用户只处理一张图时，workflow 有没有意义？
5. Agent 到底是操作图片，还是操作 workflow？
6. dev-tool / user-app 是否应该长期分离？
7. 前端合成是否能产品化？
8. 最小闭环是什么？
9. 技术护城河是什么？
10. 第一阶段到底先做什么？

---

## 2. 产品判断记录

### 2.1 Prism 不应该以键帽或单一品类为核心

Prism 的主方向不是键帽制作，也不是某个垂直商品图工具。

Prism 的核心方向应该是：

- 通用图像合成
- 通用图像处理
- 图层、遮罩、局部编辑、合成、调色、导出
- Agent 辅助图像工作流构建
- 工作流复现与复用

键帽、电商图、海报图、角色图、产品图都只是应用场景，不应该定义 Prism 的边界。

---

### 2.2 Prism 不应该一开始做 ComfyUI 套壳

讨论过三种路线：

| 路线 | 判断 |
|---|---|
| 直接基于 ComfyUI 社区节点做产品层 | 容易被社区节点复杂性绑架 |
| 用 ComfyUI 基座，自己写 API-only 节点 | 比社区节点干净，但 ComfyUI 可能变成过重中间层 |
| 自研轻量 Prism Runtime，ComfyUI 作为可选 Adapter | 更符合 API-first 与产品化方向 |

阶段性判断：

> 如果所有模型都 API 化，Prism 不必把 ComfyUI 当核心底座。更合理的是先做自己的轻量 Prism Editor + Prism Runtime，把 ComfyUI 降级为未来可选兼容后端。

---

### 2.3 前端合成只能作为 MVP，不能作为最终产品化形态

前端适合：

- 画布交互
- 实时预览
- 拖拽、缩放、旋转
- 局部框选
- 简单图层调整
- 低分辨率即时反馈

后端必须负责：

- 高清最终渲染
- 批量任务
- API 模型调用
- 任务队列
- 中间结果存储
- 历史记录
- 成本统计
- 可复现导出

最终架构应该是：

> **前端实时预览 + 后端权威渲染 + API-first Workflow Runtime**

---

### 2.4 dev-tool / user-app 不应该长期割裂

现在的 dev-tool 和 user-app，本质上是：

- dev-tool = Studio / 作者模式
- user-app = Runner / 运行模式

但长期不应该是两个割裂系统。

更合理的是一个统一的 Prism Workspace：

- **Studio Mode**：完整编辑、工作流构建、节点检查
- **Run Mode**：简化运行、参数填写、结果交付
- **Agent Mode**：自然语言驱动、自动生成和修改流程

核心能力必须共用：

- Workflow IR
- Node Definition
- Runtime
- Asset System
- Renderer
- History
- Agent Context

---

### 2.5 Workflow 不应该强迫用户感知，但系统必须记录

对于单张图、一次性需求，显式 workflow 可能没有意义。

用户只想：

- 上传图片
- 圈选区域
- 输入需求
- 得到结果
- 下载

但系统内部应该自动记录：

- 原图
- 操作步骤
- mask
- 参数
- API 调用
- 中间结果
- 用户选择的版本
- 最终导出设置

结论：

> 用户不一定需要看到 workflow，但 Prism 必须始终保存 workflow / edit history / composition document。

---

## 3. 最终产品愿景

### 3.1 产品形态

Prism 应该是一个 **Canvas-first, Agent-assisted, Workflow-backed** 的图像处理工作台。

三层界面：

#### 第一层：Canvas / Stage

用户真正工作的地方。

能力：

- 上传素材
- 拖拽图层
- 调整位置
- 选择区域
- 查看合成效果
- 对比前后版本
- 继续修改

#### 第二层：Agent / Intent Panel

用户表达意图的入口。

能力：

- 理解自然语言需求
- 生成处理计划
- 自动填写参数
- 修改 workflow
- 根据用户反馈调整局部流程

#### 第三层：Workflow / Inspector

专业层，按需展开。

能力：

- 查看处理步骤
- 修改节点参数
- 查看中间结果
- 局部重跑
- 保存为流程
- 发布为简化工具

---

### 3.2 典型用户流程

#### 一次性图像处理

1. 用户上传一张图
2. 用户圈选区域或用文字描述
3. Agent 生成处理计划
4. 系统执行并生成多个版本
5. 用户选择满意版本
6. 用户下载或继续修改
7. 系统后台自动记录处理过程

#### 复杂图像合成

1. 用户上传前景图和背景图
2. 用户说：把主体放到背景里，比例自然，光影统一
3. Agent 生成工作流
4. 前端显示预览
5. 用户继续说：主体再小一点，背景暗一点
6. Agent 修改 workflow 参数
7. 后端高清渲染
8. 用户导出
9. 流程可保存为可复用工具

#### 复用流程

1. 用户打开历史项目
2. 选择“保存为流程”
3. 系统生成简化运行表单
4. 下次用户替换输入图片
5. 一键复用同样处理逻辑
6. 可批量运行或分享给团队

---

## 4. 核心用户与需求

### 4.1 第一阶段目标用户

不要一开始服务所有人。

第一阶段最适合服务：

> 有图像处理需求、懂一点图像概念、但不想每次都手动重复处理流程的人。

例如：

- AI 视觉工作流探索者
- 设计师 / 修图师 / 内容创作者
- 电商视觉人员
- 需要批量处理素材的小团队
- 会用 AI 工具，但不想深入 ComfyUI 节点的人

---

### 4.2 核心痛点

1. 一句话生图工具不可控，结果不可复现
2. ComfyUI 太重，节点复杂，普通用户难用
3. Photoshop 手动操作强，但流程难自动化
4. 现有 AI 修图工具大多只输出结果，不保留可编辑过程
5. 用户过几天想生成同款效果，很难复现
6. 团队内部很难把一次成功经验变成可复用流程
7. 前端预览和最终导出不一致会影响交付

---

### 4.3 Prism 要解决的问题

Prism 不是简单解决“生成一张图”。

它要解决的是：

> 用户如何把模糊的图像处理意图，变成可编辑、可执行、可复现、可复用的处理流程。

---

## 5. 技术护城河

### 5.1 核心护城河一句话

> **Prism 的核心护城河，是把模糊的图像处理意图，转译成可编辑、可执行、可复现、可评估的图像工作流，并让 Agent 能持续修改这个工作流。**

---

### 5.2 护城河优先级

#### 第一优先级：Workflow IR / Composition Document

Prism 的源文件不应该只是图片结果，而应该是一个结构化项目文档。

它保存：

- 素材
- 图层
- mask
- 操作步骤
- 参数
- 模型调用
- 中间结果
- 输出设置
- Agent 指令
- 历史版本

这是 Prism 的根基。

---

#### 第二优先级：Runtime 执行与可复现渲染

Prism 要能做到：

- 前端预览
- 后端高清渲染
- 局部重跑
- 失败重试
- 中间结果存储
- 导出结果可复现

---

#### 第三优先级：Agent 修改 Workflow

Agent 不应该只是生成图片，而应该能修改 workflow。

例如用户反馈：

- “人物太大了” → 修改 compose.scale
- “边缘太假” → 修改 mask feather / edge blend
- “背景太亮” → 修改 exposure / tone
- “导出比例不对” → 修改 export settings

这叫：

> Natural language feedback → Workflow diff

---

#### 第四优先级：图像结果 Eval

图像 Agent 最大难点是判断“结果好不好”。

Prism 需要逐步建立评估系统：

- 输出尺寸是否正确
- mask 是否为空
- 透明通道是否保留
- 主体是否丢失
- 边缘是否脏
- 前景是否漂浮
- 色温是否冲突
- 阴影是否自然
- 是否有明显 AI 伪影

---

#### 第五优先级：过程数据沉淀

Prism 应该记录：

> 用户意图 → workflow → 中间结果 → 失败点 → 修复方式 → 最终选择

这比单纯结果图更有价值。

---

### 5.3 不是护城河的东西

这些重要，但不是核心壁垒：

- 好看的 UI
- 接很多模型 API
- 普通节点编辑器
- 固定模板库
- 单次出图效果
- 单纯前端 Canvas 合成

---

## 6. 最小闭环定义

### 6.1 最小闭环一句话

> 用户上传两张图，用 Agent 完成一次图像合成，系统自动生成可记录的 workflow，前端可预览，后端可导出，并能在用户反馈后修改一次流程参数。

---

### 6.2 MVP 场景选择

第一阶段不要做太多场景。

建议只做一个通用但足够代表 Prism 价值的场景：

> **主体合成到背景**

这是最适合验证 Prism 的场景，因为它天然包含：

- 前景图
- 背景图
- 抠图 / mask
- 图层合成
- 位置调整
- 边缘融合
- 色调匹配
- 导出
- workflow 记录
- 用户反馈修改

---

### 6.3 MVP 用户任务

用户输入：

> 把图一的主体合成到图二背景里，放在画面左侧，整体色调自然一点，导出 4:5。

系统应该完成：

1. 上传前景图
2. 上传背景图
3. 自动或半自动生成主体 mask
4. 将主体放到背景中
5. 支持前端拖拽调整位置和缩放
6. 支持简单边缘融合
7. 支持简单色调匹配
8. 生成 workflow 记录
9. 支持用户反馈：“主体小一点 / 边缘柔和一点 / 背景暗一点”
10. 支持导出结果图

---

### 6.4 MVP 不做什么

第一阶段明确不做：

- 不做复杂节点市场
- 不做 ComfyUI 兼容
- 不做大量模型接入
- 不做完整 Photoshop 能力
- 不做复杂多用户协作
- 不做高级图像 Eval
- 不做自由 Agent 任意搭节点
- 不做大量固定模板
- 不做本地模型运行
- 不做复杂插件系统

---

## 7. 第一阶段产品功能清单

### 7.1 必须有

#### 项目 / 素材

- 创建项目
- 上传前景图
- 上传背景图
- 素材列表
- 项目保存

#### Canvas

- 显示背景图
- 显示前景图层
- 拖拽移动
- 缩放
- 简单旋转
- 画布适配
- 前后对比

#### 合成能力

- 前景主体 mask
- 图层合成
- 边缘羽化
- 透明度
- 简单阴影
- 简单色调匹配

#### Agent

- 输入自然语言需求
- 生成结构化执行计划
- 将需求转换为 workflow 参数
- 根据反馈修改参数

#### Workflow / History

- 自动记录步骤
- 显示简化流程
- 中间结果缩略图
- 支持查看过程
- 支持保存为流程

#### Export

- 导出 PNG / JPG
- 设置输出比例
- 记录导出版本

---

### 7.2 可以后做

- 多版本生成
- 批量处理
- 团队共享
- 后端任务队列
- 高清渲染
- 复杂图像 Eval
- Provider Adapter
- 工作流复用 Runner
- ComfyUI Adapter
- 插件生态

---

## 8. 第一阶段技术架构草案

### 8.1 推荐架构

```text
Prism Frontend
- Canvas Preview Renderer
- Agent Panel
- Workflow Viewer
- Asset Panel
- Inspector

Prism Backend
- Workflow Runtime
- Asset Storage
- API Provider Adapter
- Final Renderer
- Task History

Workflow IR
- Project Document
- Nodes / Operations
- Assets
- Parameters
- Outputs
```

---

### 8.2 核心数据结构

#### Prism Project

```ts
type PrismProject = {
  id: string
  name: string
  assets: PrismAsset[]
  composition: CompositionDocument
  workflow: WorkflowDocument
  history: OperationHistory[]
  outputs: OutputVersion[]
}
```

#### Composition Document

```ts
type CompositionDocument = {
  canvas: {
    width: number
    height: number
    backgroundColor?: string
  }
  layers: CompositionLayer[]
}
```

#### Workflow Document

```ts
type WorkflowDocument = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  currentStep?: string
  status: 'idle' | 'running' | 'success' | 'failed'
}
```

#### Operation History

```ts
type OperationHistory = {
  id: string
  type: string
  userIntent?: string
  nodeId?: string
  before?: unknown
  after?: unknown
  createdAt: string
}
```

---

## 9. Notion 数据库设计

### 9.1 产品灵感库

用途：记录所有灵感、想法、类比、竞品观察。

字段：

- 标题
- 类型：灵感 / 类比 / 竞品 / 技术想法 / 用户痛点
- 来源
- 重要性：高 / 中 / 低
- 状态：未整理 / 已吸收 / 暂缓 / 放弃
- 关联模块
- 记录时间

示例：

- Cursor 不是从零做 IDE，Prism 也不一定要从零做一切
- Workflow 不一定给用户看，但必须被系统记录
- 图像 Agent 最大难点是 Eval，不是 Tool Use

---

### 9.2 产品判断库

用途：记录重大方向判断，避免反复摇摆。

字段：

- 判断标题
- 结论
- 背景
- 为什么这么判断
- 反对意见
- 当前可信度：高 / 中 / 低
- 是否需要复盘
- 更新时间

示例：

- Prism 不以 ComfyUI 为核心底座
- 前端合成只适合 MVP，不适合最终交付
- dev-tool / user-app 不应长期割裂
- Workflow 应该默认隐藏，按需显现

---

### 9.3 需求池

用途：记录用户需求与产品需求。

字段：

- 需求名称
- 需求类型：用户需求 / 系统需求 / 技术需求 / 商业需求
- 用户故事
- 重要性
- 紧急度
- 所属阶段：MVP / V1 / V2 / Long-term
- 状态：待确认 / 已确认 / 开发中 / 已完成 / 暂缓
- 验收标准

示例用户故事：

> 作为用户，我希望上传前景图和背景图后，可以用一句话说明合成需求，并得到可继续修改的结果，而不是每次重新生成。

---

### 9.4 功能模块库

用途：拆分产品模块。

字段：

- 模块名称
- 模块类型：前端 / 后端 / Agent / Runtime / UI / 数据
- 说明
- MVP 是否必须
- 依赖模块
- 当前状态
- 负责人
- 备注

核心模块：

- Asset Manager
- Canvas Renderer
- Composition Document
- Workflow IR
- Agent Intent Parser
- Workflow Viewer
- Preview Renderer
- Final Renderer
- Export Manager
- History System

---

### 9.5 任务看板

用途：真正执行。

字段：

- 任务名称
- 所属模块
- 优先级：P0 / P1 / P2
- 状态：Backlog / Todo / Doing / Review / Done
- 预计耗时
- 截止时间
- 验收标准
- 关联需求

---

### 9.6 技术债与风险库

用途：记录当前项目隐患。

字段：

- 风险标题
- 类型：架构 / 性能 / 数据 / UI / Agent / 部署 / 安全
- 严重程度
- 影响
- 解决方案
- 是否阻塞 MVP
- 状态

当前风险：

- dev-tool 与 user-app 数据割裂
- 前端合成无法支撑高清交付
- Workflow 数据结构不稳定
- Agent 没有可修改的结构化目标
- API Key 不能暴露在前端或 GitHub
- 没有后端任务历史

---

### 9.7 决策日志

用途：记录每一次重要产品决策。

字段：

- 日期
- 决策
- 背景
- 选项 A / B / C
- 最终选择
- 影响范围
- 未来复盘点

---

## 10. 第一阶段执行路线

### Phase 0：产品重定义

目标：把 Prism 从“已有代码项目”重新整理成“明确产品”。

任务：

- 写清产品定义
- 写清目标用户
- 写清核心场景
- 写清不做什么
- 写清 MVP 闭环
- 整理现有代码能力
- 标记哪些代码可保留，哪些只是实验

产出：

- 产品总纲
- MVP PRD
- 功能模块地图
- 技术债清单

---

### Phase 1：统一源文件模型

目标：定义 Prism Project / Composition Document / Workflow IR。

任务：

- 设计项目数据结构
- 设计图层数据结构
- 设计 workflow step 数据结构
- 设计历史记录结构
- 让前端状态不再只是 UI 状态，而是项目文档的一种呈现

产出：

- `PrismProject` 类型
- `CompositionDocument` 类型
- `WorkflowDocument` 类型
- 保存 / 加载项目能力

---

### Phase 2：Canvas-first MVP

目标：跑通一个主体合成到背景的最小体验。

任务：

- 上传两张图
- 前景图层显示
- 背景显示
- 拖拽缩放前景
- 支持 mask
- 支持边缘羽化
- 支持简单色调调整
- 支持导出

产出：

- 一个可演示的图像合成工作台

---

### Phase 3：隐形 Workflow 记录

目标：用户操作自动沉淀流程。

任务：

- 每次关键操作写入 history
- 自动生成简化 workflow steps
- 展示处理流程
- 支持查看中间结果
- 支持保存为流程

产出：

- Workflow Viewer
- Operation History

---

### Phase 4：Agent 参数修改

目标：Agent 不直接生成图，而是修改 workflow / composition 参数。

任务：

- 用户输入自然语言需求
- Agent 输出结构化计划
- 将计划映射为参数变化
- 支持反馈修改：主体小一点、边缘柔和一点、背景暗一点
- 记录 Agent 操作历史

产出：

- Agent Intent → Workflow Diff 的最小闭环

---

### Phase 5：后端 Runtime 雏形

目标：从纯前端合成升级到后端可复现导出。

任务：

- 建立后端项目接口
- 上传素材到后端
- 后端读取 composition document
- 后端生成最终图
- 返回导出结果
- 保存输出历史

产出：

- Preview Renderer + Final Renderer 分工

---

## 11. 本周应该先做什么

### 不要先做

- 不要继续堆新节点
- 不要先接很多模型
- 不要先做 ComfyUI 兼容
- 不要先做复杂 Agent
- 不要先重构所有 UI

### 先做这 5 件事

1. 在 Notion 建立 Prism 产品总控台
2. 整理当前代码已经有什么能力
3. 明确 MVP：主体合成到背景
4. 定义 PrismProject / CompositionDocument / WorkflowDocument
5. 把现有前端合成能力改造成“由项目文档驱动”

---

## 12. Notion 首页建议结构

```text
Prism Product HQ
│
├─ 00 产品总纲
│  ├─ 一句话定义
│  ├─ 产品愿景
│  ├─ 核心判断
│  ├─ MVP 闭环
│  └─ 不做什么
│
├─ 01 灵感与判断
│  ├─ 产品灵感库
│  ├─ 产品判断库
│  └─ 决策日志
│
├─ 02 用户与需求
│  ├─ 目标用户
│  ├─ 用户场景
│  ├─ 需求池
│  └─ 用户故事
│
├─ 03 产品设计
│  ├─ 信息架构
│  ├─ 核心流程
│  ├─ 页面原型
│  ├─ 交互规则
│  └─ 文案与术语
│
├─ 04 技术架构
│  ├─ Workflow IR
│  ├─ Composition Document
│  ├─ Runtime
│  ├─ Renderer
│  ├─ Agent Harness
│  └─ API Provider
│
├─ 05 MVP 执行
│  ├─ MVP PRD
│  ├─ 功能模块库
│  ├─ 任务看板
│  ├─ 验收标准
│  └─ 每周复盘
│
├─ 06 风险与技术债
│  ├─ 技术债清单
│  ├─ 产品风险
│  ├─ 安全风险
│  └─ 延后事项
│
└─ 07 资料归档
   ├─ 竞品资料
   ├─ 截图
   ├─ Prompt
   ├─ 参考项目
   └─ 历史方案
```

---

## 13. 当前最重要的产品原则

1. **画布优先，不是节点优先**
2. **Agent 操作 workflow，不是只生成图片**
3. **Workflow 默认隐藏，按需展开**
4. **一次性任务也要自动记录过程**
5. **前端负责预览，后端负责最终渲染**
6. **API Provider 可替换，不能绑定单一模型**
7. **先做最小闭环，不做大而全**
8. **先定义源文件，再继续堆功能**
9. **Prism 的资产是过程，不只是结果图**
10. **能被复现、修改、局部重跑，才是 Prism 和普通 AI 修图工具的区别**

---

## 14. 下一步要补的文档

- [ ] MVP PRD：主体合成到背景
- [ ] Prism Project 数据结构设计
- [ ] Workflow IR v0.1
- [ ] 前端 Preview Renderer 与后端 Final Renderer 分工
- [ ] Agent Intent → Workflow Diff 规则表
- [ ] 当前代码资产盘点
- [ ] 第一阶段任务看板

---

## 15. 当前版本结论

Prism 现在不应该继续按照“做一个节点编辑器”推进。

更好的方向是：

> **从当前已有的前端合成能力出发，先构建一个 Canvas-first 的图像处理工作台；用结构化 Project / Workflow 文档承载过程；再让 Agent 逐步具备生成、修改、解释 workflow 的能力。**

第一阶段不要追求大而全。

只需要证明一个闭环：

> **用户用一句话完成一次图像合成，系统不仅输出图，而且保存了可继续修改和复用的处理过程。**

这就是 Prism 的起点。



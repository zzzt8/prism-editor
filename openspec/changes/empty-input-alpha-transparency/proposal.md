---
name: empty-input-alpha-transparency
description: Empty Image 节点支持透明背景 + 节点内联控件
version: 1.1
date: 2026-04-15
type: change
status: planned
layer: engine
priority: P1
depends_on: []
---

# empty-input-alpha-transparency

> Empty Image 节点支持透明背景 + 节点内联控件

## Goal

1. 为 `Empty Input` 节点添加透明背景支持，扩展 `backgroundColor` 参数以接受 `rgba()` 格式
2. 在节点本体上内联显示 width / height / backgroundColor 控件，参考 ComfyUI EmptyImage 节点设计

## What Changes

**engine 层：**
1. 扩展 `parseColor()` 函数支持 `rgba()` 格式，解析 alpha 通道
2. 修改 `emptyInputExecutor` 使用解析出的 alpha 值，而非硬编码 255

**editor 层：**
3. 新增 `EmptyInputBody` 组件（内联控件）
4. 在 `PrismNode.tsx` 注册 `empty-input` 渲染分支

## Acceptance Criteria

**engine：**
- [ ] `rgba(r, g, b, a)` 格式正确解析，alpha 0-1 映射到 0-255
- [ ] `rgba(r, g, b, 0)` 生成全透明图像（alpha=0）
- [ ] `rgba(r, g, b, 1)` 生成完全不透明图像（alpha=255）
- [ ] `rgba(r, g, b, 0.5)` 生成 50% 透明图像
- [ ] 现有 hex 格式 `#ffffff` 继续工作，默认完全不透明
- [ ] 现有 rgb 格式 `rgb(r, g, b)` 继续工作，默认完全不透明
- [ ] 单元测试覆盖所有颜色格式

**editor：**
- [x] Width 输入框：数字输入，支持直接修改 ✅
- [x] Height 输入框：数字输入，支持直接修改 ✅
- [x] BackgroundColor 输入框：文本输入 + 颜色预览色块 ✅
- [x] 节点内联控件与右侧属性栏同步 ✅

## Constraints

- 暂不支持透明背景，background 默认白色（#FFFFFF）
- 颜色参数使用 string（支持 hex / rgb / rgba 字符串）
- 暂用 text input（不引入外部 color picker 依赖）

## Change Class

**high**

- 触及 engine 层（image-ops executor）
- 触及 editor 层（PrismNode UI）
- 涉及跨包接口（node-definitions → image-ops → shared-types）

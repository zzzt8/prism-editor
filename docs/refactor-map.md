# Refactor Map

> 项目级拆分缓存。每次完成一个 tile 拆分后，**只追加**新的块摘要，不修改历史块。
> 目的：让后续 AI / 人类改某一功能时，**先看本文件定位目标 tile**，再决定是否需要读源文件全文。

---

## 约定

- 块摘要按时间**倒序**追加（最新在最上）。
- 每完成一个 tile，立即追加一条 `## YYYY-MM-DD - Tile:` 块。
- 块摘要只描述：原文件、新文件、新文件职责、对外暴露、仍依赖它的位置、下次修改先看哪些文件。
- **不**修改历史块；如某 tile 需要重新拆，追加新块并在新块里指明 supersede。
- 所有 tile 拆分一律走 **Facade / Wrapper 外壳保留法**：旧文件继续 re-export 旧符号，新文件承接实现。

---

## 块摘要模板

每次追加 tile 时，复制下面模板并填实：

```markdown
## YYYY-MM-DD - Tile: <source>.<tile>

- 原文件：<path:line-range>
- 新文件：<path>
- 新文件职责：<一句话>
- 对外暴露：<symbol list>
- 仍依赖它的位置：<path list>
- 下次修改该功能先看：
  - <new file path>
  - <refactored source path>
- 父 change：<parent change name>
- 子 change：<child change name>
- ECC lane：<lane>
```

---

## 当前状态

- 暂无 tile 块摘要。
- 第一个 tile 完成后追加在下方。

---
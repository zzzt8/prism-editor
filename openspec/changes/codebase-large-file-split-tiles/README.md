# codebase-large-file-split-tiles

把项目里 6-12 个大文件按 tile 拆分，每个 tile 走 Facade/Wrapper 外壳保留法。子 change 分别为 A:UI 边缘、B:服务层、C:核心 store/worker。

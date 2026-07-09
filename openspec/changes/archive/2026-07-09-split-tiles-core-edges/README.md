# split-tiles-core-edges

核心 store/composer/worker 边缘 tile 拆分：拆出 workerPool.ts 的 sizing helper、ComposerCanvas.tsx 的 imageToImageData。不拆 useCanvasStore 核心 / 不拆 imageWorker mask/transform/export。Facade / Wrapper 外壳保留。

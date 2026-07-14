/**
 * M0 P0 Browser Spike Test Definitions.
 *
 * These checks are executed inside the Chromium page by spike-runner.ts via
 * page.evaluate. Each must return a structured result so the runner can
 * decide pass/fail without ambiguity.
 */

export interface SpikeCheck {
  readonly id: string;
  readonly description: string;
  readonly script: string;
}

export const SPIKE_CHECKS: ReadonlyArray<SpikeCheck> = [
  {
    id: 'chromium-userAgent',
    description: 'Reports real Chromium userAgent, not Node',
    script: `
      (() => {
        const ua = navigator.userAgent;
        return {
          ua,
          isChrome: /Chrome\\/[0-9]+/.test(ua),
          hasNode: /Node\\.js/.test(ua),
        };
      })()
    `,
  },
  {
    id: 'has-window-document',
    description: 'Real window and document exist',
    script: `
      (() => ({
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasHTMLCanvasElement: typeof HTMLCanvasElement !== 'undefined',
      }))()
    `,
  },
  {
    id: 'offscreencanvas-available',
    description: 'Native OffscreenCanvas is available',
    script: `
      (() => {
        try {
          const c = new OffscreenCanvas(10, 10);
          return { width: c.width, height: c.height };
        } catch (e) {
          return { error: String(e) };
        }
      })()
    `,
  },
  {
    id: 'no-canvas-npm-polyfill',
    description: 'canvas npm polyfill is NOT loaded',
    script: `
      (() => {
        // canvas npm injects a global createCanvas function; check it's absent.
        // @ts-ignore
        const hasCreateCanvas = typeof globalThis.createCanvas === 'function';
        // It also installs a Buffer global; check it's absent.
        const hasBuffer = typeof globalThis.Buffer === 'object' && globalThis.Buffer !== null;
        return { hasCreateCanvas, hasBuffer };
      })()
    `,
  },
  {
    id: 'no-test-setup-polyfill',
    description: 'test-setup.ts polyfills (FileReader stub) are NOT injected',
    script: `
      (() => {
        // Native FileReader includes '[native code]' in its toString output.
        const fileReaderStr = FileReader.toString();
        return { isNative: fileReaderStr.includes('[native code]') };
      })()
    `,
  },
  {
    id: 'minimal-identity-workflow',
    description: 'Minimal identity workflow produces non-empty ImageData',
    script: `
      (async () => {
        const fixtures = window.__M0_RUNTIME__;
        if (!fixtures) return { runtimeMissing: true };
        // Playwright's structured-clone serializer strips the Uint8ClampedArray
        // type tag across the evaluate boundary; native ImageData requires the
        // exact type. Coerce explicitly before constructing.
        const userImage = new ImageData(
          Uint8ClampedArray.from(fixtures.userImageBytes),
          fixtures.userImageWidth,
          fixtures.userImageHeight,
        );
        const result = await fixtures.runBrowserWorkflow(
          fixtures.scenarios[0],
          new ImageData(
            Uint8ClampedArray.from(fixtures.lShapedBaseBytes),
            fixtures.lShapedBaseWidth,
            fixtures.lShapedBaseHeight,
          ),
          userImage,
        );
        return {
          width: result.width,
          height: result.height,
          pngBytesLen: result.pngBytes.length,
          elapsedMs: result.elapsedMs,
        };
      })()
    `,
  },
];

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import sharp from 'sharp';

type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const renderRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/render/composite', async (request, reply) => {
    const body = request.body as {
      base: string;
      overlay?: string;
      blendMode?: BlendMode;
      opacity?: number;
      canvasWidth?: number;
      canvasHeight?: number;
      overlayX?: number;
      overlayY?: number;
    };

    if (!body.base) {
      return reply.status(400).send({ error: 'base (base64 image) is required' });
    }

    try {
      const baseBuffer = Buffer.from(body.base, 'base64');
      const baseSharp = sharp(baseBuffer);
      const baseMeta = await baseSharp.metadata();
      const baseRaw = await baseSharp.raw().toBuffer({ resolveWithObject: true });
      const baseData: ImageData = {
        width: baseMeta.width ?? 0,
        height: baseMeta.height ?? 0,
        data: new Uint8ClampedArray(baseRaw.data),
      };

      let result: ImageData;
      if (body.overlay) {
        const overlayBuffer = Buffer.from(body.overlay, 'base64');
        const overlaySharp = sharp(overlayBuffer);
        const overlayMeta = await overlaySharp.metadata();
        const overlayRaw = await overlaySharp.raw().toBuffer({ resolveWithObject: true });
        const overlayData: ImageData = {
          width: overlayMeta.width ?? 0,
          height: overlayMeta.height ?? 0,
          data: new Uint8ClampedArray(overlayRaw.data),
        };

        result = compositeImages(baseData, overlayData, {
          blendMode: body.blendMode ?? 'normal',
          opacity: body.opacity ?? 1,
          canvasWidth: body.canvasWidth,
          canvasHeight: body.canvasHeight,
          overlayX: body.overlayX ?? 0,
          overlayY: body.overlayY ?? 0,
        });
      } else {
        result = baseData;
      }

      const resultBuffer = await sharp(Buffer.from(result.data), {
        raw: { width: result.width, height: result.height, channels: 4 },
      }).png().toBuffer();

      const resultBase64 = resultBuffer.toString('base64');
      return {
        type: 'composite',
        image: {
          data: result,
          width: result.width,
          height: result.height,
          canvasWidth: result.width,
          canvasHeight: result.height,
          position: { x: 0, y: 0 },
          previewUrl: `data:image/png;base64,${resultBase64}`,
        },
        previewUrl: `data:image/png;base64,${resultBase64}`,
        width: result.width,
        height: result.height,
      };
    } catch (err) {
      request.log.error({ err }, 'Composite render failed');
      return reply.status(500).send({ error: 'Composite render failed', details: String(err) });
    }
  });
};

export default renderRoutes;

// ─── Minimal compositeImages implementation (mirrors core/composite-math.ts) ──

interface CompositeOptions {
  blendMode?: BlendMode;
  opacity?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  overlayX?: number;
  overlayY?: number;
}

function blendPixel(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
  mode: BlendMode
): [number, number, number] {
  const [br, bg, bb, _] = base;
  const [or, og, ob, oa] = overlay;
  const a = oa / 255;
  switch (mode) {
    case 'multiply':    return [Math.round((br * or) / 255), Math.round((bg * og) / 255), Math.round((bb * ob) / 255)];
    case 'screen':      return [Math.round(255 - ((255 - br) * (255 - or)) / 255), Math.round(255 - ((255 - bg) * (255 - og)) / 255), Math.round(255 - ((255 - bb) * (255 - ob)) / 255)];
    case 'overlay':     return [br < 128 ? Math.round(2 * br * or / 255) : Math.round(255 - 2 * (255 - br) * (255 - or) / 255), bg < 128 ? Math.round(2 * bg * og / 255) : Math.round(255 - 2 * (255 - bg) * (255 - og) / 255), bb < 128 ? Math.round(2 * bb * ob / 255) : Math.round(255 - 2 * (255 - bb) * (255 - ob) / 255)];
    case 'darken':      return [Math.min(br, or), Math.min(bg, og), Math.min(bb, ob)];
    case 'lighten':     return [Math.max(br, or), Math.max(bg, og), Math.max(bb, ob)];
    case 'color-dodge': return [Math.min(255, Math.round(br + (br * or) / (255 - or))), Math.min(255, Math.round(bg + (bg * og) / (255 - og))), Math.min(255, Math.round(bb + (bb * ob) / (255 - ob)))];
    case 'color-burn':  return [Math.max(0, Math.round(br - (br * (255 - or)) / or)), Math.max(0, Math.round(bg - (bg * (255 - og)) / og)), Math.max(0, Math.round(bb - (bb * (255 - ob)) / ob))];
    case 'hard-light':  return [or < 128 ? Math.round(2 * br * or / 255) : Math.round(255 - 2 * (255 - br) * (255 - or) / 255), og < 128 ? Math.round(2 * bg * og / 255) : Math.round(255 - 2 * (255 - bg) * (255 - og) / 255), ob < 128 ? Math.round(2 * bb * ob / 255) : Math.round(255 - 2 * (255 - bb) * (255 - ob) / 255)];
    case 'soft-light':  return [Math.round(br + (or / 255) * (2 * or - 255) * (1 - br / 255) * (br < 128 ? 1 : (br > 64 ? (4 - 2 * br / 255) : 0))), Math.round(bg + (og / 255) * (2 * og - 255) * (1 - bg / 255) * (bg < 128 ? 1 : (bg > 64 ? (4 - 2 * bg / 255) : 0))), Math.round(bb + (ob / 255) * (2 * ob - 255) * (1 - bb / 255) * (bb < 128 ? 1 : (bb > 64 ? (4 - 2 * bb / 255) : 0)))];
    case 'difference':  return [Math.abs(br - or), Math.abs(bg - og), Math.abs(bb - ob)];
    case 'exclusion':   return [Math.round(br + or - 2 * br * or / 255), Math.round(bg + og - 2 * bg * og / 255), Math.round(bb + ob - 2 * bb * ob / 255)];
    default:            return [or, og, ob];
  }
}

function compositePixel(
  base: [number, number, number, number],
  blended: [number, number, number],
  opacity: number
): [number, number, number, number] {
  const a = opacity * (base[3] / 255);
  return [
    Math.round(blended[0] * a + base[0] * (1 - a)),
    Math.round(blended[1] * a + base[1] * (1 - a)),
    Math.round(blended[2] * a + base[2] * (1 - a)),
    base[3],
  ];
}

function compositeImages(
  baseData: ImageData,
  overlayData: ImageData,
  options: CompositeOptions = {}
): ImageData {
  const {
    blendMode = 'normal',
    opacity = 1,
    canvasWidth = baseData.width,
    canvasHeight = baseData.height,
    overlayX = 0,
    overlayY = 0,
  } = options;

  const result = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);

  for (let y = 0; y < baseData.height; y++) {
    for (let x = 0; x < baseData.width; x++) {
      if (x >= canvasWidth || y >= canvasHeight) break;
      const dstIdx = (y * canvasWidth + x) * 4;
      const srcIdx = (y * baseData.width + x) * 4;
      result[dstIdx]     = baseData.data[srcIdx];
      result[dstIdx + 1] = baseData.data[srcIdx + 1];
      result[dstIdx + 2] = baseData.data[srcIdx + 2];
      result[dstIdx + 3] = baseData.data[srcIdx + 3];
    }
  }

  if (overlayX >= canvasWidth || overlayY >= canvasHeight) {
    return new ImageData(result, canvasWidth, canvasHeight) as unknown as ImageData;
  }

  const clippedW = Math.min(overlayData.width, canvasWidth - overlayX);
  const clippedH = Math.min(overlayData.height, canvasHeight - overlayY);
  if (clippedW <= 0 || clippedH <= 0) {
    return new ImageData(result, canvasWidth, canvasHeight) as unknown as ImageData;
  }

  for (let cy = 0; cy < clippedH; cy++) {
    for (let cx = 0; cx < clippedW; cx++) {
      const dstIdx = ((overlayY + cy) * canvasWidth + (overlayX + cx)) * 4;
      const ovIdx = (cy * overlayData.width + cx) * 4;

      const basePx: [number, number, number, number] = [
        result[dstIdx],
        result[dstIdx + 1],
        result[dstIdx + 2],
        result[dstIdx + 3],
      ];
      const ovPx: [number, number, number, number] = [
        overlayData.data[ovIdx],
        overlayData.data[ovIdx + 1],
        overlayData.data[ovIdx + 2],
        overlayData.data[ovIdx + 3],
      ];

      const blended = blendPixel(basePx, ovPx, blendMode);
      const [r, g, b, a] = compositePixel(basePx, blended, opacity);

      result[dstIdx]     = r;
      result[dstIdx + 1] = g;
      result[dstIdx + 2] = b;
      result[dstIdx + 3] = a;
    }
  }

  return new ImageData(result, canvasWidth, canvasHeight) as unknown as ImageData;
}

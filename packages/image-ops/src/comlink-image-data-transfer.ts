/**
 * Comlink transfer handler for ImageData — must be registered on BOTH
 * main thread and worker thread before any cross-boundary ImageData RPC.
 */
import * as Comlink from 'comlink';

let registered = false;

export function registerImageDataTransferHandler(): void {
  if (registered) return;
  registered = true;

  Comlink.transferHandlers.set('ID', {
    canHandle(obj: unknown): obj is ImageData {
      return obj instanceof ImageData;
    },
    serialize(obj: ImageData): [ImageData, ArrayBuffer[]] {
      return [obj, [obj.data.buffer]];
    },
    deserialize(obj: ImageData): ImageData {
      return obj;
    },
  });
}

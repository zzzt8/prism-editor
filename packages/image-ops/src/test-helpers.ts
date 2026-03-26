// Minimal ImageData factory — no browser/canvas dependency needed for testing
// pure pixel manipulation functions.
export function makeImageData(
  width: number,
  height: number,
  r = 0,
  g = 0,
  b = 0,
  a = 255
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, width, height);
}

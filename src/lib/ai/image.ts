/** Utilitas gambar bersama untuk alat AI (Hapus background & Upscale) */

export const fitWithin = (w: number, h: number, max: number) => {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
};

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement, type = "image/png", quality?: number) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), type, quality));
}

/** Gambar sumber → canvas berukuran tertentu (smoothing kualitas tinggi) */
export function drawScaled(src: CanvasImageSource, w: number, h: number) {
  const c = makeCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, w, h);
  return c;
}

/** Jeda satu frame supaya UI tetap responsif di antara langkah berat */
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const baseName =(n: string) => n.replace(/\.[a-z0-9]+$/i, "").replace(/[^\w-]+/g, "-").slice(0, 60) || "image";

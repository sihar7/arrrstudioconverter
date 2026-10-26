import type { InferenceSession } from "onnxruntime-web";
import { loadOrt } from "./runtime";
import { drawScaled, makeCanvas, nextFrame } from "./image";

const MASK_SIZE = 1024;

/** RGBA (canvas) → tensor float32 NCHW RGB 0–1 */
function toTensorData(px: Uint8ClampedArray, w: number, h: number) {
  const n = w * h;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    out[i] = px[i * 4] / 255;
    out[n + i] = px[i * 4 + 1] / 255;
    out[2 * n + i] = px[i * 4 + 2] / 255;
  }
  return out;
}

/**
 * Hapus background: mask alpha seukuran hasil (w×h). Model jalan di 1024², mask lalu diperhalus ke ukuran hasil.
 * Kembalikan canvas berisi putih dengan alpha = mask (siap dipakai `destination-in`).
 */
export async function predictMask(session: InferenceSession, src: CanvasImageSource, w: number, h: number) {
  const ort = await loadOrt();
  const small = drawScaled(src, MASK_SIZE, MASK_SIZE);
  const px = small.getContext("2d")!.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
  const input = new ort.Tensor("float32", toTensorData(px, MASK_SIZE, MASK_SIZE), [1, 3, MASK_SIZE, MASK_SIZE]);
  const out = await session.run({ [session.inputNames[0]]: input });
  const m = out[session.outputNames[0]].data as Float32Array;
  input.dispose();

  // Normalisasi min–max (keluaran ISNet tidak selalu persis 0–1)
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < m.length; i++) {
    if (m[i] < lo) lo = m[i];
    if (m[i] > hi) hi = m[i];
  }
  const span = hi - lo || 1;
  const mask = new ImageData(MASK_SIZE, MASK_SIZE);
  for (let i = 0; i < MASK_SIZE * MASK_SIZE; i++) {
    const a = ((m[i] - lo) / span) * 255;
    mask.data[i * 4] = mask.data[i * 4 + 1] = mask.data[i * 4 + 2] = 255;
    mask.data[i * 4 + 3] = a;
  }
  for (const k of Object.keys(out)) out[k].dispose();
  const mc = makeCanvas(MASK_SIZE, MASK_SIZE);
  mc.getContext("2d")!.putImageData(mask, 0, 0);
  return drawScaled(mc, w, h);
}

export type Background = { kind: "transparent" } | { kind: "color"; color: string } | { kind: "blur" };

/** Gabungkan foto + mask dengan latar pilihan (instan, tanpa menjalankan model lagi) */
export function composeCutout(src: CanvasImageSource, mask: HTMLCanvasElement, bg: Background) {
  const { width: w, height: h } = mask;
  const cut = drawScaled(src, w, h);
  const g = cut.getContext("2d")!;
  g.globalCompositeOperation = "destination-in";
  g.drawImage(mask, 0, 0);
  if (bg.kind === "transparent") return cut;

  const out = makeCanvas(w, h);
  const o = out.getContext("2d")!;
  if (bg.kind === "color") {
    o.fillStyle = bg.color;
    o.fillRect(0, 0, w, h);
  } else {
    // Latar = foto asli diburamkan (sedikit diperbesar supaya tepi blur tidak terlihat)
    o.filter = `blur(${Math.round(Math.max(w, h) / 60)}px)`;
    const pad = Math.max(w, h) * 0.04;
    o.drawImage(src, -pad, -pad, w + pad * 2, h + pad * 2);
    o.filter = "none";
  }
  o.drawImage(cut, 0, 0);
  return out;
}

const TILE = 192;
const PAD = 12;
const SCALE = 4;

/**
 * Upscale 4× per tile (dengan overlap PAD di tiap sisi → tanpa garis sambungan).
 * `scale` 2 = hasil 4× lalu diperkecil setengah (kualitas lebih baik daripada model 2× langsung).
 */
export async function upscaleImage(
  session: InferenceSession,
  src: HTMLCanvasElement,
  scale: 2 | 4,
  onProgress?: (p: number) => void,
  isCancelled?: () => boolean,
) {
  const ort = await loadOrt();
  const { width: W, height: H } = src;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  const out = makeCanvas(W * SCALE, H * SCALE);
  const octx = out.getContext("2d")!;
  const cols = Math.ceil(W / TILE);
  const rows = Math.ceil(H / TILE);
  let done = 0;

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (isCancelled?.()) throw new Error("cancelled");
      const x0 = tx * TILE;
      const y0 = ty * TILE;
      const tw = Math.min(TILE, W - x0);
      const th = Math.min(TILE, H - y0);
      // area dengan padding (dipotong di tepi gambar)
      const px0 = Math.max(0, x0 - PAD);
      const py0 = Math.max(0, y0 - PAD);
      const px1 = Math.min(W, x0 + tw + PAD);
      const py1 = Math.min(H, y0 + th + PAD);
      const pw = px1 - px0;
      const ph = py1 - py0;

      const data = sctx.getImageData(px0, py0, pw, ph).data;
      const input = new ort.Tensor("float32", toTensorData(data, pw, ph), [1, 3, ph, pw]);
      const res = await session.run({ [session.inputNames[0]]: input });
      input.dispose();
      const t = res[session.outputNames[0]];
      const o = t.data as Float32Array;
      const ow = pw * SCALE;
      const oh = ph * SCALE;
      const n = ow * oh;

      // Ambil bagian tengah (tanpa padding) ke kanvas hasil
      const cx = (x0 - px0) * SCALE;
      const cy = (y0 - py0) * SCALE;
      const cw = tw * SCALE;
      const ch = th * SCALE;
      const img = new ImageData(cw, ch);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const si = (cy + y) * ow + (cx + x);
          const di = (y * cw + x) * 4;
          img.data[di] = o[si] * 255;
          img.data[di + 1] = o[n + si] * 255;
          img.data[di + 2] = o[2 * n + si] * 255;
          img.data[di + 3] = 255;
        }
      }
      for (const k of Object.keys(res)) res[k].dispose();
      octx.putImageData(img, x0 * SCALE, y0 * SCALE);
      done++;
      onProgress?.(done / (rows * cols));
      await nextFrame();
    }
  }

  // Alpha asli (PNG transparan) diperbesar biasa lalu ditempel kembali
  const alpha = sctx.getImageData(0, 0, W, H).data;
  let hasAlpha = false;
  for (let i = 3; i < alpha.length; i += 4) {
    if (alpha[i] < 255) {
      hasAlpha = true;
      break;
    }
  }
  let result = out;
  if (hasAlpha) {
    const a = drawScaled(src, out.width, out.height);
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(a, 0, 0);
    octx.globalCompositeOperation = "source-over";
  }
  if (scale === 2) result = drawScaled(out, W * 2, H * 2);
  return result;
}

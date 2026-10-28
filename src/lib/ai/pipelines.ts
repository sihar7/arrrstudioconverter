import type { InferenceSession } from "onnxruntime-web";
import { loadOrt } from "./runtime";
import { drawScaled, fitWithin, makeCanvas, nextFrame } from "./image";
import { cleanAlpha, guidedFilter, luminance, mirror, normalize } from "./refine";

const MASK_SIZE = 1024;
/** Mode akurat: penyempurnaan tepi di resolusi hasil, maksimal sisi ini (guided filter ±1 dtk di 2048²) */
const REFINE_MAX = 2048;

/** Kualitas hapus background (plan imageAi "pro" = semua aktif) */
export interface MaskQuality {
  /** inferensi ganda (asli + cermin) lalu dirata-rata → mask lebih stabil di area ragu */
  tta: boolean;
  /** guided filter di resolusi hasil → tepi rambut/halus mengikuti foto asli */
  refine: boolean;
}

/** RGBA (canvas) → tensor float32 NCHW RGB 0–1; flip = cermin horizontal */
function toTensorData(px: Uint8ClampedArray, w: number, h: number, flip = false) {
  const n = w * h;
  const out = new Float32Array(3 * n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const s = (flip ? y * w + (w - 1 - x) : i) * 4;
      out[i] = px[s] / 255;
      out[n + i] = px[s + 1] / 255;
      out[2 * n + i] = px[s + 2] / 255;
    }
  }
  return out;
}

/** Satu inferensi model mask di 1024² → peta 0–1 (dinormalisasi) */
async function inferMask(session: InferenceSession, px: Uint8ClampedArray, flip: boolean) {
  const ort = await loadOrt();
  const input = new ort.Tensor("float32", toTensorData(px, MASK_SIZE, MASK_SIZE, flip), [1, 3, MASK_SIZE, MASK_SIZE]);
  const out = await session.run({ [session.inputNames[0]]: input });
  input.dispose();
  const m = normalize(out[session.outputNames[0]].data as Float32Array);
  for (const k of Object.keys(out)) out[k].dispose();
  return flip ? mirror(m, MASK_SIZE, MASK_SIZE) : m;
}

/** Peta alpha 0–1 → canvas putih dengan alpha tersebut */
function alphaCanvas(a: Float32Array, w: number, h: number) {
  const img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = a[i] * 255;
  }
  const c = makeCanvas(w, h);
  c.getContext("2d")!.putImageData(img, 0, 0);
  return c;
}

/**
 * Hapus background: mask alpha seukuran hasil (w×h). Model jalan di 1024², mask lalu diperhalus ke ukuran hasil.
 * Mode akurat: rata-rata inferensi asli + cermin, lalu guided filter 2× di resolusi hasil (maks 2048) dengan
 * foto asli sebagai panduan + pembersihan kabut tipis. Kembalikan canvas putih dengan alpha = mask (untuk `destination-in`).
 */
export async function predictMask(session: InferenceSession, src: CanvasImageSource, w: number, h: number, q: MaskQuality = { tta: false, refine: false }) {
  const small = drawScaled(src, MASK_SIZE, MASK_SIZE);
  const px = small.getContext("2d")!.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;
  const m = await inferMask(session, px, false);
  if (q.tta) {
    await nextFrame();
    const m2 = await inferMask(session, px, true);
    for (let i = 0; i < m.length; i++) m[i] = (m[i] + m2[i]) / 2;
  }
  const coarse = alphaCanvas(m, MASK_SIZE, MASK_SIZE);
  if (!q.refine) return drawScaled(coarse, w, h);

  // Penyempurnaan tepi di resolusi kerja (≤ 2048): radius mengikuti faktor perbesaran mask (buram ±4 px per 1×)
  await nextFrame();
  const rs = fitWithin(w, h, REFINE_MAX);
  const n = rs.w * rs.h;
  const up = drawScaled(coarse, rs.w, rs.h).getContext("2d")!.getImageData(0, 0, rs.w, rs.h).data;
  let alpha: Float32Array = new Float32Array(n);
  for (let i = 0; i < n; i++) alpha[i] = up[i * 4 + 3] / 255;
  const guide = luminance(drawScaled(src, rs.w, rs.h).getContext("2d")!.getImageData(0, 0, rs.w, rs.h).data, n);
  const r = Math.max(2, Math.round((4 * Math.max(rs.w, rs.h)) / MASK_SIZE));
  for (let it = 0; it < 2; it++) {
    alpha = guidedFilter(guide, alpha, rs.w, rs.h, r, 2e-4);
    await nextFrame();
  }
  const refined = alphaCanvas(cleanAlpha(alpha), rs.w, rs.h);
  return rs.w === w && rs.h === h ? refined : drawScaled(refined, w, h);
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
 * Upscale per tile dengan model 4× (overlap PAD di tiap sisi → tanpa garis sambungan).
 * `scale` 2 = tiap tile 4× lalu dirata-rata 2×2 SEBELUM ditempel (kualitas lebih baik daripada model 2× langsung,
 * dan kanvas antara 4× penuh tidak pernah dibuat — dulu 4096 px masukan butuh kanvas 16384², melewati batas browser).
 * `tta` (mode pro) = tiap tile juga diproses versi cermin lalu dirata-rata → artefak & noise model berkurang.
 */
export async function upscaleImage(
  session: InferenceSession,
  src: HTMLCanvasElement,
  scale: 2 | 4,
  onProgress?: (p: number) => void,
  isCancelled?: () => boolean,
  opts: { tta?: boolean } = {},
) {
  const ort = await loadOrt();
  const { width: W, height: H } = src;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  const out = makeCanvas(W * scale, H * scale);
  const octx = out.getContext("2d")!;
  const cols = Math.ceil(W / TILE);
  const rows = Math.ceil(H / TILE);
  const k = SCALE / scale; // 1 (4×) atau 2 (2×): ukuran blok yang dirata-rata
  let done = 0;

  const infer = async (data: Uint8ClampedArray, pw: number, ph: number, flip: boolean) => {
    const input = new ort.Tensor("float32", toTensorData(data, pw, ph, flip), [1, 3, ph, pw]);
    const res = await session.run({ [session.inputNames[0]]: input });
    input.dispose();
    const o = (res[session.outputNames[0]].data as Float32Array).slice();
    for (const key of Object.keys(res)) res[key].dispose();
    return o;
  };

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
      const o = await infer(data, pw, ph, false);
      const ow = pw * SCALE;
      const oh = ph * SCALE;
      const n = ow * oh;
      if (opts.tta) {
        // versi cermin dikembalikan (dicerminkan lagi) lalu dirata-rata per kanal
        const m = await infer(data, pw, ph, true);
        for (let c = 0; c < 3; c++) {
          for (let y = 0; y < oh; y++) {
            const row = c * n + y * ow;
            for (let x = 0; x < ow; x++) o[row + x] = (o[row + x] + m[row + ow - 1 - x]) / 2;
          }
        }
      }

      // Bagian tengah (tanpa padding) → blok k×k dirata-rata → kanvas hasil
      const cx = (x0 - px0) * SCALE;
      const cy = (y0 - py0) * SCALE;
      const cw = tw * scale;
      const ch = th * scale;
      const img = new ImageData(cw, ch);
      const kk = k * k;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          let r = 0;
          let g = 0;
          let b = 0;
          for (let dy = 0; dy < k; dy++) {
            const base = (cy + y * k + dy) * ow + cx + x * k;
            for (let dx = 0; dx < k; dx++) {
              const si = base + dx;
              r += o[si];
              g += o[n + si];
              b += o[2 * n + si];
            }
          }
          const di = (y * cw + x) * 4;
          img.data[di] = (r / kk) * 255;
          img.data[di + 1] = (g / kk) * 255;
          img.data[di + 2] = (b / kk) * 255;
          img.data[di + 3] = 255;
        }
      }
      octx.putImageData(img, x0 * scale, y0 * scale);
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
  if (hasAlpha) {
    const a = drawScaled(src, out.width, out.height);
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(a, 0, 0);
    octx.globalCompositeOperation = "source-over";
  }
  return out;
}

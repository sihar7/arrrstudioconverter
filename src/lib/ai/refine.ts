/**
 * Penyempurna mask hapus background (mode akurat): fungsi murni tanpa DOM supaya bisa diuji.
 * - Guided filter (He dkk., 2010): mask kasar dari model (1024², diperbesar) diselaraskan ke tepi foto asli →
 *   rambut, bulu & tepi halus mengikuti gambar, bukan blok buram hasil perbesaran.
 * - Pembersihan: kabut tipis di latar (< 3 %) dibuang, area hampir pejal (> 97 %) dibuat pejal.
 */

/** Rata-rata kotak (2r+1)² dengan jendela terpotong di tepi — O(n), jumlah geser per baris lalu per kolom */
export function boxMean(src: Float32Array, w: number, h: number, r: number, out = new Float32Array(w * h), tmp = new Float32Array(w * h)) {
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) acc += src[row + x];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / (Math.min(w - 1, x + r) - Math.max(0, x - r) + 1);
      if (x + r + 1 < w) acc += src[row + x + r + 1];
      if (x - r >= 0) acc -= src[row + x - r];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) acc += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (Math.min(h - 1, y + r) - Math.max(0, y - r) + 1);
      if (y + r + 1 < h) acc += tmp[(y + r + 1) * w + x];
      if (y - r >= 0) acc -= tmp[(y - r) * w + x];
    }
  }
  return out;
}

/**
 * Guided filter skala abu: q = mean(a)·I + mean(b), a = cov(I,p)/(var(I)+eps), b = mean(p) − a·mean(I).
 * I = panduan (luminans foto 0–1), p = mask kasar 0–1. eps kecil → tepi makin patuh pada foto.
 */
export function guidedFilter(I: Float32Array, p: Float32Array, w: number, h: number, r: number, eps: number): Float32Array {
  const n = w * h;
  const tmp = new Float32Array(n);
  const prod = new Float32Array(n);
  const mI = boxMean(I, w, h, r, undefined, tmp);
  const mp = boxMean(p, w, h, r, undefined, tmp);
  for (let i = 0; i < n; i++) prod[i] = I[i] * p[i];
  const mIp = boxMean(prod, w, h, r, undefined, tmp);
  for (let i = 0; i < n; i++) prod[i] = I[i] * I[i];
  const mII = boxMean(prod, w, h, r, prod, tmp); // menimpa prod (tidak dipakai lagi)
  // a & b ditulis ke mIp & mp (hemat memori)
  for (let i = 0; i < n; i++) {
    const a = (mIp[i] - mI[i] * mp[i]) / (mII[i] - mI[i] * mI[i] + eps);
    mIp[i] = a;
    mp[i] = mp[i] - a * mI[i];
  }
  const ma = boxMean(mIp, w, h, r, mI, tmp);
  const mb = boxMean(mp, w, h, r, mII, tmp);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
  return q;
}

/** Kurva bersih: < lo → 0, > hi → 1, di antaranya smoothstep */
export function cleanAlpha(a: Float32Array, lo = 0.03, hi = 0.97) {
  for (let i = 0; i < a.length; i++) {
    const t = Math.min(1, Math.max(0, (a[i] - lo) / (hi - lo)));
    a[i] = t * t * (3 - 2 * t);
  }
  return a;
}

/** RGBA → luminans 0–1 (Rec. 709) sebagai panduan guided filter */
export function luminance(px: Uint8ClampedArray | Uint8Array, n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  return out;
}

/** Normalisasi min–max ke 0–1 (keluaran ISNet tidak selalu persis 0–1) */
export function normalize(m: Float32Array) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < m.length; i++) {
    if (m[i] < lo) lo = m[i];
    if (m[i] > hi) hi = m[i];
  }
  const span = hi - lo || 1;
  const out = new Float32Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = (m[i] - lo) / span;
  return out;
}

/** Cermin horizontal peta 1 kanal w×h (untuk inferensi ganda asli + cermin) */
export function mirror(m: Float32Array, w: number, h: number) {
  const out = new Float32Array(m.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) out[row + x] = m[row + w - 1 - x];
  }
  return out;
}

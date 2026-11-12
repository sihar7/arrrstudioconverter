// Metadata lagu untuk antrean: artis, album & cover album (dipakai juga sebagai gambar Decal di Roblox).
// Sumber: katalog iTunes (gratis, tanpa key, CORS terbuka). Tidak ketemu / tidak cocok → tebakan dari judul
// & nama channel YouTube + thumbnail video yang dipotong kotak.

import { clean } from "./shortName";
import { isYoutubeId } from "@/lib/schemas/source";

export interface TrackMeta {
  artist: string | null;
  album: string | null;
  /** URL cover kotak (iTunes 600×600); null = pakai thumbnail video */
  cover: string | null;
  /** Genre mentah katalog (primaryGenreName, mis. "R&B/Soul") — dipetakan ke kategori di lib/genre */
  genre?: string | null;
}

const ITUNES = "https://itunes.apple.com/search";
const COVER_SIZE = 512;

/** "Rick Astley - Topic" / "RickAstleyVEVO" / "Rick Astley Official" → "Rick Astley" */
function channelArtist(author: string): string | null {
  const name = author
    .replace(/\s*-\s*topic$/i, "")
    .replace(/vevo$/i, "")
    .replace(/\s+(official|music|tv|channel)$/gi, "")
    .trim();
  return name || null;
}

/** Tebakan lokal: "Artis - Judul (Official Video)" → { artist, song }; tanpa pemisah → artis = channel */
export function guessTrack(title: string, author: string): { artist: string | null; song: string } {
  const cleaned = clean(title) || title;
  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length > 1) return { artist: parts[0].trim(), song: parts.slice(1).join(" - ").trim() };
  return { artist: channelArtist(author), song: cleaned };
}

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\b(feat|ft|featuring|with|the|and)\b/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1);

/** Porsi kata `want` yang ada di `got` (0–1) */
function overlap(want: string, got: string) {
  const a = words(want);
  if (!a.length) return 0;
  const b = new Set(words(got));
  return a.filter((w) => b.has(w)).length / a.length;
}

interface ItunesTrack {
  artistName: string;
  trackName: string;
  collectionName?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
}

const cache = new Map<string, Promise<TrackMeta>>();

/** Cari lagu di katalog iTunes; hasil yang judul/artisnya tidak cocok dibuang (lebih baik kosong daripada salah) */
async function lookup(artist: string | null, song: string, author: string, country: string): Promise<TrackMeta | null> {
  const term = [artist, song].filter(Boolean).join(" ").slice(0, 120);
  const qs = new URLSearchParams({ term, entity: "song", limit: "8", country });
  const res = await fetch(`${ITUNES}?${qs}`);
  // Gagal ≠ tidak ketemu (mis. kena batas request) → lempar, biar pemanggil bisa coba lagi nanti
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const { results = [] } = (await res.json()) as { results?: ItunesTrack[] };
  let best: { t: ItunesTrack; score: number } | null = null;
  for (const t of results) {
    const songScore = Math.max(overlap(t.trackName, song), overlap(song, t.trackName));
    const artistScore = Math.max(overlap(t.artistName, artist ?? ""), overlap(t.artistName, author), overlap(t.artistName, song));
    if (songScore < 0.6 || artistScore < 0.5) continue;
    const score = songScore + artistScore;
    if (!best || score > best.score) best = { t, score };
  }
  if (!best) return null;
  const { t } = best;
  return {
    artist: t.artistName,
    album: t.collectionName?.replace(/\s+-\s+(single|ep)$/i, "") ?? null,
    cover: t.artworkUrl100 ? t.artworkUrl100.replace(/\/\d+x\d+bb\./, "/600x600bb.") : null,
    genre: t.primaryGenreName ?? null,
  };
}

const countryOf = (lang: string) => (lang === "id" ? "ID" : "US");

/**
 * Artis & cover album dari judul saja (Riwayat). Urutan "Judul - Artis" juga dicoba.
 * null = tidak ketemu, undefined = katalog gagal dihubungi (coba lagi nanti)
 */
export async function findMeta(title: string, lang: string): Promise<TrackMeta | null | undefined> {
  const guess = guessTrack(title, "");
  try {
    const hit = await lookup(guess.artist, guess.song, "", countryOf(lang));
    if (hit || !guess.artist) return hit;
    return await lookup(guess.song, guess.artist, "", countryOf(lang));
  } catch {
    return undefined;
  }
}

/** Metadata satu video (di-cache per videoId selama tab terbuka) */
export function trackMeta(videoId: string, title: string, author: string, lang: string): Promise<TrackMeta> {
  const hit = cache.get(videoId);
  if (hit) return hit;
  const guess = guessTrack(title, author);
  const fallback: TrackMeta = { artist: guess.artist, album: null, cover: null };
  const p = lookup(guess.artist, guess.song, author, countryOf(lang))
    .then((m) => m ?? fallback)
    .catch(() => fallback);
  cache.set(videoId, p);
  return p;
}

// ============================================================
// Cover → gambar kotak (JPEG data URL) untuk upload Decal
// ============================================================

async function loadBitmap(url: string) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return createImageBitmap(await res.blob());
}

/**
 * Thumbnail YouTube → potongan kotak di tengah. maxresdefault (1280×720) tidak selalu ada;
 * hqdefault (480×360) punya pita hitam atas-bawah, jadi area gambarnya hanya 270px di tengah.
 */
async function videoSquare(videoId: string): Promise<{ bmp: ImageBitmap; sx: number; sy: number; size: number }> {
  try {
    const bmp = await loadBitmap(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
    // Placeholder "tidak ada" berukuran 120×90
    if (bmp.width >= 640) return { bmp, sx: (bmp.width - bmp.height) / 2, sy: 0, size: bmp.height };
    bmp.close();
  } catch {
    /* lanjut ke hqdefault */
  }
  const bmp = await loadBitmap(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
  const h = bmp.width * (9 / 16);
  return { bmp, sx: (bmp.width - h) / 2, sy: (bmp.height - h) / 2, size: h };
}

type Square = { bmp: ImageBitmap; sx: number; sy: number; size: number };

/** Cover album → potongan kotak; gagal / URL thumbnail YouTube → thumbnail video dipotong tengah */
async function squareSource(cover: string | null, videoId: string): Promise<Square> {
  if (cover && !cover.includes("ytimg.com")) {
    try {
      const bmp = await loadBitmap(cover);
      const size = Math.min(bmp.width, bmp.height);
      return { bmp, sx: (bmp.width - size) / 2, sy: (bmp.height - size) / 2, size };
    } catch {
      /* lanjut ke thumbnail */
    }
  }
  // Sumber non-YouTube tidak punya pola thumbnail ytimg → tanpa cover album, berhenti di sini
  if (!isYoutubeId(videoId)) throw new Error("Tidak ada gambar sumber");
  return videoSquare(videoId);
}

/**
 * Hanya "safe" yang dipakai: gambar abstrak BARU tanpa teks — hanya hue yang diambil dari cover asli.
 * "original" (cover asli apa adanya) dihapus 2026-11-12: thumbnail berisi wajah/teks → risiko ban PII & hak cipta.
 * Nilai lama "original" di penyimpanan perangkat tetap valid secara tipe, tapi diperlakukan sebagai "safe".
 */
export type CoverStyle = "safe" | "original";

type RGB = [number, number, number];

/** PRNG kecil (mulberry32) dengan seed dari string → pola sama untuk lagu yang sama */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Palet: warna paling "hidup" yang saling berbeda + warna dasar gelap, dari versi 16×16 gambar sumber */
function paletteOf(src: Square): { base: RGB; colors: RGB[] } {
  const n = 16;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src.bmp, src.sx, src.sy, src.size, src.size, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  const px: RGB[] = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  const lum = (p: RGB) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
  const vivid = (p: RGB) => Math.max(...p) - Math.min(...p) + (lum(p) > 40 && lum(p) < 220 ? 40 : 0);
  const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const colors: RGB[] = [];
  for (const p of [...px].sort((a, b) => vivid(b) - vivid(a))) {
    if (colors.every((q) => dist(p, q) > 90)) colors.push(p);
    if (colors.length === 3) break;
  }
  const darkest = px.reduce((a, b) => (lum(b) < lum(a) ? b : a));
  const base = darkest.map((v) => Math.round(v * 0.45)) as RGB;
  // Gambar hampir satu warna → tambah varian terang/gelap supaya tetap ada kedalaman
  while (colors.length < 3) colors.push(colors[0].map((v, k) => Math.min(255, Math.round(v * (colors.length === 1 ? 1.35 : 0.6) + k))) as RGB);
  return { base, colors };
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Dulu dipakai untuk menulis judul & artis di cover. Kini cover TANPA teks — hanya dipakai sebagai seed. */
export interface CoverText {
  title: string;
  artist: string | null;
}

// ---------- Warna tinta ----------

/** RGB → HSL (h 0–360, s & l 0–1) */
function toHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * Palet cetak: kertas + 2 tinta. Hue diambil dari gambar sumber (warna tidak berhak cipta); kejenuhan & terang
 * dijepit ke rentang tinta cetak → rata, tidak neon, tidak "glow". Kertas gelap atau krem dipilih per seri.
 */
function inkPalette(src: Square, rand: () => number): { paper: RGB; inks: [RGB, RGB]; dark: boolean } {
  const { colors } = paletteOf(src);
  const [h1, s1] = toHsl(colors[0]);
  const [h2raw, s2] = toHsl(colors[1]);
  // Hue tinta kedua terlalu dekat → geser supaya tetap dua warna yang terbaca
  const gap = 180 - Math.abs(((h2raw - h1 + 540) % 360) - 180);
  const h2 = gap < 30 ? (h1 + 35 + rand() * 25) % 360 : h2raw;
  const sat = (s: number) => Math.min(0.78, Math.max(0.42, s));
  const dark = rand() < 0.55;
  const paper = dark ? fromHsl(h1, 0.18, 0.09) : fromHsl(h1, 0.22, 0.9);
  const inks: [RGB, RGB] = dark
    ? [fromHsl(h1, sat(s1), 0.56), fromHsl(h2, sat(s2), 0.8)]
    : [fromHsl(h1, sat(s1), 0.46), fromHsl(h2, sat(s2) * 0.9, 0.24)];
  return { paper, inks, dark };
}

// ---------- Komposisi (tanpa teks, tanpa gambar milik orang lain) ----------

type Ink = (layer: 0 | 1) => string;

/** Petak Bauhaus: grid 3–4 kolom, tiap sel satu bentuk datar (seperempat lingkaran, setengah, segitiga, garis) */
function tiles(ctx: CanvasRenderingContext2D, rand: () => number, ink: Ink) {
  const S = COVER_SIZE;
  const n = rand() < 0.5 ? 3 : 4;
  const m = S * 0.07;
  const c = (S - m * 2) / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const kind = Math.floor(rand() * 6);
      const rot = Math.floor(rand() * 4) * (Math.PI / 2);
      const layer = rand() < 0.62 ? 0 : 1;
      if (kind === 5) continue; // sel kosong = ruang napas
      ctx.save();
      ctx.translate(m + x * c + c / 2, m + y * c + c / 2);
      ctx.rotate(rot);
      ctx.translate(-c / 2, -c / 2);
      ctx.fillStyle = ink(layer);
      ctx.beginPath();
      if (kind === 0) {
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, c, 0, Math.PI / 2);
      } else if (kind === 1) {
        ctx.arc(c / 2, c, c / 2, Math.PI, 0);
      } else if (kind === 2) {
        ctx.moveTo(0, 0);
        ctx.lineTo(c, 0);
        ctx.lineTo(0, c);
      } else if (kind === 3) {
        for (let k = 0; k < 3; k++) ctx.rect(0, (k * c) / 3 + c / 12, c, c / 6);
      } else {
        ctx.arc(c / 2, c / 2, c * 0.36, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Halftone: titik bergrid yang ukurannya mengikuti gelombang ber-seed; tinta kedua bergeser setengah sel */
function halftone(ctx: CanvasRenderingContext2D, rand: () => number, ink: Ink) {
  const S = COVER_SIZE;
  const n = 26;
  const c = S / n;
  const fx = 1 + rand() * 2.5;
  const fy = 1 + rand() * 2.5;
  const ph = rand() * Math.PI * 2;
  const cx = S * (0.25 + rand() * 0.5);
  const cy = S * (0.25 + rand() * 0.5);
  for (const layer of [0, 1] as const) {
    ctx.fillStyle = ink(layer);
    const off = layer ? c / 2 : 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const px = x * c + c / 2 + off;
        const py = y * c + c / 2 + off;
        const wave = Math.sin((px / S) * fx * Math.PI * 2 + ph) * Math.cos((py / S) * fy * Math.PI * 2 - ph);
        const radial = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / (S * 0.75));
        const v = layer ? (wave + 1) / 2 : radial * 0.8 + ((wave + 1) / 2) * 0.35;
        const r = (c / 2) * Math.min(0.95, v) * (layer ? 0.55 : 1);
        if (r < 0.6) continue;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Busur konsentris dari satu sudut (sablon matahari terbit) + satu lingkaran penuh */
function arcs(ctx: CanvasRenderingContext2D, rand: () => number, ink: Ink) {
  const S = COVER_SIZE;
  const corner = Math.floor(rand() * 4);
  const ox = corner % 2 ? S : 0;
  const oy = corner > 1 ? S : 0;
  const band = S * (0.045 + rand() * 0.03);
  for (let k = 0, r = S * 1.35; r > band; k++, r -= band * 1.6) {
    ctx.fillStyle = ink(k % 3 === 2 ? 1 : 0);
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.arc(ox, oy, Math.max(0, r - band), 0, Math.PI * 2, true);
    ctx.fill();
  }
  ctx.fillStyle = ink(1);
  ctx.beginPath();
  ctx.arc(S * (0.3 + rand() * 0.4), S * (0.3 + rand() * 0.4), S * (0.08 + rand() * 0.06), 0, Math.PI * 2);
  ctx.fill();
}

/** Batang gelombang tebal yang dicerminkan — bentuk "suara" datar, bukan equalizer neon */
function bars(ctx: CanvasRenderingContext2D, rand: () => number, ink: Ink) {
  const S = COVER_SIZE;
  const n = 14 + Math.floor(rand() * 10);
  const m = S * 0.08;
  const w = (S - m * 2) / n;
  // Kurva halus dari 3 sinus ber-seed (bukan acak per batang → tidak terlihat seperti noise)
  const a = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const mid = S * (0.42 + rand() * 0.16);
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const v = 0.55 + 0.25 * Math.sin(t * 5 + a[0]) + 0.15 * Math.sin(t * 11 + a[1]) + 0.1 * Math.sin(t * 23 + a[2]);
    const h = S * 0.62 * Math.max(0.08, v);
    ctx.fillStyle = ink(k % 4 === 1 ? 1 : 0);
    ctx.fillRect(m + k * w + w * 0.18, mid - h / 2, w * 0.64, h);
  }
}

const LAYOUTS = [tiles, halftone, arcs, bars];

/**
 * Cover otomatis yang aman untuk moderasi Roblox: gambar abstrak BARU bergaya cetak (sablon / risograph).
 * - TANPA teks apa pun: nama artis / judul di gambar pernah membuat akun user kena suspend
 *   "Privacy: Giving PII" (2026-11-12) — nama orang di gambar dianggap data pribadi.
 * - Tanpa wajah, logo, atau potongan gambar milik orang lain: hanya HUE yang diambil dari cover asli.
 * - Warna datar 2 tinta + kertas, sedikit meleset & berbutir → terasa dicetak, bukan gradasi blur "AI".
 * - Gaya & palet dari nama artis (lagu satu artis terasa satu seri), detail dari videoId (tiap lagu beda).
 */
function drawSafe(ctx: CanvasRenderingContext2D, src: Square, videoId: string, seedText: string) {
  const S = COVER_SIZE;
  const series = seeded(seedText.toLowerCase() || videoId);
  const rand = seeded(videoId);
  const { paper, inks, dark } = inkPalette(src, series);

  ctx.fillStyle = rgba(paper, 1);
  ctx.fillRect(0, 0, S, S);

  // Tinta digambar di lapisan sendiri lalu ditumpuk: multiply di kertas terang, screen di kertas gelap
  const layout = LAYOUTS[Math.floor(series() * LAYOUTS.length)];
  const layer = document.createElement("canvas");
  layer.width = layer.height = S;
  layout(layer.getContext("2d")!, rand, (i) => rgba(inks[i], 1));
  ctx.globalCompositeOperation = dark ? "screen" : "multiply";
  ctx.drawImage(layer, 0, 0);
  // Salinan tipis yang meleset 2–4px → kesan tinta tidak pas register
  ctx.globalAlpha = 0.16;
  ctx.drawImage(layer, 2 + rand() * 2, 1 + rand() * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Butir kertas (per piksel) + tinta tidak rata (per blok 4px)
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  const B = S / 4;
  const blocks = new Float32Array(B * B);
  for (let i = 0; i < blocks.length; i++) blocks[i] = (rand() - 0.5) * 10;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const n = (rand() - 0.5) * 16 + blocks[(y >> 2) * B + (x >> 2)];
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Cover → JPEG kotak 512px, siap dikirim ke /api/roblox/decal. SELALU cover otomatis tanpa teks: opsi cover asli
 * dihapus (thumbnail sering berisi wajah orang & teks → risiko ban PII / hak cipta). `style` lama tetap diterima
 * supaya pemanggil lama tidak rusak; judul/artis hanya dipakai sebagai seed warna & komposisi, tidak digambar.
 */
export async function coverDataUrl(
  cover: string | null,
  videoId: string,
  opts: { style?: CoverStyle; text?: CoverText } = {},
): Promise<string> {
  const src = await squareSource(cover, videoId);
  const c = document.createElement("canvas");
  c.width = c.height = COVER_SIZE;
  const ctx = c.getContext("2d")!;
  const artist = opts.text?.artist ?? guessTrack(opts.text?.title ?? "", "").artist ?? "";
  drawSafe(ctx, src, videoId, artist);
  src.bmp.close();
  return c.toDataURL("image/jpeg", 0.92);
}

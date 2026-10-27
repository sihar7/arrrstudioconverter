// Metadata lagu untuk antrean: artis, album & cover album (dipakai juga sebagai gambar Decal di Roblox).
// Sumber: katalog iTunes (gratis, tanpa key, CORS terbuka). Tidak ketemu / tidak cocok → tebakan dari judul
// & nama channel YouTube + thumbnail video yang dipotong kotak.

import { clean } from "./shortName";

export interface TrackMeta {
  artist: string | null;
  album: string | null;
  /** URL cover kotak (iTunes 600×600); null = pakai thumbnail video */
  cover: string | null;
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
  };
}

const countryOf = (lang: string) => (lang === "id" ? "ID" : "US");

/** Cover album dari judul saja (Riwayat): null = tidak ketemu, undefined = katalog gagal dihubungi (coba lagi nanti) */
export async function findCover(title: string, lang: string): Promise<string | null | undefined> {
  const guess = guessTrack(title, "");
  try {
    return (await lookup(guess.artist, guess.song, "", countryOf(lang)))?.cover ?? null;
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
  return videoSquare(videoId);
}

/**
 * - safe (bawaan): gambar abstrak BARU — hanya palet warna yang diambil dari cover asli. Cover album / thumbnail
 *   adalah karya berhak cipta (sering ada wajah, logo, teks) → diupload apa adanya bisa kena moderasi Roblox.
 * - original: cover asli apa adanya (risiko moderasi ditanggung user).
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

export interface CoverText {
  /** Judul video / lagu (dirapikan otomatis) */
  title: string;
  /** Artis dari katalog musik; null = ditebak dari judul */
  artist: string | null;
}

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Roboto, system-ui, sans-serif`;

/** Potong teks ke maks `lines` baris selebar `width` (kata terakhir diberi "…" bila terpotong) */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, lines: number): string[] {
  const out: string[] = [];
  let line = "";
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    out.push(line);
    line = words[i];
    if (out.length === lines) return ellipsize(ctx, out, width);
  }
  if (line) out.push(line);
  return out.length > lines ? ellipsize(ctx, out.slice(0, lines), width) : out;
}

function ellipsize(ctx: CanvasRenderingContext2D, rows: string[], width: number) {
  let last = `${rows[rows.length - 1]}…`;
  while (ctx.measureText(last).width > width && last.length > 2) last = `${last.slice(0, -2)}…`;
  return [...rows.slice(0, -1), last];
}

/** Motif per ARTIS (artis yang sama → motif & komposisi sama), dibuat dari garis putih tipis */
function drawMotif(ctx: CanvasRenderingContext2D, kind: number, rand: () => number, accent: RGB) {
  const S = COVER_SIZE;
  ctx.lineWidth = 1;
  if (kind === 0) {
    // Piringan hitam besar, sebagian keluar bingkai
    const cx = S * (0.62 + rand() * 0.14);
    const cy = S * (0.3 + rand() * 0.12);
    for (let r = S * 0.1; r < S * 0.46; r += 4 + rand() * 3) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + rand() * 0.06})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(accent, 0.95);
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.011, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 1) {
    // Gelombang suara: garis sinus bertumpuk
    const amp = S * (0.04 + rand() * 0.05);
    const freq = 1.5 + rand() * 2;
    const phase = rand() * Math.PI * 2;
    for (let k = 0; k < 16; k++) {
      const y0 = S * 0.12 + k * S * 0.026;
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + (k % 4 === 0 ? 0.12 : 0.04)})`;
      ctx.beginPath();
      for (let x = 0; x <= S; x += 8) {
        const y = y0 + Math.sin((x / S) * Math.PI * freq + phase + k * 0.18) * amp * (0.5 + k / 24);
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    // Equalizer: batang vertikal dengan tinggi ber-seed
    const n = 22;
    const w = (S * 0.84) / n;
    for (let k = 0; k < n; k++) {
      const h = S * (0.08 + rand() * 0.34);
      const x = S * 0.08 + k * w;
      ctx.fillStyle = k % 5 === 2 ? rgba(accent, 0.85) : "rgba(255,255,255,0.12)";
      ctx.fillRect(x, S * 0.5 - h, w * 0.5, h);
    }
  }
}

/**
 * Cover otomatis "aman": gambar BARU, selaras dengan lagu & artis tapi tanpa memakai karya aslinya.
 * - Warna: palet dari cover album lagu itu (warna tidak berhak cipta) → nuansa sama dengan rilisannya.
 * - Motif & komposisi: ditentukan nama artis → konsisten antar lagu artis yang sama.
 * - Tipografi: judul lagu + nama artis. Tanpa wajah, logo, atau gambar milik orang lain.
 */
function drawSafe(ctx: CanvasRenderingContext2D, src: Square, videoId: string, text: CoverText) {
  const S = COVER_SIZE;
  const guess = guessTrack(text.title, "");
  const song = guess.song || text.title;
  const artist = text.artist ?? guess.artist ?? "";
  const byArtist = seeded((artist || song).toLowerCase());
  const rand = seeded(videoId);
  const { base, colors } = paletteOf(src);

  ctx.fillStyle = rgba(base, 1);
  ctx.fillRect(0, 0, S, S);

  // Kabut warna: gumpalan radial di posisi acak (per lagu), lalu diburamkan
  const layer = document.createElement("canvas");
  layer.width = layer.height = S;
  const l = layer.getContext("2d")!;
  for (const [i, col] of [...colors, colors[0]].entries()) {
    const x = S * (0.1 + rand() * 0.8);
    const y = S * (0.05 + rand() * 0.6);
    const r = S * (0.35 + rand() * 0.35);
    const g = l.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, i === 3 ? 0.55 : 0.95));
    g.addColorStop(1, rgba(col, 0));
    l.fillStyle = g;
    l.fillRect(0, 0, S, S);
  }
  ctx.filter = "blur(28px)";
  ctx.drawImage(layer, 0, 0);
  ctx.filter = "none";

  drawMotif(ctx, Math.floor(byArtist() * 3), byArtist, colors[0]);

  // Scrim bawah supaya teks selalu terbaca
  const scrim = ctx.createLinearGradient(0, S * 0.45, 0, S);
  scrim.addColorStop(0, "rgba(0,0,0,0)");
  scrim.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, S, S);

  // Grain halus supaya tidak terlihat datar
  const img = ctx.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 12;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // Tipografi: artis (kapital kecil, berjarak) di atas judul (tebal, maks 3 baris), rata kiri bawah
  const pad = S * 0.075;
  const width = S - pad * 2;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  let size = 50;
  ctx.font = `700 ${size}px ${FONT}`;
  let lines = wrap(ctx, song, width, 3);
  // Judul panjang → huruf mengecil dulu sebelum dipotong
  while (size > 34 && (lines.length > 2 || lines.some((x) => x.endsWith("…")))) {
    size -= 4;
    ctx.font = `700 ${size}px ${FONT}`;
    lines = wrap(ctx, song, width, 3);
  }
  const lh = size * 1.08;
  let y = S - pad - (lines.length - 1) * lh;
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += lh;
  }
  if (artist) {
    ctx.font = `600 17px ${FONT}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "2.5px";
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    const [a] = wrap(ctx, artist.toUpperCase(), width, 1);
    ctx.fillText(a, pad, S - pad - (lines.length - 1) * lh - size - 8);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }
}

/** Cover → JPEG kotak 512px, siap dikirim ke /api/roblox/decal (bawaan: cover otomatis yang aman) */
export async function coverDataUrl(
  cover: string | null,
  videoId: string,
  opts: { style?: CoverStyle; text?: CoverText } = {},
): Promise<string> {
  const src = await squareSource(cover, videoId);
  const c = document.createElement("canvas");
  c.width = c.height = COVER_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  if ((opts.style ?? "safe") === "safe") drawSafe(ctx, src, videoId, opts.text ?? { title: "", artist: null });
  else ctx.drawImage(src.bmp, src.sx, src.sy, src.size, src.size, 0, 0, COVER_SIZE, COVER_SIZE);
  src.bmp.close();
  return c.toDataURL("image/jpeg", 0.92);
}

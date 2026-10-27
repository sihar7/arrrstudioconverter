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
  if (!res.ok) return null;
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

/** Metadata satu video (di-cache per videoId selama tab terbuka) */
export function trackMeta(videoId: string, title: string, author: string, lang: string): Promise<TrackMeta> {
  const hit = cache.get(videoId);
  if (hit) return hit;
  const guess = guessTrack(title, author);
  const fallback: TrackMeta = { artist: guess.artist, album: null, cover: null };
  const p = lookup(guess.artist, guess.song, author, lang === "id" ? "ID" : "US")
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

/** Cover album (atau thumbnail video) → JPEG kotak 512px, siap dikirim ke /api/roblox/decal */
export async function coverDataUrl(cover: string | null, videoId: string): Promise<string> {
  let src: { bmp: ImageBitmap; sx: number; sy: number; size: number };
  if (cover) {
    try {
      const bmp = await loadBitmap(cover);
      const size = Math.min(bmp.width, bmp.height);
      src = { bmp, sx: (bmp.width - size) / 2, sy: (bmp.height - size) / 2, size };
    } catch {
      src = await videoSquare(videoId);
    }
  } else {
    src = await videoSquare(videoId);
  }
  const c = document.createElement("canvas");
  c.width = c.height = COVER_SIZE;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.bmp, src.sx, src.sy, src.size, src.size, 0, 0, COVER_SIZE, COVER_SIZE);
  src.bmp.close();
  return c.toDataURL("image/jpeg", 0.92);
}

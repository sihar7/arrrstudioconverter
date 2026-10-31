import type { AudioOptions } from "@/lib/schemas/convert.schema";
import type { CompressLevel } from "@/lib/schemas/plans";

/** Pecah teks input jadi kandidat link (spasi / baris baru / koma) */
export function extractLinks(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.length >= 11))].slice(0, 60);
}

/** Durasi hasil setelah trim + speed */
export function outputDuration(o: AudioOptions, source: number | null) {
  if (source == null) return null;
  const start = o.trimStart ?? 0;
  const end = o.trimEnd != null ? Math.min(o.trimEnd, source) : source;
  return Math.max(0, (end - start) / o.speed);
}

export function speedLabel(v: number) {
  return `${v.toFixed(2)}×`;
}
export function dbLabel(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`;
}
export function semiLabel(v: number) {
  return `${v > 0 ? "+" : ""}${v} st`;
}
export function secLabel(v: number) {
  return `${v.toFixed(1)} s`;
}

// ============================================================
// DETEKSI LINK — dibaca langsung saat mengetik (feedback sebelum Tambah)
// ============================================================

export type LinkKind = "video" | "short" | "music" | "playlist" | "id" | "invalid";

export interface ParsedLink {
  raw: string;
  kind: LinkKind;
  /** videoId (11 karakter) atau playlistId */
  id: string | null;
  /** videoId sudah ada di antrean (belum selesai) */
  dup: boolean;
}

const YT_HOST = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;
const VID = /^[A-Za-z0-9_-]{11}$/;

export function parseLink(raw: string): Omit<ParsedLink, "dup"> {
  if (VID.test(raw)) return { raw, kind: "id", id: raw };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { raw, kind: "invalid", id: null };
  }
  if (!YT_HOST.test(url.hostname)) return { raw, kind: "invalid", id: null };
  const path = url.pathname.split("/").filter(Boolean);
  const v = url.searchParams.get("v");
  const list = url.searchParams.get("list");
  if (url.hostname.endsWith("youtu.be") && path[0] && VID.test(path[0])) return { raw, kind: "video", id: path[0] };
  if ((path[0] === "shorts" || path[0] === "live" || path[0] === "embed") && path[1] && VID.test(path[1]))
    return { raw, kind: path[0] === "shorts" ? "short" : "video", id: path[1] };
  if (v && VID.test(v)) return { raw, kind: url.hostname.startsWith("music.") ? "music" : "video", id: v };
  if (list) return { raw, kind: "playlist", id: list };
  return { raw, kind: "invalid", id: null };
}

/**
 * Link YouTube SUNGGUHAN pertama di teks pencarian (null = cari). ID polos 11 karakter sengaja tidak dihitung:
 * kata biasa seperti "christopher" lolos pola ID → dulu kata kunci langsung masuk antrean padahal videonya tidak ada.
 */
export function searchLink(text: string): string | null {
  return extractLinks(text).find((raw) => {
    const k = parseLink(raw).kind;
    return k !== "invalid" && k !== "id";
  }) ?? null;
}

/** Semua link di teks + tanda duplikat terhadap antrean */
export function parseLinks(text: string, queued: Set<string>): ParsedLink[] {
  return extractLinks(text).map((raw) => {
    const p = parseLink(raw);
    return { ...p, dup: p.kind !== "playlist" && p.id != null && queued.has(p.id) };
  });
}

// ============================================================
// PERKIRAAN UKURAN — untuk ringkasan setelan & statistik antrean
// ============================================================

/** Perkiraan ukuran file (byte) untuk durasi tertentu dengan opsi saat ini.
 *  level = tingkat kompres pintar plan (Pro "standard" ±25%, Studio "max" ±40% lebih kecil) */
export function estimateBytes(o: AudioOptions, seconds: number, level: CompressLevel = "standard") {
  const ch = o.mono ? 1 : 2;
  if (o.format === "wav") return seconds * o.sampleRate * ch * 2;
  if (o.format === "flac") return seconds * o.sampleRate * ch * 2 * 0.58;
  // Lossy: bitrate × durasi × hemat kompres pintar (perkiraan), mono ±35%
  const saver = !o.compress || level === "off" ? 1 : level === "max" ? 0.6 : 0.75;
  const factor = saver * (o.mono ? 0.65 : 1);
  return (seconds * o.bitrate * 1000 * factor) / 8;
}


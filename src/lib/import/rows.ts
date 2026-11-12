// Tabel hasil impor → daftar lagu. Kolom dikenali otomatis dari judul kolom (ID/EN) atau isinya:
// sel berisi link didukung → langsung pakai; selain itu judul (+ artis) dicari di YouTube.

import { parseLink } from "@/app/(App)/converter/_utils/helpers";
import type { Table } from "./sheet";

export interface ImportRow {
  /** urutan di file (1-based, setelah baris judul) */
  n: number;
  /** link / ID sumber yang sudah dikenali; null = perlu dicari dari judul */
  link: string | null;
  /** kata kunci pencarian: "Artis - Judul" */
  query: string | null;
  /** nama aset Roblox yang ditulis user di file (opsional) */
  name: string | null;
}

const HEAD = {
  link: /^(link|url|tautan|youtube|yt|video|source|sumber|id video|video id)$/i,
  title: /^(judul|title|lagu|song|track|nama lagu|song title|track name|music|musik)$/i,
  artist: /^(artis|artist|penyanyi|singer|band|by|oleh|channel)$/i,
  name: /^(nama|name|nama aset|asset name|display name|nama roblox)$/i,
};

/** Link sungguhan (YouTube / TikTok / SoundCloud / …) — ID polos dicek terpisah oleh looksLikeId */
const isLink = (s: string) => {
  const k = parseLink(s.trim()).kind;
  return k !== "invalid" && k !== "id";
};
// Sel ID 11 karakter hanya dianggap link bila ada huruf besar/angka campur (kata biasa "christopher" lolos pola)
const looksLikeId = (s: string) => /^[A-Za-z0-9_-]{11}$/.test(s) && /\d|[A-Z].*[a-z]|[a-z].*[A-Z]|[-_]/.test(s);

export interface Detected {
  rows: ImportRow[];
  /** kolom yang dipakai (untuk ditampilkan ke user) */
  columns: { link: number; title: number; artist: number; name: number };
  hasHeader: boolean;
}

export function detectRows(table: Table): Detected {
  const first = table[0] ?? [];
  const find = (re: RegExp) => first.findIndex((c) => re.test(c.trim()));
  const head = { link: find(HEAD.link), title: find(HEAD.title), artist: find(HEAD.artist), name: find(HEAD.name) };
  const hasHeader = Object.values(head).some((i) => i >= 0) && !first.some(isLink);
  const body = hasHeader ? table.slice(1) : table;

  // Tanpa judul kolom: kolom link = yang paling sering berisi link; kolom teks pertama = judul, kedua = artis
  const cols = Math.max(...body.slice(0, 50).map((r) => r.length), 1);
  if (!hasHeader || head.link < 0) {
    let best = -1;
    let bestHits = 0;
    for (let c = 0; c < cols; c++) {
      const hits = body.slice(0, 50).filter((r) => r[c] && (isLink(r[c]) || looksLikeId(r[c]))).length;
      if (hits > bestHits) [best, bestHits] = [c, hits];
    }
    head.link = best;
  }
  if (head.title < 0) {
    const text = [...Array(cols).keys()].filter((c) => c !== head.link && c !== head.artist && c !== head.name && body.some((r) => r[c] && !/^\d+([.,]\d+)?$/.test(r[c])));
    // Tanpa judul kolom: kolom teks ke-2 dianggap artis hanya bila pendek (nama, bukan kalimat)
    head.title = text[0] ?? -1;
    if (!hasHeader && head.artist < 0 && text[1] != null && body.slice(0, 30).every((r) => (r[text[1]] ?? "").length <= 40)) head.artist = text[1];
  }

  const rows: ImportRow[] = [];
  body.forEach((r, i) => {
    const cell = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    // Link bisa juga muncul di kolom mana pun (mis. file asal-asalan)
    const linkCell = cell(head.link);
    const link = linkCell && (isLink(linkCell) || looksLikeId(linkCell)) ? linkCell : (r.find((c) => c && isLink(c)) ?? null);
    // Satu kolom campuran (judul & link bergantian) → sel bukan-link di kolom link = judul
    const title = cell(head.title) || (!link ? cell(head.link) : "");
    const artist = cell(head.artist);
    const query = title ? (artist && !title.toLowerCase().includes(artist.toLowerCase()) ? `${artist} - ${title}` : title) : null;
    if (!link && !query) return;
    rows.push({ n: i + 1, link, query: query?.slice(0, 160) ?? null, name: cell(head.name) || null });
  });
  return { rows, columns: head, hasHeader };
}

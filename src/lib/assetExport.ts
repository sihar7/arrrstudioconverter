// Ekspor daftar asset ID (Audio saya & Riwayat): TXT / CSV / JSON / Lua.

import { guessGenre } from "./genre";

export type ExportFormat = "txt" | "csv" | "json" | "lua";
/** full = nama + artis + kategori + ID + ID cover (Riwayat); both = nama + kategori + ID */
export type ExportFields = "full" | "both" | "id";
export const EXPORT_FORMATS: ExportFormat[] = ["txt", "csv", "json", "lua"];

export interface ExportRow {
  assetId: string;
  name: string | null;
  /** ID gambar cover (Decal); null = tidak ada cover */
  coverId?: string | null;
  /** Nama artis (Riwayat); null = tidak diketahui */
  artist?: string | null;
  /** Kategori lagu ("Jawa", "RnB", …); tidak ada → ditebak dari nama + artis */
  genre?: string | null;
  /**
   * Sound.PlaybackSpeed yang harus diisi di game (mis. 0.7143 untuk Roblox Bypass 1.4×); 1 = tanpa setting.
   * undefined = tidak diketahui (mis. Audio saya) → kolomnya tidak ikut diekspor
   */
  playbackSpeed?: number;
}

const MIME: Record<ExportFormat, string> = {
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  lua: "text/plain",
};

// CSV: kutip ganda di-escape; awalan = + - @ dinetralkan supaya tidak dieksekusi sebagai formula spreadsheet
const csvCell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
const luaStr = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;

/** Susun isi file ekspor dari daftar aset (nama kosong → fallback) */
export function buildExport(assets: ExportRow[], format: ExportFormat, fields: ExportFields, untitled: string) {
  const rows = assets.map((a) => ({
    id: a.assetId,
    name: a.name ?? untitled,
    cover: a.coverId ?? null,
    artist: a.artist ?? null,
    genre: a.genre !== undefined ? a.genre : guessGenre(a.name, a.artist),
    speed: a.playbackSpeed,
  }));
  type Row = (typeof rows)[number];
  // Kolom PlaybackSpeed hanya bila datanya ada (Riwayat); TXT menulisnya hanya untuk yang ≠ 1 supaya tetap ringkas
  const withSpeed = rows.some((r) => r.speed !== undefined);
  const sp = (r: Row) => r.speed ?? 1;
  const csvSpeed = (r: Row) => (withSpeed ? `,${sp(r)}` : "");
  const luaSpeed = (r: Row) => (withSpeed ? `, PlaybackSpeed = ${sp(r)}` : "");
  const txtSpeed = (r: Row) => (withSpeed && sp(r) !== 1 ? `PlaybackSpeed ${sp(r)}` : null);
  const jsonSpeed = (r: Row) => (withSpeed ? { playbackSpeed: sp(r) } : {});
  const cell = (v: string | null) => (v ? csvCell(v) : "");
  const lua = (v: string | null) => (v ? luaStr(v) : "nil");
  if (fields === "full") {
    switch (format) {
      case "csv":
        return [
          `name,artist,genre,asset_id,cover_id${withSpeed ? ",playback_speed" : ""}`,
          ...rows.map((r) => `${csvCell(r.name)},${cell(r.artist)},${cell(r.genre)},${r.id},${r.cover ?? ""}${csvSpeed(r)}`),
        ].join("\r\n");
      case "json":
        return JSON.stringify(rows.map((r) => ({ name: r.name, artist: r.artist, genre: r.genre, assetId: r.id, coverId: r.cover, ...jsonSpeed(r) })), null, 2);
      case "lua":
        return `return {\n${rows
          .map((r) => `\t{ Name = ${luaStr(r.name)}, Artist = ${lua(r.artist)}, Genre = ${lua(r.genre)}, Id = ${r.id}, Cover = ${r.cover ?? "nil"}${luaSpeed(r)} },`)
          .join("\n")}\n}`;
      default:
        return rows.map((r) => [r.name, r.artist, r.genre && `[${r.genre}]`, r.id, r.cover, txtSpeed(r)].filter(Boolean).join(" - ")).join("\n");
    }
  }
  const both = fields === "both";
  switch (format) {
    case "csv":
      return [
        both ? `name,genre,asset_id${withSpeed ? ",playback_speed" : ""}` : "asset_id",
        ...rows.map((r) => (both ? `${csvCell(r.name)},${cell(r.genre)},${r.id}${csvSpeed(r)}` : r.id)),
      ].join("\r\n");
    case "json":
      return JSON.stringify(both ? rows.map((r) => ({ name: r.name, genre: r.genre, assetId: r.id, ...jsonSpeed(r) })) : rows.map((r) => r.id), null, 2);
    case "lua":
      return `return {\n${rows.map((r) => (both ? `\t{ Name = ${luaStr(r.name)}, Genre = ${lua(r.genre)}, Id = ${r.id}${luaSpeed(r)} },` : `\t${r.id},`)).join("\n")}\n}`;
    default:
      return rows.map((r) => (both ? [r.name, r.genre && `[${r.genre}]`, r.id, txtSpeed(r)].filter(Boolean).join(" - ") : r.id)).join("\n");
  }
}

/** Unduh teks sebagai file — CSV diberi BOM agar Excel membaca UTF-8 (nama non-ASCII) dengan benar */
export function downloadText(text: string, format: ExportFormat, baseName: string) {
  const blob = new Blob([format === "csv" ? `﻿${text}` : text], { type: `${MIME[format]};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `${baseName}.${format}` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

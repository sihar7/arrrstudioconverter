// Ekspor daftar asset ID (Audio saya & Riwayat): TXT / CSV / JSON / Lua.

export type ExportFormat = "txt" | "csv" | "json" | "lua";
/** full = nama + artis + ID + ID cover (Riwayat) */
export type ExportFields = "full" | "both" | "id";
export const EXPORT_FORMATS: ExportFormat[] = ["txt", "csv", "json", "lua"];

export interface ExportRow {
  assetId: string;
  name: string | null;
  /** ID gambar cover (Decal); null = tidak ada cover */
  coverId?: string | null;
  /** Nama artis (Riwayat); null = tidak diketahui */
  artist?: string | null;
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
  const rows = assets.map((a) => ({ id: a.assetId, name: a.name ?? untitled, cover: a.coverId ?? null, artist: a.artist ?? null }));
  if (fields === "full") {
    switch (format) {
      case "csv":
        return [
          "name,artist,asset_id,cover_id",
          ...rows.map((r) => `${csvCell(r.name)},${r.artist ? csvCell(r.artist) : ""},${r.id},${r.cover ?? ""}`),
        ].join("\r\n");
      case "json":
        return JSON.stringify(rows.map((r) => ({ name: r.name, artist: r.artist, assetId: r.id, coverId: r.cover })), null, 2);
      case "lua":
        return `return {\n${rows
          .map((r) => `\t{ Name = ${luaStr(r.name)}, Artist = ${r.artist ? luaStr(r.artist) : "nil"}, Id = ${r.id}, Cover = ${r.cover ?? "nil"} },`)
          .join("\n")}\n}`;
      default:
        return rows.map((r) => [r.name, r.artist, r.id, r.cover].filter(Boolean).join(" - ")).join("\n");
    }
  }
  const both = fields === "both";
  switch (format) {
    case "csv":
      return [both ? "name,asset_id" : "asset_id", ...rows.map((r) => (both ? `${csvCell(r.name)},${r.id}` : r.id))].join("\r\n");
    case "json":
      return JSON.stringify(both ? rows.map((r) => ({ name: r.name, assetId: r.id })) : rows.map((r) => r.id), null, 2);
    case "lua":
      return `return {\n${rows.map((r) => (both ? `\t{ Name = ${luaStr(r.name)}, Id = ${r.id} },` : `\t${r.id},`)).join("\n")}\n}`;
    default:
      return rows.map((r) => (both ? `${r.name} - ${r.id}` : r.id)).join("\n");
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

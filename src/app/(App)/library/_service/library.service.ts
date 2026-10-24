import { apiFetch } from "@/lib/utils";
import type { LibraryAsset } from "@/type/roblox";

export interface LibraryQuery {
  apiKey: string;
  creatorType: "user" | "group";
  creatorId: string;
  pageToken?: string;
  assetIds?: string[];
}

export function fetchLibrary(body: LibraryQuery) {
  return apiFetch<{ assets: LibraryAsset[]; nextPageToken: string | null }>("/api/roblox/library", { method: "POST", json: body });
}

/** Izinkan di place tertentu, atau publik (distribusi gratis di Creator Store) */
export function grantAccess(apiKey: string, assetIds: string[], mode: "place" | "public", placeId?: string) {
  return apiFetch<{ granted: string[]; failed: Record<string, string>; universeId: string | null }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, assetIds, mode, placeId },
  });
}

export function archiveAssets(apiKey: string, assetIds: string[], archive: boolean) {
  return apiFetch<{ done: string[]; failed: Record<string, string> }>("/api/roblox/archive", {
    method: "POST",
    json: { apiKey, assetIds, archive },
  });
}

/** "123, 456\n789" → ["123","456","789"] (unik, maks 50) */
export function parseIds(text: string): string[] {
  return [...new Set(text.match(/\d{5,20}/g) ?? [])].slice(0, 50);
}

export type ExportFormat = "txt" | "csv" | "json" | "lua";
export type ExportFields = "both" | "id";
export const EXPORT_FORMATS: ExportFormat[] = ["txt", "csv", "json", "lua"];

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
export function buildExport(assets: { assetId: string; name: string | null }[], format: ExportFormat, fields: ExportFields, untitled: string) {
  const rows = assets.map((a) => ({ id: a.assetId, name: a.name ?? untitled }));
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
  const blob = new Blob([format === "csv" ? `\uFEFF${text}` : text], { type: `${MIME[format]};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `${baseName}.${format}` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

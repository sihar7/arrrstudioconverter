// Baca file tabel di browser TANPA library: CSV / TSV / TXT / JSON / XLSX (Excel 2007+).
// XLSX = arsip ZIP berisi XML → dibuka dengan DecompressionStream("deflate-raw") bawaan browser, sheet pertama dibaca
// lewat DOMParser. Excel lama (.xls biner) & Numbers tidak didukung — user diminta "Simpan sebagai" CSV/XLSX.

export type Table = string[][];

export const IMPORT_ACCEPT = ".csv,.tsv,.txt,.xlsx,.json,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Batas aman ukuran file (5 MB ≈ puluhan ribu baris) */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export class ImportError extends Error {
  constructor(public code: "TOO_BIG" | "UNSUPPORTED" | "EMPTY" | "BROKEN") {
    super(code);
  }
}

export async function readTable(file: File): Promise<Table> {
  if (file.size > IMPORT_MAX_BYTES) throw new ImportError("TOO_BIG");
  const name = file.name.toLowerCase();
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  let rows: Table;
  // "PK\x03\x04" = ZIP (xlsx); D0 CF 11 E0 = Excel 97-2003 (.xls) biner
  if (head[0] === 0x50 && head[1] === 0x4b) rows = await readXlsx(await file.arrayBuffer());
  else if (head[0] === 0xd0 && head[1] === 0xcf) throw new ImportError("UNSUPPORTED");
  else {
    const text = (await file.text()).replace(/^﻿/, "");
    rows = name.endsWith(".json") || /^\s*[[{]/.test(text) ? readJson(text) : readDelimited(text);
  }
  const clean = rows.map((r) => r.map((c) => c.replace(/\s+/g, " ").trim())).filter((r) => r.some(Boolean));
  if (!clean.length) throw new ImportError("EMPTY");
  return clean;
}

// ---------- CSV / TSV / TXT ----------

/** Pemisah paling mungkin dari beberapa baris pertama: tab, titik koma (Excel Indonesia), koma, atau pipa */
function sniff(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n");
  const count = (d: string) => sample.split(d).length - 1;
  const cands = ["\t", ";", ",", "|"].map((d) => [d, count(d)] as const).sort((a, b) => b[1] - a[1]);
  return cands[0][1] > 0 ? cands[0][0] : "\n";
}

/** Parser CSV sesuai RFC 4180 (kutip ganda, "" di dalam kutip, baris baru di dalam kutip) */
export function readDelimited(text: string, delim = sniff(text)): Table {
  if (delim === "\n") return text.split(/\r?\n/).map((l) => [l]);
  const rows: Table = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

// ---------- JSON ----------

/** [["judul","artis"]] · ["judul", …] · [{ judul, artis, link }] · { items|songs|data: [...] } */
function readJson(text: string): Table {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("BROKEN");
  }
  if (data && !Array.isArray(data) && typeof data === "object") {
    const o = data as Record<string, unknown>;
    data = o.items ?? o.songs ?? o.lagu ?? o.data ?? o.rows ?? Object.values(o).find(Array.isArray);
  }
  if (!Array.isArray(data)) throw new ImportError("BROKEN");
  const objects = data.filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r));
  if (objects.length) {
    const keys = [...new Set(objects.flatMap((o) => Object.keys(o)))].slice(0, 20);
    return [keys, ...objects.map((o) => keys.map((k) => (o[k] == null ? "" : String(o[k]))))];
  }
  return data.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? "" : String(c))) : [r == null ? "" : String(r)]));
}

// ---------- XLSX ----------

interface ZipEntry {
  method: number;
  offset: number;
  size: number;
}

/** Daftar isi ZIP dari central directory (akhir file) */
function zipIndex(buf: ArrayBuffer): Map<string, ZipEntry> {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ImportError("BROKEN");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, ZipEntry>();
  for (let n = 0; n < count && p + 46 <= buf.byteLength; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extra = v.getUint16(p + 30, true);
    const comment = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    // Data mulai setelah header lokal (panjang nama & extra lokal bisa beda dengan central directory)
    const offset = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    out.set(name, { method, offset, size });
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

async function unzipText(buf: ArrayBuffer, e: ZipEntry | undefined): Promise<string | null> {
  if (!e) return null;
  const raw = new Uint8Array(buf, e.offset, e.size);
  if (e.method === 0) return new TextDecoder().decode(raw);
  if (e.method !== 8 || typeof DecompressionStream === "undefined") throw new ImportError("UNSUPPORTED");
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

/** "AB12" → indeks kolom 27 */
function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function readXlsx(buf: ArrayBuffer): Promise<Table> {
  const zip = zipIndex(buf);
  const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
  const sharedXml = await unzipText(buf, zip.get("xl/sharedStrings.xml"));
  const shared = sharedXml
    ? [...xml(sharedXml).getElementsByTagName("si")].map((si) => [...si.getElementsByTagName("t")].map((t) => t.textContent ?? "").join(""))
    : [];
  // Sheet pertama sesuai urutan workbook (bukan selalu sheet1.xml)
  let path = "xl/worksheets/sheet1.xml";
  const wb = await unzipText(buf, zip.get("xl/workbook.xml"));
  const rels = await unzipText(buf, zip.get("xl/_rels/workbook.xml.rels"));
  if (wb && rels) {
    const first = xml(wb).getElementsByTagName("sheet")[0];
    const rid = first?.getAttribute("r:id") ?? first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const target = [...xml(rels).getElementsByTagName("Relationship")].find((r) => r.getAttribute("Id") === rid)?.getAttribute("Target");
    if (target) path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = await unzipText(buf, zip.get(path) ?? [...zip].find(([k]) => k.startsWith("xl/worksheets/"))?.[1]);
  if (!sheet) throw new ImportError("BROKEN");
  const rows: Table = [];
  for (const r of xml(sheet).getElementsByTagName("row")) {
    const row: string[] = [];
    for (const c of r.getElementsByTagName("c")) {
      const ref = c.getAttribute("r");
      const idx = ref ? colIndex(ref) : row.length;
      const type = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      const value =
        type === "s"
          ? (shared[Number(v)] ?? "")
          : type === "inlineStr"
            ? [...c.getElementsByTagName("t")].map((t) => t.textContent ?? "").join("")
            : v;
      if (idx > 200) continue; // kolom super jauh = sampah format, abaikan
      while (row.length < idx) row.push("");
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows;
}

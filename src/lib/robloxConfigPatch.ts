/**
 * Tambah PlaybackSpeed "balik ke asli" ke config / script music player Roblox milik user (berjalan di browser).
 * Heuristik baris per baris, aman diulang (yang sudah punya Speed / PlaybackSpeed tidak disentuh):
 *  1. Entri lagu di tabel config  `{ Name = "x", Id = 123 }`        → `{ Name = "x", Id = 123, Speed = 0.8 }`
 *     (juga entri multi-baris: baris `Id = …,` diberi baris `Speed = 0.8,` di bawahnya)
 *  2. Baris `obj.SoundId = …` di script                              → baris `obj.PlaybackSpeed = …` tepat di bawahnya
 *     RHS dari field tabel (`track.Id`, `Songs[i].SoundId`) → `track.Speed or 0.8` (lagu biasa cukup diberi Speed = 1)
 */

export type PatchKind = "field" | "playback";

export interface PatchChange {
  /** nomor baris di kode HASIL (mulai 1) */
  line: number;
  kind: PatchKind;
  text: string;
}

export interface PatchResult {
  code: string;
  changes: PatchChange[];
}

const ID_KEYS = "Id|ID|SoundId|AssetId|Sound|Audio|Song|Music";
// Nilai ID audio: angka panjang, "rbxassetid://123", "123", atau url asset
const ID_VALUE = String.raw`(?:\d{5,}|["'](?:rbxassetid://|https?://[^"']*?id=)?\d{5,}["'])`;
const SPEED_KEY = /\b(?:Speed|PlaybackSpeed)\s*=/;

const inlineEntry = new RegExp(String.raw`\{[^{}]*\b(?:${ID_KEYS})\s*=\s*${ID_VALUE}[^{}]*\}`);
const fieldLine = new RegExp(String.raw`^(\s*)(?:${ID_KEYS})\s*=\s*${ID_VALUE}\s*(,?)\s*(--.*)?$`);
const soundIdLine = /^(\s*)(.+?)\.SoundId\s*=\s*(.+?)\s*(--.*)?$/;
const tableField = new RegExp(String.raw`([A-Za-z_][\w.]*(?:\[[^\]]+\])*(?:\.[A-Za-z_]\w*)*)\.(?:${ID_KEYS})\b`);

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** Entri inline: sisipkan `, Speed = x` sebelum `}` penutup entri */
function patchInline(line: string, speed: string): string | null {
  if (SPEED_KEY.test(line)) return null;
  let changed = false;
  const out = line.replace(new RegExp(inlineEntry.source, "g"), (entry) => {
    if (SPEED_KEY.test(entry)) return entry;
    changed = true;
    const body = entry.slice(0, -1).replace(/\s*,?\s*$/, "");
    return `${body}, Speed = ${speed} }`;
  });
  return changed ? out : null;
}

/** Entri multi-baris: blok sampai `}` berikutnya belum punya Speed? */
function blockHasSpeed(lines: string[], from: number): boolean {
  for (let i = from; i < lines.length && i < from + 12; i++) {
    if (SPEED_KEY.test(lines[i])) return true;
    if (lines[i].includes("}")) return false;
  }
  return false;
}

/** Indeks baris dekat berikutnya yang sudah mengatur PlaybackSpeed objek yang sama, -1 = tidak ada */
function nextSpeedLine(lines: string[], from: number, obj: string): number {
  for (let i = from; i < lines.length && i < from + 4; i++) {
    if (lines[i].trim().startsWith(`${obj}.PlaybackSpeed`)) return i;
  }
  return -1;
}

export function patchMusicConfig(src: string, speedValue: number): PatchResult {
  const speed = fmt(speedValue);
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  const changes: PatchChange[] = [];
  // Baris `obj.PlaybackSpeed = 1` lama di dekat SoundId → diganti (nilai 1 membatalkan bypass)
  const replace = new Map<number, string>();

  lines.forEach((line, i) => {
    const swap = replace.get(i);
    if (swap !== undefined) {
      out.push(swap);
      changes.push({ line: out.length, kind: "playback", text: swap.trim() });
      return;
    }

    // 2. Script: obj.SoundId = … → obj.PlaybackSpeed = … di bawahnya
    const s = soundIdLine.exec(line);
    if (s && !line.trim().startsWith("--")) {
      const [, indent, obj, rhs] = s;
      out.push(line);
      const base = tableField.exec(rhs)?.[1];
      const value = base ? `${base}.Speed or ${speed}` : speed;
      const added = `${indent}${obj}.PlaybackSpeed = ${value} -- ARRR Converter: lagu Roblox Bypass terdengar asli`;
      const near = nextSpeedLine(lines, i + 1, obj);
      if (near < 0) {
        out.push(added);
        changes.push({ line: out.length, kind: "playback", text: added.trim() });
      } else if (/PlaybackSpeed\s*=\s*1(?:\.0+)?\s*(?:--.*)?$/.test(lines[near])) {
        replace.set(near, added);
      }
      return;
    }

    // 1a. Entri lagu satu baris
    const inline = patchInline(line, speed);
    if (inline !== null) {
      out.push(inline);
      changes.push({ line: out.length, kind: "field", text: inline.trim() });
      return;
    }

    // 1b. Entri lagu multi-baris: `Id = …,` → tambah `Speed = x,` di bawahnya
    const fl = fieldLine.exec(line);
    if (fl && !blockHasSpeed(lines, i + 1) && !SPEED_KEY.test(lines[i - 1] ?? "")) {
      const [, indent, comma, comment] = fl;
      out.push(comma ? line : line.replace(/(\s*)(--.*)?$/, `,${comment ? " " + comment : ""}`));
      const added = `${indent}Speed = ${speed},`;
      out.push(added);
      changes.push({ line: out.length, kind: "field", text: added.trim() });
      return;
    }

    out.push(line);
  });

  return { code: out.join("\n"), changes };
}

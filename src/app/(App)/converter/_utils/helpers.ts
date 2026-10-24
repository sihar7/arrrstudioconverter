import type { AudioOptions } from "@/lib/schemas/convert.schema";

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

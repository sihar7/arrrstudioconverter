import type { AudioOptions } from "@/lib/schemas/convert.schema";
import type { Dictionary } from "@/utils/languages/id";

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Ringkasan efek aktif untuk chip kecil */
export function summarize(o: AudioOptions, t: Dictionary): string[] {
  const p = t.converter.panel;
  const out: string[] = [];
  if (o.speed !== 1) out.push(`${o.speed.toFixed(2)}×`);
  if (o.pitch) out.push(`${p.pitch} ${sign(o.pitch)}`);
  if (o.bass) out.push(`${p.bass} ${sign(o.bass)}`);
  if (o.treble) out.push(`${p.treble} ${sign(o.treble)}`);
  if (o.reverb) out.push(`${p.reverb} ${o.reverb}`);
  if (o.spatial8d) out.push("8D");
  if (o.volume) out.push(`${sign(o.volume)} dB`);
  if (o.normalize) out.push("LUFS");
  if (o.trimStart != null || o.trimEnd != null) out.push("Trim");
  return out;
}

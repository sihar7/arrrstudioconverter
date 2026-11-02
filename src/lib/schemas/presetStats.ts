import { DEFAULT_OPTIONS, PRESETS, type AudioOptions, type PresetId } from "./convert.schema";

// Statistik preset — dipakai bersama oleh API (agregasi riwayat) dan UI (peluang lolos moderasi Roblox).
// File ini identik di web & BE.

export type StatKey = PresetId | "custom";

export interface PresetStat {
  /** jumlah convert dengan preset ini */
  uses: number;
  /** hasil upload Roblox yang sudah diputus moderasi */
  approved: number;
  rejected: number;
}

export interface PresetStatsResponse {
  /** total convert yang dihitung (jendela waktu di BE) */
  total: number;
  days: number;
  presets: Partial<Record<StatKey, PresetStat>>;
  updatedAt: number;
}

// Kunci yang menentukan "warna" efek; preset dicocokkan pada kunci ini + kunci miliknya sendiri
const EFFECT_KEYS = ["speed", "pitch", "reverb", "bass", "treble", "spatial8d", "master"] as const;
// Urutan cocok: yang lebih spesifik dulu (Roblox Bypass ⊂ Nightcore secara efek)
const MATCH_ORDER: PresetId[] = ["robloxBypass", "nightcore", "spedUp", "slowedReverb", "slowed", "bassBoost", "eightD", "master", "normal"];

/** Opsi convert → preset asalnya; diubah manual = "custom" */
export function classifyPreset(o: Partial<AudioOptions>): StatKey {
  const opts = { ...DEFAULT_OPTIONS, ...o };
  for (const id of MATCH_ORDER) {
    const want: Partial<AudioOptions> = { ...pick(DEFAULT_OPTIONS), ...PRESETS[id] };
    const ok = Object.entries(want).every(([k, v]) => {
      // preservePitch tak berarti saat speed 1
      if (k === "preservePitch" && opts.speed === 1) return true;
      const cur = opts[k as keyof AudioOptions];
      return typeof v === "number" ? Math.abs((cur as number) - v) < 1e-6 : cur === v;
    });
    if (ok) return id;
  }
  return "custom";
}

function pick(o: AudioOptions): Partial<AudioOptions> {
  const r: Record<string, unknown> = {};
  for (const k of EFFECT_KEYS) r[k] = o[k];
  return r as Partial<AudioOptions>;
}

/**
 * Perkiraan awal (%) audio lolos deteksi hak cipta Roblox, dari seberapa jauh sinyal diubah.
 * Dipakai sebagai prior; begitu ada data upload nyata, angka bergeser ke rasio Approved sungguhan.
 */
export function heuristicApproval(o: Partial<AudioOptions>): number {
  const x = { ...DEFAULT_OPTIONS, ...o };
  let s = 30;
  const dev = Math.abs(x.speed - 1);
  s += Math.min(50, dev * 220);
  // Resample (nada ikut tempo) mengubah sidik jari frekuensi juga
  if (dev > 0 && !x.preservePitch) s += 5;
  s += Math.min(30, Math.abs(x.pitch) * 6);
  s += (x.reverb / 100) * 15;
  if (x.spatial8d) s += 20;
  if (Math.abs(x.bass) >= 6 || Math.abs(x.treble) >= 6) s += 6;
  if (x.master) s += 4;
  return Math.round(Math.min(95, Math.max(10, s)));
}

/** Bobot prior (setara sekian upload) — data nyata menang setelah sampelnya lebih banyak */
const PRIOR_WEIGHT = 12;

/** Gabungan prior heuristik + rasio Approved nyata (Bayes sederhana) */
export function approvalChance(o: Partial<AudioOptions>, stat?: PresetStat): { pct: number; sample: number } {
  const prior = heuristicApproval(o) / 100;
  const n = stat ? stat.approved + stat.rejected : 0;
  const pct = n ? ((stat!.approved + prior * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT)) * 100 : prior * 100;
  return { pct: Math.round(pct), sample: n };
}

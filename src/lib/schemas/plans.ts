import type { AudioFormat, AudioOptions } from "./convert.schema";

// Definisi plan — dipakai bersama oleh UI (halaman harga, kunci opsi) dan API (penegakan batas).
// File ini identik di repo web & backend; ubah keduanya bersamaan.

export const PLAN_IDS = ["free", "pro", "studio"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/**
 * Efek bertingkat (efek dasar — speed, pitch, volume, trim, fade, normalize — selalu ada di semua plan):
 *   eq        — bass & treble (Pro)
 *   reverb    — gema ruang, untuk preset Slowed + Reverb (Pro)
 *   spatial8d — audio 8D berputar (Studio)
 */
export const EFFECT_IDS = ["eq", "reverb", "spatial8d"] as const;
export type EffectId = (typeof EFFECT_IDS)[number];

export interface PlanLimits {
  id: PlanId;
  /** lagu per 24 jam; null = tanpa batas */
  daily: number | null;
  /** durasi video maksimal (detik) */
  maxDurationSec: number;
  /** item maksimal saat impor playlist */
  playlistMax: number;
  /** konversi berjalan bersamaan per akun */
  parallel: number;
  maxBitrate: 96 | 128 | 192 | 256 | 320;
  formats: readonly AudioFormat[];
  effects: readonly EffectId[];
  /** lama file hasil bisa diunduh (jam) */
  fileTtlHours: number;
  /** entri riwayat yang disimpan */
  historyMax: number;
  /** upload massal ke Roblox */
  bulkRoblox: boolean;
  /** antrean server didahulukan */
  priority: boolean;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    daily: 5,
    maxDurationSec: 10 * 60,
    playlistMax: 10,
    parallel: 1,
    maxBitrate: 192,
    formats: ["mp3", "ogg"],
    effects: [],
    fileTtlHours: 1,
    historyMax: 50,
    bulkRoblox: false,
    priority: false,
  },
  pro: {
    id: "pro",
    daily: 50,
    maxDurationSec: 30 * 60,
    playlistMax: 50,
    parallel: 3,
    maxBitrate: 256,
    formats: ["mp3", "ogg", "m4a"],
    effects: ["eq", "reverb"],
    fileTtlHours: 24,
    historyMax: 300,
    bulkRoblox: true,
    priority: false,
  },
  studio: {
    id: "studio",
    daily: null,
    maxDurationSec: 60 * 60,
    playlistMax: 200,
    parallel: 5,
    maxBitrate: 320,
    formats: ["mp3", "ogg", "m4a", "wav", "flac"],
    effects: ["eq", "reverb", "spatial8d"],
    fileTtlHours: 72,
    historyMax: 1000,
    bulkRoblox: true,
    priority: true,
  },
};

/** Batas teratas semua plan — dipakai untuk batas keras download / baca riwayat */
export const PLAN_CAP = {
  maxDurationSec: Math.max(...PLAN_IDS.map((p) => PLANS[p].maxDurationSec)),
  playlistMax: Math.max(...PLAN_IDS.map((p) => PLANS[p].playlistMax)),
  historyMax: Math.max(...PLAN_IDS.map((p) => PLANS[p].historyMax)),
};

/** Plan termurah yang memenuhi syarat (untuk label kunci "Pro" / "Studio") */
export const cheapestPlan = (test: (p: PlanLimits) => boolean): PlanId => PLAN_IDS.find((id) => test(PLANS[id])) ?? "studio";

// ---------- Harga (Rupiah, dibayar via QRIS) ----------

/** Harga per bulan; free = 0 (tidak bisa dibeli) */
export const PLAN_PRICE: Record<PlanId, number> = { free: 0, pro: 15_000, studio: 35_000 };
export const PAID_PLANS = ["pro", "studio"] as const satisfies readonly PlanId[];
export type PaidPlanId = (typeof PAID_PLANS)[number];

/** Pilihan durasi berlangganan + diskon */
export const BILLING_PERIODS = [
  { months: 1, discount: 0 },
  { months: 3, discount: 0.1 },
  { months: 12, discount: 0.2 },
] as const;
export type BillingMonths = (typeof BILLING_PERIODS)[number]["months"];

/** Harga dasar (sebelum kode unik), dibulatkan ke ratusan */
export function planTotal(plan: PaidPlanId, months: BillingMonths): number {
  const period = BILLING_PERIODS.find((p) => p.months === months)!;
  return Math.round((PLAN_PRICE[plan] * months * (1 - period.discount)) / 100) * 100;
}

export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && (PLAN_IDS as readonly string[]).includes(v);

/** Efek berbayar yang dipakai sekumpulan opsi (mis. untuk mengunci preset Bass Boost / 8D) */
export function effectsUsed(o: Partial<AudioOptions>): EffectId[] {
  const out: EffectId[] = [];
  if (o.bass || o.treble) out.push("eq");
  if (o.reverb) out.push("reverb");
  if (o.spatial8d) out.push("spatial8d");
  return out;
}

/** Turunkan opsi ke batas plan (mis. preferensi tersimpan dari plan lama / setelah downgrade) */
export function clampOptions(o: AudioOptions, plan: PlanLimits): AudioOptions {
  const next = { ...o };
  if (!plan.formats.includes(next.format)) next.format = plan.formats[0];
  if (next.bitrate > plan.maxBitrate) next.bitrate = plan.maxBitrate;
  if (!plan.effects.includes("eq")) Object.assign(next, { bass: 0, treble: 0 });
  if (!plan.effects.includes("reverb")) next.reverb = 0;
  if (!plan.effects.includes("spatial8d")) next.spatial8d = false;
  return next;
}

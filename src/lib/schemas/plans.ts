import { DEFAULT_OPTIONS, type AudioFormat, type AudioOptions } from "./convert.schema";

// Definisi plan — dipakai bersama oleh UI (halaman harga, kunci opsi) dan API (penegakan batas).
// File ini identik di repo web & backend; ubah keduanya bersamaan.

/**
 * Plan publik: Free (bawaan) + Lite, Pro, Studio, Ultimate (dijual) — tampil di halaman Harga & bisa diberikan admin.
 * Riwayat: sebelum 2026-11 hanya Pro (Rp15rb) & Studio (Rp35rb). Fitur per harga dipertahankan saat jadi 5 tingkat:
 * Lite = Pro lama, Pro = Studio lama; data user/order lama dipindah sekali oleh migratePlanIds() di backend.
 */
export const PLAN_IDS = ["free", "lite", "pro", "studio", "ultimate"] as const;
export type PublicPlanId = (typeof PLAN_IDS)[number];
/**
 * Plan internal khusus admin aplikasi (otomatis, batas paling longgar). Tidak dijual, tidak tampil di halaman
 * Harga, dan tidak bisa diberikan ke user.
 */
export const ADMIN_PLAN = "admin" as const;
export const ALL_PLAN_IDS = [...PLAN_IDS, ADMIN_PLAN] as const;
export type PlanId = (typeof ALL_PLAN_IDS)[number];

/** Nama tampilan plan (admin panel, order, notifikasi) */
export const PLAN_NAMES: Record<PlanId, string> = { free: "Free", lite: "Lite", pro: "Pro", studio: "Studio", ultimate: "Ultimate", admin: "Admin" };

/**
 * Efek dasar (speed, pitch, volume, fade) ada di semua plan tapi RENTANGNYA bertingkat (lihat `ranges`).
 * Efek tambahan bertingkat:
 *   eq        — bass & treble (Pro)
 *   reverb    — gema ruang, untuk preset Slowed + Reverb (Pro)
 *   spatial8d — audio 8D berputar (Studio)
 *   master    — Mode Master: mastering adaptif per lagu (Ultimate & admin; UI menyembunyikannya dari plan lain)
 */
export const EFFECT_IDS = ["eq", "reverb", "spatial8d", "master"] as const;
export type EffectId = (typeof EFFECT_IDS)[number];

/** Kompres pintar: off · standard (hemat) · max (super hemat, VBR paling agresif yang masih transparan) */
export type CompressLevel = "off" | "standard" | "max";
/** Audio saya: off · basic (lihat, arsip, izin) · full (+ muat semua & ekspor) */
export type LibraryLevel = "off" | "basic" | "full";

export interface PlanLimits {
  id: PlanId;
  /** token per periode (lihat TOKEN_RULES — terisi penuh lagi tiap `windowHours`); null = tanpa batas */
  tokens: number | null;
  /** durasi video maksimal (detik) */
  maxDurationSec: number;
  /** item maksimal saat impor playlist */
  playlistMax: number;
  /** konversi berjalan bersamaan per akun */
  parallel: number;
  maxBitrate: 96 | 128 | 192 | 256 | 320;
  formats: readonly AudioFormat[];
  effects: readonly EffectId[];
  /**
   * Rentang efek: speed [min, max]×, pitch ±semitone, volume ±dB, fade maks detik,
   * bass/treble [min, max] dB (hanya berlaku bila efek "eq" ada), reverb maks % (bila "reverb" ada)
   */
  ranges: {
    speed: readonly [number, number];
    pitch: number;
    volume: number;
    fade: number;
    bass: readonly [number, number];
    treble: readonly [number, number];
    reverb: number;
  };
  smartCompress: CompressLevel;
  /** lama file hasil bisa diunduh (jam) */
  fileTtlHours: number;
  /** entri riwayat yang disimpan */
  historyMax: number;
  /** upload massal ke Roblox: 0 = tidak bisa, n = maks n lagu sekali kirim, null = tanpa batas */
  bulkRoblox: number | null;
  /** halaman "Audio saya" (kelola, arsip & izin audio Roblox milik sendiri) */
  library: LibraryLevel;
  /** antrean server didahulukan */
  priority: boolean;
  /** Video album (chapter) otomatis dipecah per lagu saat link ditambahkan — Studio, Ultimate & admin */
  albumSplit: boolean;
  /** Alat gambar (Hapus background & Upscale, diproses di perangkat): sisi terpanjang hasil maksimal (px) */
  imageMaxSide: number;
  /** skala upscale yang boleh dipilih */
  upscaleScales: readonly (2 | 4)[];
  /** latar hasil hapus background: basic = transparan & putih · full = + warna bebas & blur foto asli */
  imageBg: "basic" | "full";
  /**
   * Kualitas AI gambar: standard = model int8 · pro = model presisi penuh + inferensi ganda (cermin) + guided filter
   * di tepi (hapus background) & tile ganda (upscale) — Studio, Ultimate & admin
   */
  imageAi: "standard" | "pro";
  /** Skybox: ukuran sisi maksimal (px) */
  skyboxMaxFace: number;
}

// Free < Lite < Pro < Studio < Ultimate — tiap tingkat terasa beda di token, durasi, playlist & upload massal.
// Lite: EQ & reverb · Pro: 8D, lossless, prioritas · Studio: pecah album, AI gambar presisi penuh, Skybox 4K ·
// Ultimate: Mode Master, 2 jam, upload massal tanpa batas. Admin tetap paling atas — tidak dijual.
// Preset: Nightcore & Slowed (Free), Sped Up / Slowed + Reverb / Bass Boost (Lite), 8D (Pro).
export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    tokens: 4,
    maxDurationSec: 8 * 60,
    playlistMax: 5,
    parallel: 1,
    maxBitrate: 128,
    formats: ["mp3", "ogg"],
    effects: [],
    ranges: { speed: [0.8, 1.25], pitch: 2, volume: 4, fade: 2, bass: [0, 0], treble: [0, 0], reverb: 0 },
    smartCompress: "off",
    fileTtlHours: 1,
    historyMax: 30,
    bulkRoblox: 0,
    library: "off",
    priority: false,
    albumSplit: false,
    imageMaxSide: 768,
    upscaleScales: [2],
    imageBg: "basic",
    imageAi: "standard",
    skyboxMaxFace: 2048,
  },
  lite: {
    id: "lite",
    tokens: 25,
    maxDurationSec: 15 * 60,
    playlistMax: 20,
    parallel: 2,
    maxBitrate: 192,
    formats: ["mp3", "ogg", "m4a"],
    effects: ["eq", "reverb"],
    ranges: { speed: [0.6, 1.4], pitch: 6, volume: 9, fade: 6, bass: [-4, 10], treble: [-4, 6], reverb: 45 },
    smartCompress: "standard",
    fileTtlHours: 12,
    historyMax: 150,
    bulkRoblox: 5,
    library: "basic",
    priority: false,
    albumSplit: false,
    imageMaxSide: 2048,
    upscaleScales: [2, 4],
    imageBg: "full",
    imageAi: "standard",
    skyboxMaxFace: 2048,
  },
  pro: {
    id: "pro",
    tokens: 60,
    maxDurationSec: 30 * 60,
    playlistMax: 50,
    parallel: 3,
    maxBitrate: 320,
    formats: ["mp3", "ogg", "m4a", "wav", "flac"],
    effects: ["eq", "reverb", "spatial8d"],
    ranges: { speed: [0.6, 1.6], pitch: 8, volume: 12, fade: 10, bass: [-6, 12], treble: [-6, 10], reverb: 60 },
    smartCompress: "max",
    fileTtlHours: 24,
    historyMax: 300,
    bulkRoblox: 15,
    library: "full",
    priority: true,
    albumSplit: false,
    imageMaxSide: 2560,
    upscaleScales: [2, 4],
    imageBg: "full",
    imageAi: "standard",
    skyboxMaxFace: 2048,
  },
  studio: {
    id: "studio",
    tokens: 150,
    maxDurationSec: 60 * 60,
    playlistMax: 100,
    parallel: 4,
    maxBitrate: 320,
    formats: ["mp3", "ogg", "m4a", "wav", "flac"],
    effects: ["eq", "reverb", "spatial8d"],
    ranges: { speed: [0.5, 1.8], pitch: 10, volume: 15, fade: 12, bass: [-8, 16], treble: [-8, 12], reverb: 80 },
    smartCompress: "max",
    fileTtlHours: 48,
    historyMax: 600,
    bulkRoblox: 40,
    library: "full",
    priority: true,
    albumSplit: true,
    imageMaxSide: 4096,
    upscaleScales: [2, 4],
    imageBg: "full",
    imageAi: "pro",
    skyboxMaxFace: 4096,
  },
  ultimate: {
    id: "ultimate",
    tokens: 400,
    maxDurationSec: 2 * 60 * 60,
    playlistMax: 200,
    parallel: 5,
    maxBitrate: 320,
    formats: ["mp3", "ogg", "m4a", "wav", "flac"],
    effects: ["eq", "reverb", "spatial8d", "master"],
    ranges: { speed: [0.5, 2], pitch: 12, volume: 20, fade: 15, bass: [-10, 20], treble: [-10, 15], reverb: 100 },
    smartCompress: "max",
    fileTtlHours: 72,
    historyMax: 1000,
    bulkRoblox: null,
    library: "full",
    priority: true,
    albumSplit: true,
    imageMaxSide: 6144,
    upscaleScales: [2, 4],
    imageBg: "full",
    imageAi: "pro",
    skyboxMaxFace: 4096,
  },
  // Semua fitur terbuka; durasi = batas keras server (MAX_DURATION_SEC tetap jadi plafon, lihat planCap)
  admin: {
    id: "admin",
    tokens: null,
    maxDurationSec: 4 * 60 * 60,
    playlistMax: 200,
    parallel: 5,
    maxBitrate: 320,
    formats: ["mp3", "ogg", "m4a", "wav", "flac"],
    effects: ["eq", "reverb", "spatial8d", "master"],
    ranges: { speed: [0.5, 2], pitch: 12, volume: 20, fade: 15, bass: [-10, 20], treble: [-10, 15], reverb: 100 },
    smartCompress: "max",
    fileTtlHours: 72,
    historyMax: 1000,
    bulkRoblox: null,
    library: "full",
    priority: true,
    albumSplit: true,
    imageMaxSide: 8192,
    upscaleScales: [2, 4],
    imageBg: "full",
    imageAi: "pro",
    skyboxMaxFace: 4096,
  },
};

// ---------- Token ----------

/**
 * Aturan token bawaan (bisa diatur admin): jatah token tiap plan terisi penuh lagi setiap `windowHours`
 * (dihitung sejak token pertama dipakai). 1 convert = 1 token per `minutesPerToken` menit audio, minimal 1.
 */
export interface TokenRules {
  windowHours: number;
  minutesPerToken: number;
}
export const TOKEN_RULES: TokenRules = { windowHours: 5, minutesPerToken: 5 };

/** Biaya token convert untuk durasi ini (detik); durasi belum diketahui → 1 */
export const tokenCost = (durationSec: number | null | undefined, rules: TokenRules = TOKEN_RULES): number =>
  Math.max(1, Math.ceil((durationSec ?? 0) / (rules.minutesPerToken * 60)));

/** Batas teratas semua plan (termasuk admin) — dipakai untuk batas keras download / baca riwayat */
export const PLAN_CAP = {
  maxDurationSec: Math.max(...ALL_PLAN_IDS.map((p) => PLANS[p].maxDurationSec)),
  playlistMax: Math.max(...ALL_PLAN_IDS.map((p) => PLANS[p].playlistMax)),
  historyMax: Math.max(...ALL_PLAN_IDS.map((p) => PLANS[p].historyMax)),
};

/** Plan publik termurah yang memenuhi syarat (untuk label kunci "Pro" / "Studio") */
export const cheapestPlan = (test: (p: PlanLimits) => boolean): PublicPlanId => PLAN_IDS.find((id) => test(PLANS[id])) ?? "ultimate";

/** Plan tanpa tingkat di atasnya untuk user (Ultimate) atau admin — tidak perlu ajakan upgrade */
export const isTopPlan = (id: PlanId) => id === "ultimate" || id === ADMIN_PLAN;

// ---------- Harga (Rupiah, dibayar via QRIS) ----------

/** Harga per bulan; free = 0 (tidak bisa dibeli) */
export const PLAN_PRICE: Record<PublicPlanId, number> = { free: 0, lite: 15_000, pro: 39_000, studio: 79_000, ultimate: 149_000 };
export const PAID_PLANS = ["lite", "pro", "studio", "ultimate"] as const satisfies readonly PublicPlanId[];
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

/** Plan publik yang sah (plan admin tidak termasuk — tidak bisa disimpan untuk user) */
export const isPlanId = (v: unknown): v is PublicPlanId => typeof v === "string" && (PLAN_IDS as readonly string[]).includes(v);

/** Efek berbayar yang dipakai sekumpulan opsi (mis. untuk mengunci preset Bass Boost / 8D) */
export function effectsUsed(o: Partial<AudioOptions>): EffectId[] {
  const out: EffectId[] = [];
  if (o.bass || o.treble) out.push("eq");
  if (o.reverb) out.push("reverb");
  if (o.spatial8d) out.push("spatial8d");
  if (o.master) out.push("master");
  return out;
}

const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Turunkan opsi ke batas plan (mis. preferensi tersimpan dari plan lama / setelah downgrade) */
export function clampOptions(o: AudioOptions, plan: PlanLimits): AudioOptions {
  const next = { ...o };
  const r = plan.ranges;
  next.speed = clampNum(next.speed, r.speed[0], r.speed[1]);
  next.pitch = clampNum(next.pitch, -r.pitch, r.pitch);
  next.volume = clampNum(next.volume, -r.volume, r.volume);
  next.fadeIn = clampNum(next.fadeIn, 0, r.fade);
  next.fadeOut = clampNum(next.fadeOut, 0, r.fade);
  if (plan.smartCompress === "off") next.compress = false;
  if (!plan.formats.includes(next.format)) next.format = plan.formats[0];
  if (next.bitrate > plan.maxBitrate) next.bitrate = plan.maxBitrate;
  if (!plan.effects.includes("eq")) Object.assign(next, { bass: 0, treble: 0 });
  else {
    next.bass = clampNum(next.bass, r.bass[0], r.bass[1]);
    next.treble = clampNum(next.treble, r.treble[0], r.treble[1]);
  }
  next.reverb = plan.effects.includes("reverb") ? clampNum(next.reverb, 0, r.reverb) : 0;
  if (!plan.effects.includes("spatial8d")) next.spatial8d = false;
  if (!plan.effects.includes("master")) next.master = false;
  return next;
}

/** Opsi (mis. preset) bisa dipakai utuh di plan ini tanpa diturunkan */
export function fitsPlan(opts: Partial<AudioOptions>, plan: PlanLimits): boolean {
  const full: AudioOptions = { ...DEFAULT_OPTIONS, ...opts };
  const clamped = clampOptions(full, plan);
  return (Object.keys(opts) as (keyof AudioOptions)[]).every((k) => clamped[k] === full[k]);
}

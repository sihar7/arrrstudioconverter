import { z } from "zod";

// Skema opsi konversi — dipakai bersama oleh UI (default & batas slider) dan API (validasi)

export const AUDIO_FORMATS = ["mp3", "ogg", "wav", "flac", "m4a"] as const;
export const ROBLOX_FORMATS = ["mp3", "ogg", "wav", "flac"] as const;
export const BITRATES = [96, 128, 192, 256, 320] as const;
export const SAMPLE_RATES = [44100, 48000] as const;

export const LIMITS = {
  speed: { min: 0.5, max: 2, step: 0.01 },
  pitch: { min: -12, max: 12, step: 0.5 },
  volume: { min: -20, max: 20, step: 0.5 },
  bass: { min: -10, max: 20, step: 0.5 },
  treble: { min: -10, max: 15, step: 0.5 },
  reverb: { min: 0, max: 100, step: 1 },
  fade: { min: 0, max: 15, step: 0.5 },
} as const;

const num = (r: { min: number; max: number }) => z.number().finite().min(r.min).max(r.max);

export const audioOptionsSchema = z
  .object({
    format: z.enum(AUDIO_FORMATS),
    bitrate: z.union([z.literal(96), z.literal(128), z.literal(192), z.literal(256), z.literal(320)]),
    sampleRate: z.union([z.literal(44100), z.literal(48000)]),
    mono: z.boolean(),
    // Kompres pintar: VBR + bitrate tidak melebihi kualitas sumber → file kecil, kualitas terdengar sama
    compress: z.boolean().default(true),
    speed: num(LIMITS.speed),
    pitch: num(LIMITS.pitch),
    // true = tempo berubah tanpa mengubah nada; false = gaya piringan (nightcore/slowed)
    preservePitch: z.boolean(),
    volume: num(LIMITS.volume),
    bass: num(LIMITS.bass),
    treble: num(LIMITS.treble),
    reverb: num(LIMITS.reverb),
    spatial8d: z.boolean(),
    normalize: z.boolean(),
    // Mode Master (khusus admin): mastering adaptif per lagu — EQ korektif, glue, kilau, stereo, loudness 2-pass
    master: z.boolean().default(false),
    fadeIn: num(LIMITS.fade),
    fadeOut: num(LIMITS.fade),
    trimStart: z.number().finite().min(0).max(86400).nullable(),
    trimEnd: z.number().finite().min(0).max(86400).nullable(),
  })
  .refine((o) => o.trimStart == null || o.trimEnd == null || o.trimEnd > o.trimStart + 0.5, {
    message: "trimEnd harus lebih besar dari trimStart",
    path: ["trimEnd"],
  });

export type AudioOptions = z.infer<typeof audioOptionsSchema>;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

export const DEFAULT_OPTIONS: AudioOptions = {
  format: "mp3",
  bitrate: 192,
  sampleRate: 44100,
  mono: false,
  compress: true,
  speed: 1,
  pitch: 0,
  preservePitch: true,
  volume: 0,
  bass: 0,
  treble: 0,
  reverb: 0,
  spatial8d: false,
  normalize: false,
  master: false,
  fadeIn: 0,
  fadeOut: 0,
  trimStart: null,
  trimEnd: null,
};

export const PRESETS = {
  normal: {},
  // Lolos moderasi lalu diputar seperti asli: resample murni (tempo + nada naik bareng, tanpa time-stretch)
  // → PlaybackSpeed 1/speed di Roblox membalik keduanya persis. Tanpa VBR (lossy ganda) + loudness rata.
  robloxBypass: { speed: 1.25, preservePitch: false, pitch: 0, compress: false, normalize: true },
  nightcore: { speed: 1.25, preservePitch: false, pitch: 0 },
  spedUp: { speed: 1.3, preservePitch: true, pitch: 0 },
  slowed: { speed: 0.85, preservePitch: false, pitch: 0, reverb: 0 },
  slowedReverb: { speed: 0.85, preservePitch: false, pitch: 0, reverb: 45 },
  bassBoost: { bass: 10, normalize: true },
  eightD: { spatial8d: true, reverb: 20 },
  // Khusus admin (plan dengan efek "master"); disembunyikan dari plan lain
  master: { master: true },
} satisfies Record<string, Partial<AudioOptions>>;

export type PresetId = keyof typeof PRESETS;

export const createJobSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  options: audioOptionsSchema,
  // Judul tetap (lagu dari video album) — tidak ditimpa judul video; dibersihkan server sebelum jadi nama file
  title: z.string().trim().min(1).max(200).optional(),
});

export const robloxUploadSchema = z.object({
  fileId: z.string().regex(/^[a-f0-9]{32}$/),
  historyId: z.string().regex(/^[a-f0-9]{16}$/).optional(),
  apiKey: z.string().min(20).max(4000),
  creatorType: z.enum(["user", "group"]),
  creatorId: z.string().regex(/^\d{1,20}$/),
  displayName: z.string().trim().min(1).max(50),
  description: z.string().max(1000).default(""),
  permission: z.enum(["none", "place", "public"]).default("none"),
  placeId: z.string().regex(/^\d{1,20}$/).optional(),
});

export const spoofSchema = z.object({
  apiKey: z.string().min(20).max(4000),
  kind: z.enum(["audio", "animation"]),
  sourceId: z.string().regex(/^\d{1,20}$/),
  name: z.string().trim().max(50).default(""),
  // false = hanya siapkan file untuk diimpor manual di Studio (tanpa upload ulang)
  autoUpload: z.boolean().default(true),
  creatorType: z.enum(["user", "group"]),
  creatorId: z.string().regex(/^\d{1,20}$/),
  permission: z.enum(["none", "place", "public"]).default("none"),
  placeId: z.string().regex(/^\d{1,20}$/).optional(),
});

export const spoofRefreshSchema = z.object({
  apiKey: z.string().min(20).max(4000),
});

export const robloxPermissionSchema = z.object({
  apiKey: z.string().min(20).max(4000),
  assetIds: z.array(z.string().regex(/^\d{1,20}$/)).min(1).max(50),
  mode: z.enum(["place", "public"]),
  placeId: z.string().regex(/^\d{1,20}$/).optional(),
  historyId: z.string().regex(/^[a-f0-9]{16}$/).optional(),
  // Massal dari riwayat: tiap entri dicatat & diterapkan (status tersimpan di riwayat)
  historyIds: z.array(z.string().regex(/^[a-f0-9]{16}$/)).max(50).optional(),
});

export const robloxLibrarySchema = z.object({
  apiKey: z.string().min(20).max(4000),
  creatorType: z.enum(["user", "group"]),
  creatorId: z.string().regex(/^\d{1,20}$/),
  pageToken: z.string().max(500).optional(),
  // Diisi manual (mis. aset grup) → lewati inventory, langsung ambil detail
  assetIds: z.array(z.string().regex(/^\d{1,20}$/)).max(50).optional(),
});

export const robloxArchiveSchema = z.object({
  apiKey: z.string().min(20).max(4000),
  assetIds: z.array(z.string().regex(/^\d{1,20}$/)).min(1).max(50),
  archive: z.boolean(),
});

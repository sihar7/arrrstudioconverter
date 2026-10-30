import { AUDIO_FORMATS, BITRATES, type PresetId } from "@/lib/schemas/convert.schema";

export const MAX_PARALLEL = 2;
export const POLL_MS = 1000;
export const OPERATION_POLL_MS = 4000;
// Upload massal: semua dikirim serentak (server mengulang otomatis bila kena rate limit 429)
export const UPLOAD_PARALLEL = 10;
export const ROBLOX_SOFT_LIMIT_SEC = 7 * 60;

export const FORMAT_OPTIONS = AUDIO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));
export const BITRATE_OPTIONS = BITRATES.map((b) => ({ value: b, label: `${b} kbps` }));
export const SPEED_QUICK = [0.8, 1, 1.25, 1.3, 1.5];
// "master" khusus plan Ultimate & admin (SettingsPanel menyembunyikannya dari plan lain)
export const PRESET_ORDER: PresetId[] = ["normal", "nightcore", "spedUp", "slowed", "slowedReverb", "bassBoost", "eightD", "master"];

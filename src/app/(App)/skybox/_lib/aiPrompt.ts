/**
 * "Ide → prompt": ide singkat (bahasa apa pun, mis. "malam bulan purnama horor") disusun AI jadi kolom prompt
 * skybox lewat server (BE /api/skybox/prompt, Claude — key hanya di server). AI belum aktif / gagal →
 * penyusun lokal berbasis kata kunci, jadi tombolnya selalu menghasilkan sesuatu.
 */
import { apiFetch, ApiError } from "@/lib/utils";
import type { PromptFields, PromptStyle } from "./prompts";

/** off = AI belum diaktifkan di server · busy = AI ada tapi gagal kali ini */
export type AiFailure = "off" | "busy";

/** ultra = Ultra detail (admin): server mengisi juga cahaya, atmosfer, palet & detail */
export async function aiCompose(idea: string, style: PromptStyle, signal?: AbortSignal, ultra = false): Promise<PromptFields> {
  return apiFetch<PromptFields>("/api/skybox/prompt", { method: "POST", json: { idea: idea.slice(0, 300), style, detail: ultra ? "ultra" : "standard" }, signal });
}

export const failureOf = (e: unknown): AiFailure => (e instanceof ApiError && e.code === "AI_OFF" ? "off" : "busy");

// ============================================================
// Cadangan lokal: kata kunci (ID + EN) → potongan deskripsi
// ============================================================

interface Rule {
  re: RegExp;
  scene: string;
  subject?: string;
  top?: string;
  bottom?: string;
  avoid?: string;
}

// Urutan = prioritas: waktu → cuaca → suasana/tema (potongan pertama yang cocok tiap kelompok dipakai)
const TIME: Rule[] = [
  { re: /subuh|fajar|sunrise|dawn|pagi|morning/i, scene: "a fresh sunrise sky with soft peach and gold light", subject: "the rising sun", top: "pale morning blue", bottom: "warm golden haze" },
  { re: /siang|noon|midday|terik|cerah|clear|sunny/i, scene: "a bright clear midday sky in saturated blue", subject: "a bright small cloud", top: "deep zenith blue", bottom: "light blue haze" },
  { re: /senja|twilight|dusk|maghrib/i, scene: "a calm blue-hour twilight with a coral horizon fading to indigo", subject: "the afterglow on the horizon", top: "indigo with first stars", bottom: "soft coral afterglow" },
  { re: /sore|sunset|petang|matahari terbenam|golden/i, scene: "a vivid sunset with glowing orange and pink clouds", subject: "the setting sun", top: "deep violet blue", bottom: "fiery orange horizon" },
  { re: /malam|night|bulan|moon|bintang|star|galaxy|galaksi/i, scene: "a dark night sky full of soft stars", subject: "the bright moon", top: "dark navy with stars", bottom: "dim blue glow" },
];
const WEATHER: Rule[] = [
  { re: /badai|petir|storm|thunder|lightning/i, scene: "heavy rotating storm clouds with bright lightning bolts", subject: "the brightest lightning strike", avoid: "rain on lens" },
  { re: /hujan|rain|gerimis/i, scene: "layered grey rain clouds with distant rain curtains" },
  { re: /salju|snow|winter|musim dingin|es\b|ice/i, scene: "gentle falling snowflakes under pale winter clouds", bottom: "white snowy haze" },
  { re: /kabut|fog|mist|berkabut/i, scene: "thick drifting fog layers and very soft diffuse light", bottom: "dense white fog bank" },
  { re: /mendung|overcast|cloudy|berawan/i, scene: "an even layer of soft grey overcast clouds" },
  { re: /aurora|northern lights/i, scene: "wide green and violet aurora curtains rippling across the sky", subject: "the brightest aurora curtain" },
];
const MOOD: Rule[] = [
  { re: /horor|horror|seram|creepy|blood|darah|halloween/i, scene: "an eerie ominous atmosphere with a blood-red tint", avoid: "gore, characters" },
  { re: /cyber|neon|futur/i, scene: "glowing magenta and cyan neon haze on smoggy clouds" },
  { re: /anime|kartun|cartoon/i, scene: "crisp anime-style cloud shapes with clean cel shading" },
  { re: /fantasi|fantasy|magic|ajaib|pulau melayang|floating/i, scene: "distant floating rock islands drifting among glowing clouds", subject: "the largest floating island" },
  { re: /luar angkasa|space|nebula|planet/i, scene: "a giant swirling nebula with distant planets and dense stars", subject: "the nebula core", top: "black space with stars" },
  { re: /pastel|dreamy|lembut|cute|imut/i, scene: "dreamy pastel pink, lilac and mint clouds with a soft magical glow" },
  { re: /laut|ocean|sea|pantai|beach/i, scene: "an endless calm ocean reflecting the sky", bottom: "calm reflective ocean" },
  { re: /gurun|desert|pasir/i, scene: "a dusty golden desert haze and a harsh bright sun", bottom: "golden dust haze" },
];

export function localCompose(idea: string): PromptFields {
  const pick = (rules: Rule[]) => rules.find((r) => r.re.test(idea));
  const hits = [pick(TIME), pick(WEATHER), pick(MOOD)].filter(Boolean) as Rule[];
  if (!hits.length) {
    // Tidak dikenali → pakai ide apa adanya sebagai deskripsi langit
    return { scene: `${idea.trim()} sky, wide and atmospheric`, subject: "the brightest part of the sky", top: "", bottom: "soft horizon haze", avoid: "ground, buildings, characters, text" };
  }
  const first = <K extends keyof Rule>(k: K) => hits.find((h) => h[k])?.[k] as string | undefined;
  const scene = hits.map((h) => h.scene).join(", ");
  return {
    scene: scene.charAt(0).toUpperCase() + scene.slice(1),
    subject: first("subject") ?? "the brightest part of the sky",
    top: first("top") ?? "",
    bottom: first("bottom") ?? "soft horizon haze",
    avoid: ["ground, buildings", first("avoid")].filter(Boolean).join(", "),
  };
}

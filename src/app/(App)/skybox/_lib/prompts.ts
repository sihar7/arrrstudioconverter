/**
 * Generator prompt AI untuk panorama skybox. Prompt ditulis dalam bahasa Inggris (model gambar
 * paling patuh pada bahasa Inggris); kerangka tata letak memaksa hasil 2:1 equirectangular yang
 * horizonnya lurus di tengah & tepi kiri-kanan menyambung — syarat agar convert 6 sisi mulus.
 */
export interface PromptFields {
  scene: string;
  subject: string;
  top: string;
  bottom: string;
  avoid: string;
}

export interface PromptPreset extends PromptFields {
  id: string;
  label: string;
  /** Thumbnail gradasi: langit atas → horizon → bawah */
  swatch: [string, string, string];
}

export const PLACEHOLDER = "[describe your sky]";

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: "blank", swatch: ["#2c2c31", "#3a3a40", "#212125"], label: "Kosong", scene: PLACEHOLDER, subject: "", top: "", bottom: "", avoid: "" },
  {
    id: "golden-hour", swatch: ["#1f4f8f", "#f2a65a", "#f6d8b0"],
    label: "Golden Hour",
    scene: "Warm golden-hour sky with tall cumulus clouds lit orange from below and a low sun glowing through thin haze",
    subject: "the low sun",
    top: "clear deep blue",
    bottom: "soft warm haze",
    avoid: "ground, buildings, birds",
  },
  {
    id: "night-galaxy", swatch: ["#070b1f", "#3b2a6b", "#0e2a44"],
    label: "Night Galaxy",
    scene: "Clear night sky with a bright Milky Way band arching across, soft purple and teal nebula glow, scattered sharp stars",
    subject: "the brightest part of the Milky Way",
    top: "dark navy with stars",
    bottom: "dark blue horizon glow",
    avoid: "moon, planets, ground",
  },
  {
    id: "aurora", swatch: ["#06122b", "#2fd39b", "#3b1e6e"],
    label: "Aurora",
    scene: "Arctic night with wide green and violet aurora curtains rippling over a calm starry sky",
    subject: "the brightest aurora curtain",
    top: "deep night blue with stars",
    bottom: "faint green horizon glow",
    avoid: "mountains, trees, people",
  },
  {
    id: "anime-day", swatch: ["#1f5fd6", "#bfe4ff", "#e9f6ff"],
    label: "Anime Daylight",
    scene: "Bright anime-style summer sky, saturated blue with huge fluffy white clouds and crisp cel-shaded edges",
    subject: "the tallest cloud tower",
    top: "rich cobalt blue",
    bottom: "pale cyan haze",
    avoid: "characters, text, city",
  },
  {
    id: "sunset-ocean", swatch: ["#5b4a8c", "#ff9c8a", "#3b5f8a"],
    label: "Sunset Ocean",
    scene: "Pink and peach sunset over an endless calm ocean, long soft clouds glowing magenta, the sea reflecting the sky",
    subject: "the setting sun on the horizon",
    top: "dusky lavender",
    bottom: "calm reflective ocean",
    avoid: "boats, islands, birds",
  },
  {
    id: "storm", swatch: ["#0d1114", "#3b4f57", "#1d2a30"],
    label: "Thunderstorm",
    scene: "Dramatic dark thunderstorm with heavy rotating clouds, a few bright lightning bolts and a cold teal tint",
    subject: "the brightest lightning strike",
    top: "near-black storm clouds",
    bottom: "dark grey rain haze",
    avoid: "ground, buildings, rain streaks on lens",
  },
  {
    id: "sky-islands", swatch: ["#3d8fe0", "#cfe8ff", "#ffffff"],
    label: "Floating Islands",
    scene: "Fantasy sky with distant floating rock islands draped in waterfalls, drifting among soft sunlit clouds",
    subject: "the largest floating island",
    top: "bright clear blue",
    bottom: "a sea of white clouds",
    avoid: "characters, castles close-up, text",
  },
  {
    id: "nebula", swatch: ["#05050a", "#d06a2c", "#1b3a7a"],
    label: "Deep Space",
    scene: "Deep space with a giant swirling orange and blue nebula, a ringed planet far away and dense distant stars",
    subject: "the nebula core",
    top: "black space with stars",
    bottom: "dim blue nebula dust",
    avoid: "spaceships, text, lens flare",
  },
  {
    id: "overcast", swatch: ["#9aa1a8", "#c9cdd1", "#b7bcc1"],
    label: "Soft Overcast",
    scene: "Calm overcast day with an even layer of soft grey clouds and gentle diffuse light, very subtle texture",
    subject: "a slightly brighter patch of cloud",
    top: "light grey",
    bottom: "pale grey mist",
    avoid: "sun, ground, birds",
  },
  {
    id: "dreamy", swatch: ["#b9a3e3", "#ffc4dd", "#c8f1e1"],
    label: "Dream Pastel",
    scene: "Dreamy pastel sky with cotton-candy pink, lilac and mint clouds, soft glowing light and a calm magical mood",
    subject: "a glowing pastel cloud",
    top: "soft lilac",
    bottom: "pink cloud sea",
    avoid: "characters, text, hard shadows",
  },
];

export type PromptStyle = "realistic" | "anime" | "stylized" | "painterly";

const STYLE: Record<PromptStyle, string> = {
  realistic: "photorealistic, natural light",
  anime: "anime background art, clean cel shading",
  stylized: "stylized game art, smooth simple shapes",
  painterly: "soft digital painting, painterly brushwork",
};

const LAYOUT = "360° equirectangular panorama, 2:1, straight horizon at the exact middle, seamless left/right edges";
const QUALITY = "smooth gradients, soft large shapes, no text, watermark or vignette";

const clean = (s: string) => s.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");

/** Deskripsi saja — untuk generator khusus skybox (layout sudah diatur generator) */
export function buildScene(f: PromptFields, style: PromptStyle) {
  return [clean(f.scene) || PLACEHOLDER, STYLE[style]].join(", ");
}

/** Prompt lengkap untuk generator gambar umum (Bing, ChatGPT, Gemini, Midjourney, …) */
export function buildPrompt(f: PromptFields, style: PromptStyle) {
  const parts = [
    `${LAYOUT}.`,
    `${clean(f.scene) || PLACEHOLDER}.`,
    f.subject.trim() && `Centered on ${clean(f.subject)}.`,
    f.top.trim() && `Top: ${clean(f.top)}.`,
    f.bottom.trim() && `Bottom: ${clean(f.bottom)}.`,
    `${STYLE[style]}, ${QUALITY}.`,
    f.avoid.trim() && `Avoid ${clean(f.avoid)}.`,
  ];
  return parts.filter(Boolean).join(" ");
}

/** Batas aman panjang prompt (Bing Image Creator memotong sekitar 480 karakter) */
export const PROMPT_SOFT_LIMIT = 480;

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

/** Kelompok preset (filter di tab AI Prompt) */
export type PresetCat = "morning" | "day" | "evening" | "night" | "weather" | "fantasy";
export const PRESET_CATS: PresetCat[] = ["morning", "day", "evening", "night", "weather", "fantasy"];

export interface PromptPreset extends PromptFields {
  id: string;
  label: string;
  cat?: PresetCat;
  /** Thumbnail gradasi: langit atas → horizon → bawah */
  swatch: [string, string, string];
}

export const PLACEHOLDER = "[describe your sky]";

export const PROMPT_PRESETS: PromptPreset[] = [
  { id: "blank", swatch: ["#2c2c31", "#3a3a40", "#212125"], label: "Kosong", scene: PLACEHOLDER, subject: "", top: "", bottom: "", avoid: "" },
  {
    id: "golden-hour", cat: "evening", swatch: ["#1f4f8f", "#f2a65a", "#f6d8b0"],
    label: "Golden Hour",
    scene: "Warm golden-hour sky with tall cumulus clouds lit orange from below and a low sun glowing through thin haze",
    subject: "the low sun",
    top: "clear deep blue",
    bottom: "soft warm haze",
    avoid: "ground, buildings, birds",
  },
  {
    id: "night-galaxy", cat: "night", swatch: ["#070b1f", "#3b2a6b", "#0e2a44"],
    label: "Night Galaxy",
    scene: "Clear night sky with a bright Milky Way band arching across, soft purple and teal nebula glow, scattered sharp stars",
    subject: "the brightest part of the Milky Way",
    top: "dark navy with stars",
    bottom: "dark blue horizon glow",
    avoid: "moon, planets, ground",
  },
  {
    id: "aurora", cat: "night", swatch: ["#06122b", "#2fd39b", "#3b1e6e"],
    label: "Aurora",
    scene: "Arctic night with wide green and violet aurora curtains rippling over a calm starry sky",
    subject: "the brightest aurora curtain",
    top: "deep night blue with stars",
    bottom: "faint green horizon glow",
    avoid: "mountains, trees, people",
  },
  {
    id: "anime-day", cat: "day", swatch: ["#1f5fd6", "#bfe4ff", "#e9f6ff"],
    label: "Anime Daylight",
    scene: "Bright anime-style summer sky, saturated blue with huge fluffy white clouds and crisp cel-shaded edges",
    subject: "the tallest cloud tower",
    top: "rich cobalt blue",
    bottom: "pale cyan haze",
    avoid: "characters, text, city",
  },
  {
    id: "sunset-ocean", cat: "evening", swatch: ["#5b4a8c", "#ff9c8a", "#3b5f8a"],
    label: "Sunset Ocean",
    scene: "Pink and peach sunset over an endless calm ocean, long soft clouds glowing magenta, the sea reflecting the sky",
    subject: "the setting sun on the horizon",
    top: "dusky lavender",
    bottom: "calm reflective ocean",
    avoid: "boats, islands, birds",
  },
  {
    id: "storm", cat: "weather", swatch: ["#0d1114", "#3b4f57", "#1d2a30"],
    label: "Thunderstorm",
    scene: "Dramatic dark thunderstorm with heavy rotating clouds, a few bright lightning bolts and a cold teal tint",
    subject: "the brightest lightning strike",
    top: "near-black storm clouds",
    bottom: "dark grey rain haze",
    avoid: "ground, buildings, rain streaks on lens",
  },
  {
    id: "sky-islands", cat: "fantasy", swatch: ["#3d8fe0", "#cfe8ff", "#ffffff"],
    label: "Floating Islands",
    scene: "Fantasy sky with distant floating rock islands draped in waterfalls, drifting among soft sunlit clouds",
    subject: "the largest floating island",
    top: "bright clear blue",
    bottom: "a sea of white clouds",
    avoid: "characters, castles close-up, text",
  },
  {
    id: "nebula", cat: "fantasy", swatch: ["#05050a", "#d06a2c", "#1b3a7a"],
    label: "Deep Space",
    scene: "Deep space with a giant swirling orange and blue nebula, a ringed planet far away and dense distant stars",
    subject: "the nebula core",
    top: "black space with stars",
    bottom: "dim blue nebula dust",
    avoid: "spaceships, text, lens flare",
  },
  {
    id: "overcast", cat: "weather", swatch: ["#9aa1a8", "#c9cdd1", "#b7bcc1"],
    label: "Soft Overcast",
    scene: "Calm overcast day with an even layer of soft grey clouds and gentle diffuse light, very subtle texture",
    subject: "a slightly brighter patch of cloud",
    top: "light grey",
    bottom: "pale grey mist",
    avoid: "sun, ground, birds",
  },
  {
    id: "dreamy", cat: "fantasy", swatch: ["#b9a3e3", "#ffc4dd", "#c8f1e1"],
    label: "Dream Pastel",
    scene: "Dreamy pastel sky with cotton-candy pink, lilac and mint clouds, soft glowing light and a calm magical mood",
    subject: "a glowing pastel cloud",
    top: "soft lilac",
    bottom: "pink cloud sea",
    avoid: "characters, text, hard shadows",
  },
  {
    id: "sunrise", cat: "morning", swatch: ["#3a5ba8", "#ffb27a", "#ffe3c4"],
    label: "Sunrise",
    scene: "Fresh sunrise sky, the sun just above the horizon, soft peach and gold light spreading under thin pink clouds",
    subject: "the rising sun",
    top: "pale morning blue",
    bottom: "warm golden haze",
    avoid: "ground, buildings, birds",
  },
  {
    id: "morning-mist", cat: "morning", swatch: ["#8fb3d9", "#e9eef2", "#d6dde2"],
    label: "Morning Mist",
    scene: "Quiet early morning sky with low silver mist, a pale sun diffused behind soft layered clouds, cool calm light",
    subject: "the diffused morning sun",
    top: "light hazy blue",
    bottom: "thick white mist",
    avoid: "ground, trees, birds",
  },
  {
    id: "clear-noon", cat: "day", swatch: ["#1d6fe0", "#7fc0ff", "#d9efff"],
    label: "Clear Noon",
    scene: "Bright clear midday sky, deep saturated blue fading lighter toward the horizon, a few small wispy clouds",
    subject: "a small bright cloud",
    top: "deep zenith blue",
    bottom: "light blue haze",
    avoid: "sun flare, ground, birds",
  },
  {
    id: "cumulus-day", cat: "day", swatch: ["#2f7de0", "#cfe6ff", "#ffffff"],
    label: "Fluffy Clouds",
    scene: "Sunny summer day with big puffy white cumulus clouds scattered across a vivid blue sky, crisp natural light",
    subject: "the largest cumulus cloud",
    top: "vivid blue",
    bottom: "soft white cloud bank",
    avoid: "ground, buildings, planes",
  },
  {
    id: "classic-sunset", cat: "evening", swatch: ["#3b2b6e", "#ff6a3d", "#ffc06b"],
    label: "Classic Sunset",
    scene: "Vivid orange and red sunset with streaks of glowing clouds, the sun half below the horizon and a purple sky above",
    subject: "the setting sun",
    top: "deep violet blue",
    bottom: "fiery orange horizon",
    avoid: "ground, silhouettes, birds",
  },
  {
    id: "twilight", cat: "evening", swatch: ["#141a3d", "#5b5aa8", "#f08a6b"],
    label: "Twilight",
    scene: "Calm blue-hour twilight just after sunset, gradient from coral at the horizon to indigo above, first stars appearing",
    subject: "the brightest glow near the horizon",
    top: "indigo with faint stars",
    bottom: "soft coral afterglow",
    avoid: "moon, ground, city lights",
  },
  {
    id: "moonlit-night", cat: "night", swatch: ["#050914", "#1d2f55", "#2c3e66"],
    label: "Moonlit Night",
    scene: "Peaceful night sky with a bright full moon, thin silver-edged clouds and many soft stars, cool blue moonlight",
    subject: "the full moon",
    top: "dark navy with stars",
    bottom: "dim blue cloud layer",
    avoid: "planets, ground, buildings",
  },
  {
    id: "starry-night", cat: "night", swatch: ["#02040c", "#101a33", "#18243f"],
    label: "Starry Night",
    scene: "Clear dark night with thousands of crisp stars, subtle color variation and a faint glow low on the horizon",
    subject: "a dense cluster of bright stars",
    top: "pure black with stars",
    bottom: "faint deep-blue glow",
    avoid: "moon, milky way, ground",
  },
  {
    id: "city-night", cat: "night", swatch: ["#0b0c1c", "#3a2a5c", "#d9784a"],
    label: "City Glow Night",
    scene: "Night sky over a distant city, low clouds lit warm orange from below by city lights, few stars above",
    subject: "the brightest lit cloud",
    top: "dark purple-blue",
    bottom: "warm orange light pollution haze",
    avoid: "buildings close-up, text, planes",
  },
  {
    id: "rainy", cat: "weather", swatch: ["#2d3740", "#56636d", "#3a454e"],
    label: "Rainy Day",
    scene: "Grey rainy sky with heavy layered rain clouds, soft falling rain curtains in the distance, cool muted light",
    subject: "a distant rain curtain",
    top: "dark grey clouds",
    bottom: "misty grey rain haze",
    avoid: "lightning, ground, water drops on lens",
  },
  {
    id: "snowy", cat: "weather", swatch: ["#8ea3b8", "#dbe4ec", "#f4f7fa"],
    label: "Snowy Winter",
    scene: "Soft winter sky with gentle falling snowflakes, pale overcast clouds and a cold bright diffuse light",
    subject: "a brighter patch of winter cloud",
    top: "pale grey-blue",
    bottom: "white snowy haze",
    avoid: "ground, trees, people",
  },
  {
    id: "foggy", cat: "weather", swatch: ["#7b8086", "#a8adb2", "#c9cccf"],
    label: "Dense Fog",
    scene: "Mysterious foggy sky, thick drifting fog layers and a faint hidden sun, low contrast and very soft light",
    subject: "the faint hidden sun",
    top: "soft grey fog",
    bottom: "dense white fog bank",
    avoid: "ground, silhouettes, text",
  },
  {
    id: "desert-haze", cat: "weather", swatch: ["#7a8fb0", "#e8b98a", "#d99a5b"],
    label: "Desert Heat",
    scene: "Hot desert sky with dusty golden haze, a harsh bright sun and thin high clouds, warm sandy atmosphere",
    subject: "the bright desert sun",
    top: "washed-out blue",
    bottom: "golden dust haze",
    avoid: "dunes close-up, ground, people",
  },
  {
    id: "blood-moon", cat: "fantasy", swatch: ["#120406", "#5c0f14", "#2a0a10"],
    label: "Blood Moon",
    scene: "Eerie horror night with a huge blood-red moon, dark crimson clouds and thin drifting fog, ominous atmosphere",
    subject: "the blood-red moon",
    top: "black-red sky",
    bottom: "dark red fog",
    avoid: "gore, characters, text",
  },
  {
    id: "neon-cyber", cat: "fantasy", swatch: ["#0a0420", "#c2189b", "#1fb5d6"],
    label: "Neon Cyber",
    scene: "Cyberpunk night sky with glowing magenta and cyan neon haze reflecting on low smoggy clouds, futuristic mood",
    subject: "the brightest neon glow",
    top: "deep violet-black",
    bottom: "magenta-cyan smog",
    avoid: "buildings close-up, text, logos",
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

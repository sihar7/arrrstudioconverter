/**
 * Paket pencahayaan yang cocok dengan skybox — Atmosphere + ColorCorrection + ClockTime + GeographicLatitude —
 * diturunkan dari warna 6 sisi hasil convert. Tema langit (siang / senja / malam) ditebak dari terang & hangatnya
 * horizon; dari langit hanya diambil RONA warnanya, terangnya mengikuti kebiasaan Roblox (Atmosphere sudah
 * digelapkan sendiri oleh waktu & cahaya, jadi warna gelap dari langit malam justru membuat semuanya hitam).
 * Semua di perangkat (canvas 64×64 per sisi), tanpa upload.
 */
import type { FaceId } from "./skyMath";

type Rgb = [number, number, number];

export type SkyTheme = "day" | "dusk" | "night";

export interface SkyAtmosphere {
  theme: SkyTheme;
  /** Atmosphere — warna 0–255 */
  color: Rgb;
  decay: Rgb;
  density: number;
  offset: number;
  glare: number;
  haze: number;
  /** Lighting */
  clockTime: number;
  latitude: number;
  /** ColorCorrectionEffect */
  ccBrightness: number;
  ccContrast: number;
  ccSaturation: number;
  ccTint: Rgb;
}

const SIDES: FaceId[] = ["ft", "bk", "lf", "rt"];
const SAMPLE = 64;

const lum = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, step: number) => Math.round(v / step) * step;
const to255 = (c: Rgb): Rgb => c.map((v) => Math.round(clamp(v, 0, 1) * 255)) as Rgb;

function hsv([r, g, b]: Rgb) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

function fromHsv(h: number, s: number, v: number): Rgb {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

/** Rona `c` dengan kejenuhan & terang yang ditentukan (rona abu → tetap abu) */
const recolor = (c: Rgb, s: number, v: number) => {
  const x = hsv(c);
  return fromHsv(x.h, Math.min(s, x.s * 1.6), v);
};

async function pixels(blob: Blob) {
  const bmp = await createImageBitmap(blob, { resizeWidth: SAMPLE, resizeHeight: SAMPLE, resizeQuality: "medium" });
  const c = new OffscreenCanvas(SAMPLE, SAMPLE);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
}

/** Rata-rata warna baris [y0, y1) (0–1) + luminans piksel paling terang */
function band(data: Uint8ClampedArray, y0: number, y1: number) {
  const sum: Rgb = [0, 0, 0];
  let peak = 0;
  let n = 0;
  for (let y = Math.floor(y0); y < y1; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const i = (y * SAMPLE + x) * 4;
      const px: Rgb = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
      sum[0] += px[0];
      sum[1] += px[1];
      sum[2] += px[2];
      peak = Math.max(peak, lum(px));
      n++;
    }
  }
  return { avg: sum.map((v) => v / n) as Rgb, peak };
}

export async function analyzeAtmosphere(faces: Record<FaceId, { blob: Blob }>): Promise<SkyAtmosphere> {
  let horizon: Rgb = [0, 0, 0];
  let upper: Rgb = [0, 0, 0];
  let peak = 0;
  for (const face of SIDES) {
    const data = await pixels(faces[face].blob);
    // Baris tengah sisi samping = garis horizon; seperempat atas = langit di atas horizon
    const h = band(data, SAMPLE * 0.42, SAMPLE * 0.52);
    const u = band(data, 0, SAMPLE * 0.25);
    horizon = horizon.map((v, i) => v + h.avg[i] / SIDES.length) as Rgb;
    upper = upper.map((v, i) => v + u.avg[i] / SIDES.length) as Rgb;
    peak = Math.max(peak, h.peak, u.peak);
  }
  const top = band(await pixels(faces.up.blob), 0, SAMPLE);
  peak = Math.max(peak, top.peak);
  const zenith = mix(top.avg, upper, 0.4);

  const light = Math.max(lum(horizon), lum(zenith) * 0.8);
  const warm = horizon[0] - horizon[2];
  const theme: SkyTheme = light < 0.14 ? "night" : warm > 0.06 && light < 0.62 ? "dusk" : "day";
  const sun = peak > 0.96 && theme !== "night";
  const grey = 1 - hsv(horizon).s;

  if (theme === "night") {
    return {
      theme,
      // Malam: kabut terang keabu-abuan + decay biru pekat (Roblox menggelapkannya sendiri)
      color: to255(recolor(horizon, 0.12, 0.85)),
      decay: to255(recolor(zenith, 1, 0.5)),
      // Acuan: tema Night ArrStudio (Density 0.333 · Offset 0.28 · Glare 0.21 · Haze 1.2)
      density: 0.333,
      offset: 0.28,
      glare: 0.21,
      haze: 1.2,
      clockTime: 0,
      latitude: 41.7,
      ccBrightness: 0,
      ccContrast: 0.15,
      ccSaturation: -0.05,
      ccTint: to255(recolor(zenith, 0.1, 1)),
    };
  }
  if (theme === "dusk") {
    return {
      theme,
      color: to255(recolor(horizon, 0.35, 0.95)),
      decay: to255(recolor(zenith, 0.75, 0.55)),
      density: 0.35,
      offset: 0.3,
      glare: sun ? 0.6 : 0.3,
      haze: 1.8,
      clockTime: 17.7,
      latitude: 41.7,
      ccBrightness: 0,
      ccContrast: 0.1,
      ccSaturation: 0.15,
      ccTint: to255(recolor(horizon, 0.08, 1)),
    };
  }
  const haze = clamp(grey * light * 1.5, 0, 2);
  return {
    theme,
    color: to255(recolor(horizon, 0.2, 0.85)),
    decay: to255(recolor(zenith, 0.5, 0.6)),
    density: round(clamp(0.25 + 0.15 * grey * Math.min(1, light * 1.5), 0.25, 0.4), 0.01),
    offset: 0.25,
    glare: sun ? round(clamp(0.2 + haze * 0.15, 0, 1), 0.05) : 0,
    haze: round(haze, 0.1),
    clockTime: 14,
    latitude: 41.7,
    ccBrightness: 0,
    ccContrast: 0.05,
    ccSaturation: 0.1,
    ccTint: [255, 255, 255],
  };
}

/** Terang cahaya matahari/bulan menurut ClockTime (dipakai preview 3D): siang 1, malam ±0.2 */
export const daylight = (clock: number) => clamp(Math.sin(((clock - 6) / 12) * Math.PI) * 1.4 + 0.25, 0.2, 1);

const n = (v: number) => Number(v.toFixed(3));

/** Baris Luau (Command Bar) — dipakai bersama script Sky */
export function atmosphereLua(a: SkyAtmosphere) {
  return [
    `Lighting.ClockTime = ${n(a.clockTime)}`,
    `Lighting.GeographicLatitude = ${n(a.latitude)}`,
    `local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")`,
    `atmosphere.Color = Color3.fromRGB(${a.color.join(", ")})`,
    `atmosphere.Decay = Color3.fromRGB(${a.decay.join(", ")})`,
    `atmosphere.Density = ${n(a.density)}`,
    `atmosphere.Offset = ${n(a.offset)}`,
    `atmosphere.Glare = ${n(a.glare)}`,
    `atmosphere.Haze = ${n(a.haze)}`,
    `atmosphere.Parent = Lighting`,
    `local cc = Lighting:FindFirstChildOfClass("ColorCorrectionEffect") or Instance.new("ColorCorrectionEffect")`,
    `cc.Brightness = ${n(a.ccBrightness)}`,
    `cc.Contrast = ${n(a.ccContrast)}`,
    `cc.Saturation = ${n(a.ccSaturation)}`,
    `cc.TintColor = Color3.fromRGB(${a.ccTint.join(", ")})`,
    `cc.Parent = Lighting`,
  ];
}

/** Script Command Bar khusus pencahayaan (isi ZIP) */
export const atmosphereScript = (a: SkyAtmosphere) =>
  [`local Lighting = game:GetService("Lighting")`, ...atmosphereLua(a), `print("Atmosphere & pencahayaan terpasang")`].join("\n");

const color3 = (name: string, c: Rgb) =>
  `<Color3 name="${name}"><R>${n(c[0] / 255)}</R><G>${n(c[1] / 255)}</G><B>${n(c[2] / 255)}</B></Color3>`;

// Referent cukup unik di dalam satu file → penghitung yang terus naik
let ref = 0;
const item = (cls: string, props: string[], children = "") =>
  `<Item class="${cls}" referent="RBX${ref++}"><Properties>${props.join("")}</Properties>${children}</Item>`;

/**
 * Folder pencahayaan untuk .rbxmx (pola tema: Atmosphere, ColorCorrection, ClockTime, GeographicLatitude [+ Sky]).
 * Isinya dipindahkan ke Lighting; ClockTime & GeographicLatitude = nilai untuk properti Lighting.
 */
export function lightingFolder(a: SkyAtmosphere, name: string, sky = "") {
  const str = (k: string, v: string) => `<string name="${k}">${v}</string>`;
  const num = (k: string, v: number) => `<float name="${k}">${n(v)}</float>`;
  const children = [
    sky,
    item("Atmosphere", [str("Name", "Atmosphere"), color3("Color", a.color), color3("Decay", a.decay), num("Density", a.density), num("Offset", a.offset), num("Glare", a.glare), num("Haze", a.haze)]),
    item("ColorCorrectionEffect", [str("Name", "ColorCorrection"), `<bool name="Enabled">true</bool>`, num("Brightness", a.ccBrightness), num("Contrast", a.ccContrast), num("Saturation", a.ccSaturation), color3("TintColor", a.ccTint)]),
    item("NumberValue", [str("Name", "ClockTime"), `<double name="Value">${n(a.clockTime)}</double>`]),
    item("NumberValue", [str("Name", "GeographicLatitude"), `<double name="Value">${n(a.latitude)}</double>`]),
  ].join("\n");
  return item("Folder", [str("Name", name)], `\n${children}\n`);
}

export const RBXMX_HEAD = `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n`;

export const atmosphereRbxmx = (a: SkyAtmosphere, name = "Lighting") => `${RBXMX_HEAD}${lightingFolder(a, name)}\n</roblox>\n`;

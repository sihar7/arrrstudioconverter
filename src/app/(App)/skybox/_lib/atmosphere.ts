/**
 * Atmosphere Roblox yang cocok dengan skybox, diturunkan dari warna 6 sisi hasil convert:
 *   horizon (pita tengah 4 sisi samping) → Color · zenith (sisi Up + pita atas) → Decay ·
 *   kejenuhan & terang horizon → Density/Haze · ada matahari (piksel hampir putih) → Glare.
 * Semua di perangkat (canvas 64×64 per sisi), tanpa upload.
 */
import type { FaceId } from "./skyMath";

type Rgb = [number, number, number];

export interface SkyAtmosphere {
  /** 0–255 */
  color: Rgb;
  decay: Rgb;
  density: number;
  offset: number;
  glare: number;
  haze: number;
}

const SIDES: FaceId[] = ["ft", "bk", "lf", "rt"];
const SAMPLE = 64;

const lum = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sat = (c: Rgb) => {
  const max = Math.max(...c);
  return max ? (max - Math.min(...c)) / max : 0;
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, step: number) => Math.round(v / step) * step;
const to255 = (c: Rgb): Rgb => c.map((v) => Math.round(clamp(v, 0, 1) * 255)) as Rgb;

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
  for (let y = y0; y < y1; y++) {
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
  return { avg: scale(sum, 1 / n), peak };
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

  const light = lum(horizon);
  const grey = 1 - sat(horizon);
  const night = light < 0.12;
  const sun = peak > 0.96 && !night;

  // Siang: kabut sedikit lebih terang dari horizon; malam: dinaikkan supaya tidak hitam pekat
  const color = night ? scale(horizon, 1.6) : mix(horizon, [1, 1, 1], 0.12);
  const decay = scale(mix(zenith, horizon, 0.3), night ? 1.2 : 0.8);
  // Langit biru cerah ≈ 1, horizon putih berkabut ≈ 1.4, malam = 0
  const haze = night ? 0 : clamp(grey * light * 1.5, 0, 2);

  return {
    color: to255(color),
    decay: to255(decay),
    density: round(clamp(0.25 + 0.15 * grey * Math.min(1, light * 1.5), 0.25, 0.4), 0.01),
    offset: 0.25,
    glare: sun ? round(clamp(0.2 + haze * 0.15, 0, 1), 0.05) : 0,
    haze: round(haze, 0.1),
  };
}

const n = (v: number) => Number(v.toFixed(2));

/** Baris Luau (Command Bar) — dipakai bersama script Sky */
export function atmosphereLua(a: SkyAtmosphere) {
  return [
    `local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")`,
    `atmosphere.Color = Color3.fromRGB(${a.color.join(", ")})`,
    `atmosphere.Decay = Color3.fromRGB(${a.decay.join(", ")})`,
    `atmosphere.Density = ${n(a.density)}`,
    `atmosphere.Offset = ${n(a.offset)}`,
    `atmosphere.Glare = ${n(a.glare)}`,
    `atmosphere.Haze = ${n(a.haze)}`,
    `atmosphere.Parent = Lighting`,
  ];
}

/** Script Command Bar khusus Atmosphere (isi ZIP) */
export const atmosphereScript = (a: SkyAtmosphere) =>
  [`local Lighting = game:GetService("Lighting")`, ...atmosphereLua(a), `print("Atmosphere terpasang")`].join("\n");

const color3 = (name: string, c: Rgb) =>
  `      <Color3 name="${name}"><R>${n(c[0] / 255)}</R><G>${n(c[1] / 255)}</G><B>${n(c[2] / 255)}</B></Color3>`;

/** Item Atmosphere untuk file .rbxmx */
export function atmosphereItem(a: SkyAtmosphere, referent = "RBX1") {
  return `  <Item class="Atmosphere" referent="${referent}">
    <Properties>
      <string name="Name">Atmosphere</string>
${color3("Color", a.color)}
${color3("Decay", a.decay)}
      <float name="Density">${n(a.density)}</float>
      <float name="Offset">${n(a.offset)}</float>
      <float name="Glare">${n(a.glare)}</float>
      <float name="Haze">${n(a.haze)}</float>
    </Properties>
  </Item>
`;
}

const RBXMX_HEAD = `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n`;

export const atmosphereRbxmx = (a: SkyAtmosphere) => `${RBXMX_HEAD}${atmosphereItem(a, "RBX0")}</roblox>\n`;

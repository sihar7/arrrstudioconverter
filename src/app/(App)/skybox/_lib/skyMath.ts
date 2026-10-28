/**
 * Geometri skybox Roblox di "ruang panorama":
 *   tengah panorama (u = 0.5) = +Z = SkyboxFt · berjalan ke KANAN di panorama: Ft → Lf → Bk → Rt.
 *   (Konvensi Roblox: Lf ada di kanan Ft saat kamera menghadap Ft; Up/Dn diputar 90°.)
 * Tiap sisi: arah tengah (dir), sumbu kanan gambar (right), sumbu atas gambar (up).
 * Piksel (s, t) ∈ [-1, 1] (s ke kanan, t ke atas) → arah = dir + s·right + t·up.
 */
import { atmosphereLua, type SkyAtmosphere } from "./atmosphere";

export type FaceId = "ft" | "lf" | "bk" | "rt" | "up" | "dn";
type Vec3 = readonly [number, number, number];

export const FACES: readonly FaceId[] = ["ft", "bk", "lf", "rt", "up", "dn"];

export const FACE_BASIS: Record<FaceId, { dir: Vec3; right: Vec3; up: Vec3 }> = {
  ft: { dir: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  lf: { dir: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  bk: { dir: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
  rt: { dir: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  up: { dir: [0, 1, 0], right: [0, 0, 1], up: [1, 0, 0] },
  dn: { dir: [0, -1, 0], right: [0, 0, 1], up: [-1, 0, 0] },
};

/** Nama properti Sky di Roblox = nama file hasil */
export const FACE_PROP: Record<FaceId, string> = {
  ft: "SkyboxFt",
  bk: "SkyboxBk",
  lf: "SkyboxLf",
  rt: "SkyboxRt",
  up: "SkyboxUp",
  dn: "SkyboxDn",
};

/** Posisi di tata letak salib: kolom/baris grid 4×3 (Up di atas Ft, Dn di bawah Ft) */
export const FACE_CROSS: Record<FaceId, { col: number; row: number }> = {
  up: { col: 2, row: 1 },
  rt: { col: 1, row: 2 },
  ft: { col: 2, row: 2 },
  lf: { col: 3, row: 2 },
  bk: { col: 4, row: 2 },
  dn: { col: 2, row: 3 },
};

/** Tebak sisi dari nama file (SkyboxFt.png, sky_front.jpg, kanan.webp, px.png …) */
const NAME_RULES: [RegExp, FaceId][] = [
  [/(^|[^a-z])(up|top|atas|py)([^a-z]|$)/i, "up"],
  [/(^|[^a-z])(dn|down|bottom|btm|bawah|ny)([^a-z]|$)/i, "dn"],
  [/(^|[^a-z])(lf|left|kiri)([^a-z]|$)/i, "lf"],
  [/(^|[^a-z])(rt|right|kanan)([^a-z]|$)/i, "rt"],
  [/(^|[^a-z])(ft|front|depan)([^a-z]|$)/i, "ft"],
  [/(^|[^a-z])(bk|back|belakang)([^a-z]|$)/i, "bk"],
];

export function guessFace(filename: string): FaceId | null {
  // "SkyboxFt" → "Skybox_Ft" supaya aturan batas kata ikut kena
  const name = filename.replace(/\.[a-z0-9]+$/i, "").replace(/([a-z])([A-Z])/g, "$1_$2");
  for (const [re, face] of NAME_RULES) if (re.test(name)) return face;
  return null;
}

/** Ambil angka ID dari "rbxassetid://123", URL Creator Store, atau angka polos */
export function parseAssetId(raw: string): string {
  const m = raw.match(/(\d{5,})/);
  return m ? m[1] : "";
}

/** Script Command Bar: Sky (+ Atmosphere yang cocok bila ada) */
export function luauScript(ids: Partial<Record<FaceId, string>>, name: string, atmosphere?: SkyAtmosphere | null) {
  const safe = (name.trim() || "ARRR_Skybox").replace(/["\\]/g, "");
  const line = (f: FaceId) => `sky.${FACE_PROP[f]} = "rbxassetid://${ids[f] || 0}"`;
  return [
    `local Lighting = game:GetService("Lighting")`,
    `local sky = Lighting:FindFirstChildOfClass("Sky") or Instance.new("Sky")`,
    `sky.Name = "${safe}"`,
    ...(["bk", "dn", "ft", "lf", "rt", "up"] as const).map(line),
    `sky.Parent = Lighting`,
    ...(atmosphere ? ["", ...atmosphereLua(atmosphere)] : []),
    `print("Skybox '${safe}' terpasang")`,
  ].join("\n");
}

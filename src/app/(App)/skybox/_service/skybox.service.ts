import { apiFetch } from "@/lib/utils";
import { FACE_PROP, type FaceId } from "../_lib/skyMath";
import { lightingFolder, RBXMX_HEAD, type SkyAtmosphere } from "../_lib/atmosphere";

interface UploadResult {
  assetId: string | null;
  operationId: string | null;
}

export interface DecalPayload {
  apiKey: string;
  creatorType: "user" | "group";
  creatorId: string;
  displayName: string;
  image: string; // data URL base64
}

export const uploadDecal = (body: DecalPayload) => apiFetch<UploadResult>("/api/roblox/decal", { method: "POST", json: body });

export const checkOperation = (apiKey: string, operationId: string) =>
  apiFetch<UploadResult>("/api/roblox/operation", { method: "POST", json: { apiKey, operationId } });

export const fetchTextureId = (apiKey: string, decalId: string) =>
  apiFetch<{ imageId: string | null }>("/api/roblox/texture", { method: "POST", json: { apiKey, decalId } });

// Body request lewat proxy dibatasi ±4.5 MB → PNG yang terlalu besar dikirim sebagai JPEG kualitas tinggi
const MAX_UPLOAD = 3.2 * 1024 * 1024;

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });

export async function faceDataUrl(png: Blob): Promise<string> {
  if (png.size <= MAX_UPLOAD) return readAsDataUrl(png);
  const bmp = await createImageBitmap(png);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  const jpg = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("jpeg"))), "image/jpeg", 0.92));
  return readAsDataUrl(jpg);
}

const xml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/**
 * File .rbxmx: Sky berisi 6 ID. Dengan pencahayaan → satu Folder bernama Sky (Sky, Atmosphere, ColorCorrection,
 * ClockTime, GeographicLatitude). Seret ke Studio lalu pindahkan isinya ke Lighting.
 */
export function skyRbxmx(ids: Partial<Record<FaceId, string>>, name: string, atmosphere?: SkyAtmosphere | null) {
  const title = xml(name.trim() || "ARRR_Skybox");
  const faces = (["bk", "dn", "ft", "lf", "rt", "up"] as const)
    .map((f) => `      <Content name="${FACE_PROP[f]}"><url>rbxassetid://${ids[f] || 0}</url></Content>`)
    .join("\n");
  const sky = `  <Item class="Sky" referent="SKY0">
    <Properties>
      <bool name="CelestialBodiesShown">true</bool>
      <string name="Name">${title}</string>
${faces}
      <int name="StarCount">3000</int>
    </Properties>
  </Item>`;
  return `${RBXMX_HEAD}${atmosphere ? lightingFolder(atmosphere, title, sky) : sky}\n</roblox>\n`;
}

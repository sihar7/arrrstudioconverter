/**
 * Sidik jari perangkat (hash SHA-256) untuk kuota tamu: sama di tab biasa, incognito & setelah ganti IP/VPN,
 * karena dibentuk dari ciri perangkat & browser (render canvas/WebGL, layar, CPU, zona waktu), bukan cookie.
 * Hanya kunci kuota tambahan di server — tidak pernah dipakai untuk melacak / disimpan mentah.
 */
let cached: string | null = null;
let pending: Promise<string | null> | null = null;

function canvasSig(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const g = c.getContext("2d");
    if (!g) return "";
    g.textBaseline = "top";
    g.font = "16px 'Arial'";
    g.fillStyle = "#f60";
    g.fillRect(100, 1, 62, 20);
    g.fillStyle = "#069";
    g.fillText("ARRR Studio ✦ 🎵 1.25×", 2, 15);
    g.fillStyle = "rgba(102, 204, 0, 0.7)";
    g.fillText("ARRR Studio ✦ 🎵 1.25×", 4, 17);
    return c.toDataURL();
  } catch {
    return "";
  }
}

function webglSig(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const out = `${vendor}|${renderer}|${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return out;
  } catch {
    return "";
  }
}

async function compute(): Promise<string | null> {
  if (typeof window === "undefined" || !crypto?.subtle) return null;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const parts = [
    canvasSig(),
    webglSig(),
    `${screen.width}x${screen.height}x${screen.colorDepth}@${devicePixelRatio}`,
    nav.hardwareConcurrency ?? "",
    nav.deviceMemory ?? "",
    nav.maxTouchPoints ?? "",
    nav.platform ?? "",
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
  ].join("§");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hash perangkat (dihitung sekali per halaman); null bila browser tidak mendukung */
export function deviceId(): Promise<string | null> {
  if (cached) return Promise.resolve(cached);
  pending ??= compute()
    .then((v) => (cached = v))
    .catch(() => null);
  return pending;
}

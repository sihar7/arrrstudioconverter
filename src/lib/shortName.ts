// Judul YouTube → nama aset Roblox yang pendek & bersih (dipakai converter dan riwayat)

// String.raw: di string biasa "\s"/"\d" kehilangan backslash → regex noise tidak pernah cocok
const TITLE_NOISE = String.raw`official|music\s*video|video\s*clip|video|audio|lyrics?|lirik|mv|m\/v|hd|hq|4k|8k|\d{3,4}p|visuali[sz]er|remaster(?:ed)?|explicit|clean|full\s*song|official\s*audio`;

const MAX_NAME = 50;

/** Buang tag [..], (Official Video), #hashtag, akhiran noise & karakter yang ditolak Roblox */
export function clean(title: string): string {
  const name = (title.split(/\s+(?:\||\/\/)\s+/)[0] ?? title)
    .replace(/\[[^\]]*\]|【[^】]*】/g, " ")
    .replace(new RegExp(String.raw`\((?:[^()]*\b(?:${TITLE_NOISE})\b[^()]*)\)`, "gi"), " ")
    .replace(/#\S+/g, " ")
    .replace(new RegExp(String.raw`(?:\s+[-–—:]?\s*\b(?:${TITLE_NOISE})\b)+\s*$`, "i"), "");
  return tidy(name);
}

/** Hanya karakter yang diterima Roblox + rapikan spasi/tanda di ujung */
function tidy(name: string): string {
  return name
    // En/em dash pemisah "Artis – Judul" → "-" (dibuang oleh filter karakter di bawah)
    .replace(/\s+[–—]\s+/g, " - ")
    .replace(/[^\p{L}\p{N} _.\-()]/gu, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-._ ]+|[-._ ]+$/g, "");
}

/** Potong di batas kata (bukan di tengah kata) kalau masih kepanjangan */
function fit(name: string, max: number): string {
  if (name.length <= max) return name;
  const cut = name.slice(0, max + 1);
  const pos = cut.lastIndexOf(" ");
  return (pos >= max * 0.5 ? cut.slice(0, pos) : name.slice(0, max)).replace(/[-._( ]+$/, "");
}

/** Judul YouTube → nama aset Roblox pendek: "Artist - Song (Official Video) [HD]" → "Artist - Song" */
export function shortName(title: string, max = 40): string {
  return fit(clean(title), max) || "Audio";
}

export type NameStyle = "short" | "song" | "full" | "original";
export const NAME_STYLES: NameStyle[] = ["short", "song", "full", "original"];

/**
 * Nama aset sesuai gaya potong:
 * short = ringkas (≤40) · song = judul lagu saja tanpa artis · full = bersih tanpa tag (≤50) · original = judul asli (≤50)
 */
export function nameFor(title: string, style: NameStyle): string {
  switch (style) {
    case "song": {
      const cleaned = clean(title);
      // "Artis - Judul" / "Artis – Judul" / "Artis: Judul" → ambil bagian judul
      const parts = cleaned.split(/\s+[-–—:]\s+/);
      return fit(parts.length > 1 ? parts.slice(1).join(" - ") : cleaned, MAX_NAME) || "Audio";
    }
    case "full":
      return fit(clean(title), MAX_NAME) || "Audio";
    case "original":
      return fit(tidy(title), MAX_NAME) || "Audio";
    default:
      return shortName(title);
  }
}

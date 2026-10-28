"use client";

// Lampiran gambar chat Alice: diperkecil di perangkat sebelum dikirim / disimpan.
// 1568 px sisi terpanjang = ukuran yang dipakai Claude tanpa diperkecil lagi; JPEG 0.85 (PNG bila transparan & kecil).

const MAX_SIDE = 1568;
export const MAX_ATTACH = 6;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** File gambar → data URL siap kirim (null bila bukan gambar / gagal dibaca) */
export async function toAttachment(file: Blob): Promise<string | null> {
  if (!/^image\/(png|jpeg|gif|webp|bmp|avif)$/.test(file.type)) return null;
  try {
    const img = await decode(file);
    const w = "naturalWidth" in img ? img.naturalWidth : img.width;
    const h = "naturalHeight" in img ? img.naturalHeight : img.height;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // PNG kecil (screenshot UI, ikon transparan) tetap PNG supaya tajam; selain itu JPEG
    const png = file.type === "image/png" && file.size < 600_000;
    if (!png) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if ("close" in img) img.close();
    return canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.85);
  } catch {
    return null;
  }
}

const AVATAR_SIDE = 256;

/** Foto profil: potong persegi di tengah (sedikit ke atas — wajah) → JPEG 256px */
export async function toAvatar(file: Blob): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const img = await decode(file);
    const w = "naturalWidth" in img ? img.naturalWidth : img.width;
    const h = "naturalHeight" in img ? img.naturalHeight : img.height;
    const side = Math.min(w, h);
    const sx = (w - side) / 2;
    const sy = h > w ? Math.max(0, (h - side) * 0.3) : 0;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
    if ("close" in img) img.close();
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  }
}

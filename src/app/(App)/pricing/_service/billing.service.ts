import { apiFetch } from "@/lib/utils";
import type { BillingMonths, PaidPlanId } from "@/lib/schemas/plans";
import type { UserPlan } from "@/type/auth";
import type { BillingInfo, Order, OrderDetail } from "@/type/billing";

// Langganan plan via QRIS → /api/billing/* (di-proxy ke BE)

export const getBilling = () =>
  apiFetch<{ info: BillingInfo; plan: UserPlan; orders: Order[] }>("/api/billing", { cache: "no-store" });

export const createOrder = (plan: PaidPlanId, months: BillingMonths) =>
  apiFetch<{ order: OrderDetail }>("/api/billing/orders", { method: "POST", json: { plan, months } });

export const getOrder = (id: string) => apiFetch<{ order: OrderDetail }>(`/api/billing/orders/${id}`, { cache: "no-store" });

export const orderAction = (id: string, action: "confirm" | "cancel") =>
  apiFetch<{ order: OrderDetail }>(`/api/billing/orders/${id}`, { method: "POST", json: { action } });

/** Unggah / ganti bukti pembayaran (data URL gambar yang sudah dikecilkan) */
export const uploadProof = (id: string, image: string) =>
  apiFetch<{ order: OrderDetail }>(`/api/billing/orders/${id}/proof`, { method: "POST", json: { image } });

/** Kecilkan gambar di browser → JPEG maks 1280px (bukti tetap terbaca, upload ringan) */
export async function compressImage(file: File, max = 1280, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("File harus gambar (screenshot / foto bukti)");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar");
  ctx.fillStyle = "#fff"; // PNG transparan → latar putih (JPEG tanpa alpha)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL("image/jpeg", quality);
}

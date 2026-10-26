import type { BillingMonths, PaidPlanId } from "@/lib/schemas/plans";

/**
 * awaiting   — menunggu dibayar (punya batas waktu)
 * confirming — user menandai sudah bayar, menunggu dicek admin
 * paid       — dikonfirmasi admin, plan aktif
 * rejected / expired / cancelled — selesai tanpa pembayaran
 */
export type OrderStatus = "awaiting" | "confirming" | "paid" | "rejected" | "expired" | "cancelled";

export interface Order {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  plan: PaidPlanId;
  months: BillingMonths;
  /** harga plan sebelum kode unik */
  baseAmount: number;
  /** 1–499, ditambahkan ke nominal supaya transfer mudah dicocokkan */
  uniqueCode: number;
  /** nominal yang harus dibayar */
  amount: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  /** batas bayar (status awaiting) */
  payBefore: number;
  paidAt: number | null;
  /** plan aktif sampai (diisi saat lunas) */
  planUntil: number | null;
  /** catatan admin (mis. alasan ditolak) */
  note: string | null;
  handledBy: string | null;
  /** waktu bukti pembayaran terakhir diunggah; null = belum ada (opsional, data lama tidak punya) */
  proofAt?: number | null;
}

/** Event realtime ke panel admin (SSE /api/admin/events) */
export interface AdminEvent {
  type: "order.created" | "order.confirming" | "order.proof" | "order.cancelled" | "order.paid" | "order.rejected";
  orderId: string;
  title: string;
  body: string;
  at: number;
}

export interface OrderDetail extends Order {
  /** QR SVG + nama merchant; null bila order sudah tidak bisa dibayar */
  qris: { svg: string; merchant: string } | null;
}

export interface BillingInfo {
  /** QRIS_STRING terpasang & valid */
  enabled: boolean;
  merchant: string;
  payWindowMin: number;
}

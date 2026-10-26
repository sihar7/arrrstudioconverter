import { apiFetch } from "@/lib/utils";
import type { PlanId } from "@/lib/schemas/plans";
import type { UserPlan } from "@/type/auth";
import type { Order, OrderStatus } from "@/type/billing";
import type { AdminAuditEntry, AdminFile, AdminJob, AdminMe, AdminStats, AdminUser, JanitorReport, SystemReport } from "@/type/admin";

// Semua panggilan admin → /api/admin/* (di-proxy ke BE). Cookie sesi admin httpOnly, path /api/admin.

export const adminLogin = (username: string, password: string) =>
  apiFetch<AdminMe>("/api/admin/auth/login", { method: "POST", json: { username, password } });

export const adminLogout = () => apiFetch<{ ok: true }>("/api/admin/auth/logout", { method: "POST" });

export const adminMe = () => apiFetch<AdminMe>("/api/admin/auth/me", { cache: "no-store" });

export const getStats = () => apiFetch<AdminStats>("/api/admin/stats", { cache: "no-store" });

export const getUsers = (q: string) =>
  apiFetch<{ items: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });

/** purge = juga hapus riwayat convert & spoof */
export const revokeUser = (id: string, purge: boolean) =>
  apiFetch<{ sessions: number; rows: number }>(`/api/admin/users/${id}${purge ? "?purge=1" : ""}`, { method: "DELETE" });

/** Atur plan manual; expiresAt null = permanen, plan "free" = cabut plan */
export const setUserPlan = (id: string, plan: PlanId, expiresAt: number | null) =>
  apiFetch<{ plan: UserPlan }>(`/api/admin/users/${id}`, { method: "PATCH", json: { plan, expiresAt } });

export type OrderFilter = OrderStatus | "open" | "all";

export const getOrders = (status: OrderFilter) =>
  apiFetch<{ items: Order[] }>(`/api/admin/orders?status=${status}`, { cache: "no-store" });

/** approve = lunas + aktifkan plan · reject = tolak (note = alasan, dilihat user) */
export const orderAction = (id: string, action: "approve" | "reject", note?: string) =>
  apiFetch<{ order: Order }>(`/api/admin/orders/${id}`, { method: "POST", json: { action, note } });

/** Hapus order + bukti (plan yang sudah aktif tidak dicabut) */
export const deleteOrder = (id: string) => apiFetch<{ ok: true }>(`/api/admin/orders/${id}`, { method: "DELETE" });

/** Hapus massal order dibatalkan / kedaluwarsa / ditolak */
export const purgeOrders = () => apiFetch<{ deleted: number }>("/api/admin/orders", { method: "DELETE" });

/** URL gambar bukti pembayaran (cookie admin ikut karena path /api/admin); v = pemecah cache saat bukti diganti */
export const proofUrl = (id: string, v?: number | null) => `/api/admin/orders/${id}/proof${v ? `?v=${v}` : ""}`;

export const getJobs = () => apiFetch<{ items: AdminJob[] }>("/api/admin/jobs", { cache: "no-store" });

export const deleteJob = (id: string) => apiFetch<{ ok: true }>(`/api/admin/jobs/${id}`, { method: "DELETE" });

/** Hapus semua job selesai / gagal */
export const purgeJobs = () => apiFetch<{ deleted: number }>("/api/admin/jobs", { method: "DELETE" });

export const getFiles = () => apiFetch<{ items: AdminFile[] }>("/api/admin/files", { cache: "no-store" });

export const deleteFile = (id: string) => apiFetch<{ ok: true }>(`/api/admin/files/${id}`, { method: "DELETE" });

/** Hapus semua file hasil */
export const purgeFiles = () => apiFetch<{ deleted: number }>("/api/admin/files", { method: "DELETE" });

export const getAudit = () => apiFetch<{ items: AdminAuditEntry[] }>("/api/admin/audit", { cache: "no-store" });

/** Kosongkan log audit (entri "audit.clear" tetap tercatat setelahnya) */
export const clearAudit = () => apiFetch<{ deleted: number }>("/api/admin/audit", { method: "DELETE" });

export const revokeAdminSessions = () =>
  apiFetch<{ sessions: number }>("/api/admin/maintenance", { method: "POST", json: { action: "revoke-admin-sessions" } });

/** Cek kesehatan: database, storage, tools, janitor, jobs, config, process */
export const getSystem = () => apiFetch<SystemReport>("/api/admin/system", { cache: "no-store" });

/** Jalankan janitor (bersihkan storage & DB) sekarang → laporan janitor + cek sistem terbaru */
export const runJanitorNow = () =>
  apiFetch<{ janitor: JanitorReport; system: SystemReport }>("/api/admin/system", { method: "POST" });

import { apiFetch } from "@/lib/utils";
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

export const getJobs = () => apiFetch<{ items: AdminJob[] }>("/api/admin/jobs", { cache: "no-store" });

export const getFiles = () => apiFetch<{ items: AdminFile[] }>("/api/admin/files", { cache: "no-store" });

export const deleteFile = (id: string) => apiFetch<{ ok: true }>(`/api/admin/files/${id}`, { method: "DELETE" });

export const getAudit = () => apiFetch<{ items: AdminAuditEntry[] }>("/api/admin/audit", { cache: "no-store" });

export const revokeAdminSessions = () =>
  apiFetch<{ sessions: number }>("/api/admin/maintenance", { method: "POST", json: { action: "revoke-admin-sessions" } });

/** Cek kesehatan: database, storage, tools, janitor, jobs, config, process */
export const getSystem = () => apiFetch<SystemReport>("/api/admin/system", { cache: "no-store" });

/** Jalankan janitor (bersihkan storage & DB) sekarang → laporan janitor + cek sistem terbaru */
export const runJanitorNow = () =>
  apiFetch<{ janitor: JanitorReport; system: SystemReport }>("/api/admin/system", { method: "POST" });

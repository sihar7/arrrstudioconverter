import type { PlanId } from "@/lib/schemas/plans";
import type { JobStatus } from "./converter";

export interface AdminSession {
  username: string;
  createdAt: number;
  expiresAt: number;
  ipHash: string;
  ua: string;
}

export interface AdminMe {
  username: string;
  expiresAt: number;
}

export interface AdminStats {
  users: number;
  sessions: number;
  conversions: { total: number; last24h: number; last7d: number };
  robloxUploads: number;
  spoofs: number;
  files: { active: number; bytes: number };
  jobs: Record<JobStatus, number>;
  formats: { format: string; count: number }[];
  /** 14 hari terakhir (UTC), lama → baru */
  daily: { day: string; count: number; revenue: number }[];
  billing: {
    revenue30d: number;
    paid30d: number;
    awaiting: number;
    confirming: number;
    /** user dengan plan berbayar aktif */
    subscribers: { pro: number; studio: number };
  };
  server: { uptimeSec: number; rssBytes: number; node: string; concurrent: number; guestLimit: number; userDaily: number };
}

export interface AdminUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  sessions: number;
  lastLoginAt: number | null;
  conversions: number;
  lastConvertAt: number | null;
  plan: PlanId;
  planExpiresAt: number | null;
}

export interface AdminJob {
  id: string;
  ownerType: "user" | "guest";
  ownerId: string;
  status: JobStatus;
  progress: number;
  title: string;
  videoId: string;
  format: string;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdminFile {
  fileId: string;
  ownerType: "user" | "guest";
  ownerId: string;
  title: string;
  format: string;
  size: number;
  duration: number;
  createdAt: number;
  expiresAt: number;
}

export interface AdminAuditEntry {
  id: number;
  at: number;
  actor: string;
  action: string;
  target: string | null;
  ipHash: string;
  ok: boolean;
}

// Sama dengan BE: lib/server/health.ts & janitor.ts
export type CheckStatus = "ok" | "warn" | "error";

export interface SystemCheck {
  name: string;
  status: CheckStatus;
  message: string;
  data?: Record<string, unknown>;
}

export interface SystemReport {
  status: CheckStatus;
  at: number;
  uptimeSec: number;
  checks: SystemCheck[];
}

export interface JanitorReport {
  at: number;
  ms: number;
  expiredFiles: number;
  expiredRows: number;
  orphanDirs: number;
  orphanRows: number;
  tmpFiles: number;
  cacheDirs: number;
  evictedFiles: number;
  evictedRows: number;
  auditRows: number;
  diskMb: number;
  dbMb: number;
  pressure: boolean;
  error: string | null;
}

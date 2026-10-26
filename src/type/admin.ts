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
  daily: { day: string; count: number }[];
  server: { uptimeSec: number; rssBytes: number; node: string; concurrent: number; guestLimit: number; userHourly: number };
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

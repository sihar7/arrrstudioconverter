import type { PlanId } from "@/lib/schemas/plans";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  loginAt: number;
  /** email Discord — hanya dikirim ke klien bila user adalah admin */
  email?: string | null;
  /** true bila user termasuk admin aplikasi (fitur admin seperti Obfuscator) */
  isAdmin?: boolean;
}

export interface UserPlan {
  id: PlanId;
  /** epoch ms masa aktif habis; null = permanen / free */
  expiresAt: number | null;
}

export interface QuotaInfo {
  /** null = tanpa batas (admin) */
  limit: number | null;
  used: number;
  remaining: number | null;
  /** detik sampai token terisi penuh lagi; null = belum dipakai / tanpa batas */
  resetIn: number | null;
  /** panjang periode token (jam) */
  windowHours: number;
  /** menit audio per 1 token */
  minutesPerToken: number;
}

export interface MeResponse {
  user: SessionUser | null;
  quota: QuotaInfo;
  plan: UserPlan;
  auth: {
    discordEnabled: boolean;
    devLogin: boolean;
    guildRequired: boolean;
    inviteUrl: string;
  };
}

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
  /** detik sampai kuota reset; null = tidak reset */
  resetIn: number | null;
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

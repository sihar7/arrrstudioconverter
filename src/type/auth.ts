export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  loginAt: number;
}

export interface QuotaInfo {
  /** null = tanpa batas jumlah total (user login, hanya rate per jam) */
  limit: number | null;
  used: number;
  remaining: number | null;
  /** detik sampai kuota guest reset; null = tidak reset */
  resetIn: number | null;
}

export interface MeResponse {
  user: SessionUser | null;
  quota: QuotaInfo;
  auth: {
    discordEnabled: boolean;
    devLogin: boolean;
    guildRequired: boolean;
    inviteUrl: string;
  };
}

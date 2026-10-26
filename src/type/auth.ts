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

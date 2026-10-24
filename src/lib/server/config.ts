import "server-only";
import os from "node:os";
import path from "node:path";

// Semua nilai konfigurasi server dari env — modul lain tidak membaca process.env langsung

const int = (v: string | undefined, d: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : d;
};

// Vercel: filesystem read-only kecuali /tmp, tidak ada proses yang hidup terus
const serverless = Boolean(process.env.VERCEL);
const root = serverless ? path.join(os.tmpdir(), "arrc") : process.cwd();
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

export const config = {
  appUrl: (process.env.APP_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")).replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  serverless,
  redisUrl: process.env.REDIS_URL || process.env.KV_URL || "",
  // Ada token Blob → file hasil disimpan di Vercel Blob (private); tidak ada → disk lokal (dev)
  blobEnabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  cronSecret: process.env.CRON_SECRET || "",
  // Kunci tanda tangan cookie sesi (JWT HS256) — string acak ≥32 karakter
  jwtSecret: process.env.JWT_SECRET || "",

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    redirectUri: process.env.DISCORD_REDIRECT_URI || "",
    guildId: process.env.DISCORD_GUILD_ID || "",
    botToken: process.env.DISCORD_BOT_TOKEN || "",
    inviteUrl: process.env.DISCORD_INVITE_URL || "https://discord.gg/mtn3YmwjV",
  },

  limits: {
    guest: int(process.env.GUEST_LIMIT, 3),
    guestWindowHours: int(process.env.GUEST_WINDOW_HOURS, 24),
    userHourly: int(process.env.USER_HOURLY_LIMIT, 60),
    concurrent: Math.max(1, int(process.env.MAX_CONCURRENT_JOBS, 2)),
    perOwnerQueue: 5,
    maxDuration: int(process.env.MAX_DURATION_SEC, 1800),
    fileTtlMs: int(process.env.FILE_TTL_MIN, 60) * 60_000,
    playlistMax: 50,
    historyMax: 300,
    robloxMaxBytes: 20 * 1024 * 1024,
  },

  bin: {
    ytdlp: process.env.YTDLP_BIN || "",
    ffmpeg: process.env.FFMPEG_BIN || "",
    cookies: process.env.YTDLP_COOKIES || "",
    // Isi cookies.txt dalam base64 (untuk Vercel — tidak bisa menaruh file)
    cookiesB64: process.env.YTDLP_COOKIES_B64 || "",
    // Proxy untuk yt-dlp (http://user:pass@host:port / socks5://…) — IP residensial lolos bot check YouTube
    proxy: process.env.YTDLP_PROXY || "",
  },

  paths: {
    storage: path.join(root, "storage"),
    bin: path.join(root, "storage", "bin"),
    cache: path.join(root, "storage", "cache"),
    out: path.join(root, "storage", "out"),
    tmp: path.join(root, "storage", "tmp"),
  },

  cookies: {
    session: "arrc_sid",
    guest: "arrc_gid",
    oauthState: "arrc_oauth",
    sessionDays: 30,
  },
} as const;

export const discordEnabled = () => Boolean(config.discord.clientId && config.discord.clientSecret && config.discord.redirectUri);
// Login dev tanpa Discord — hanya saat development & Discord belum dikonfigurasi
export const devLoginEnabled = () => !config.isProd && !discordEnabled();

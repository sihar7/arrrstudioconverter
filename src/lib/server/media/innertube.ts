import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import Url from "@/Url/Url";
import { AppError } from "../http";

// "Proxy sendiri" ke YouTube: client InnerTube native (tanpa yt-dlp, tanpa layanan pihak ketiga, tanpa env).
// - Sesi visitor sendiri (visitorData dari sw.js_data) → lolos "Sign in to confirm you're not a bot"
//   yang muncul pada request tanpa sesi, juga dari IP datacenter.
// - Rotasi client yang tidak butuh PO token / JS player (ANDROID_VR · IOS · VISIONOS).
// - Unduh per-chunk (Range) → tidak di-throttle & 403 di chunk pertama langsung pindah client.
// URL stream terikat IP peminta, jadi resolve + unduh selalu dari proses yang sama.

interface Client {
  name: string;
  id: number;
  ua: string;
  ctx: Record<string, string | number>;
}

const CLIENTS: Client[] = [
  {
    name: "ANDROID_VR",
    id: 28,
    ua: "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    ctx: { clientVersion: "1.65.10", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L" },
  },
  {
    name: "IOS",
    id: 5,
    ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
    ctx: { clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82" },
  },
  {
    name: "VISIONOS",
    id: 101,
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
    ctx: { clientVersion: "0.1", deviceMake: "Apple", deviceModel: "RealityDevice14,1", osName: "visionOS", osVersion: "1.3.21O771" },
  },
];

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const VISITOR_TTL = 30 * 60_000;
const CHUNK = 8 * 1024 * 1024;
const MAX_BYTES = 300 * 1024 * 1024;

const g = globalThis as unknown as { __arrcVisitor?: { value: string; at: number } | null };

// ============================================================
// SESI VISITOR
// ============================================================

async function fetchVisitor(): Promise<string> {
  const headers = { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" };
  try {
    const r = await fetch(Url.youtubeSwData, { headers, signal: AbortSignal.timeout(8000) });
    const data = JSON.parse((await r.text()).replace(/^\)\]\}'/, "")) as unknown[][][][][];
    const v = data[0]?.[2]?.[0]?.[0]?.[13];
    if (typeof v === "string" && v) return v;
  } catch {
    // jatuh ke halaman utama
  }
  const html = await fetch(Url.youtubeHome, { headers, signal: AbortSignal.timeout(8000) }).then((r) => r.text());
  const m = html.match(/"VISITOR_DATA":"([^"]+)"/) ?? html.match(/"visitorData":"([^"]+)"/);
  if (!m) throw new Error("visitorData tidak ditemukan");
  return m[1];
}

async function visitor(fresh = false): Promise<string> {
  const c = g.__arrcVisitor;
  if (!fresh && c && Date.now() - c.at < VISITOR_TTL) return c.value;
  const value = await fetchVisitor();
  g.__arrcVisitor = { value, at: Date.now() };
  return value;
}

// ============================================================
// PLAYER
// ============================================================

interface Format {
  itag: number;
  url?: string;
  mimeType: string;
  bitrate: number;
  contentLength?: string;
  isDrc?: boolean;
  audioTrack?: { audioIsDefault?: boolean };
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: { title?: string; author?: string; lengthSeconds?: string; isLive?: boolean };
  streamingData?: { adaptiveFormats?: Format[] };
}

export interface ResolvedAudio {
  client: Client;
  title: string;
  author: string;
  duration: number;
  live: boolean;
  formats: Format[];
}

/** Error yang pasti sama di client mana pun (video dihapus/private) → tidak perlu fallback */
export const isFinalError = (e: unknown) => e instanceof AppError && e.code === "NOT_FOUND";

async function player(videoId: string, client: Client, vd: string): Promise<PlayerResponse> {
  const r = await fetch(Url.youtubePlayer, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": client.ua,
      "X-YouTube-Client-Name": String(client.id),
      "X-YouTube-Client-Version": String(client.ctx.clientVersion),
      "X-Goog-Visitor-Id": vd,
      Origin: Url.youtubeHome,
    },
    body: JSON.stringify({
      context: { client: { clientName: client.name, ...client.ctx, hl: "en", gl: "US", visitorData: vd } },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`player HTTP ${r.status}`);
  return (await r.json()) as PlayerResponse;
}

const audioFormats = (formats: Format[] = []) =>
  formats
    .filter((f) => f.url && f.mimeType.startsWith("audio/") && !f.isDrc)
    // Video multi-bahasa: utamakan trek audio asli, lalu bitrate tertinggi
    .sort((a, b) => Number(b.audioTrack?.audioIsDefault ?? true) - Number(a.audioTrack?.audioIsDefault ?? true) || b.bitrate - a.bitrate);

/** Kandidat audio per client yang lolos (urut sesuai CLIENTS); berhenti di error final */
async function* resolveAll(videoId: string): AsyncGenerator<ResolvedAudio> {
  let vd = await visitor();
  let lastReason = "";
  let refreshed = false;
  for (let i = 0; i < CLIENTS.length; i++) {
    const client = CLIENTS[i];
    let res: PlayerResponse;
    try {
      res = await player(videoId, client, vd);
    } catch (e) {
      lastReason = (e as Error).message;
      continue;
    }
    const ps = res.playabilityStatus ?? {};
    const reason = ps.reason ?? "";
    if (ps.status === "OK") {
      const d = res.videoDetails ?? {};
      const formats = audioFormats(res.streamingData?.adaptiveFormats);
      if (formats.length) {
        yield {
          client,
          title: d.title?.trim() || videoId,
          author: d.author?.trim() || "",
          duration: Number(d.lengthSeconds) || 0,
          live: Boolean(d.isLive),
          formats,
        };
      }
      continue;
    }
    lastReason = reason || ps.status || "";
    if (ps.status === "ERROR" || /private video/i.test(reason)) {
      throw new AppError(/private/i.test(reason) ? "Video private" : "Video tidak tersedia / sudah dihapus", 404, "NOT_FOUND");
    }
    // Bot check → sesi visitor baru sekali, ulangi client yang sama
    if (/not a bot/i.test(reason) && !refreshed) {
      refreshed = true;
      vd = await visitor(true).catch(() => vd);
      i--;
    }
  }
  throw new Error(`InnerTube gagal: ${lastReason || "tidak ada format audio"}`);
}

/** Judul, channel & durasi (cepat, tanpa spawn yt-dlp) */
export async function innertubeInfo(videoId: string): Promise<{ title: string; author: string; duration: number }> {
  for await (const r of resolveAll(videoId)) return { title: r.title, author: r.author, duration: r.duration };
  throw new Error("InnerTube gagal");
}

// ============================================================
// UNDUH PER-CHUNK
// ============================================================

class StreamRejected extends Error {}

const extOf = (mime: string) => (mime.includes("webm") ? "webm" : mime.includes("mp4") ? "m4a" : "audio");

async function fetchRange(url: string, ua: string, start: number, end: number): Promise<Buffer> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${start}-${end}`, "User-Agent": ua }, signal: AbortSignal.timeout(60_000) });
      if (r.status === 403 || r.status === 410) throw new StreamRejected(`HTTP ${r.status}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (e instanceof StreamRejected) throw e;
      lastErr = e as Error;
    }
  }
  throw lastErr ?? new Error("unduh gagal");
}

async function downloadFormat(f: Format, ua: string, target: string, onProgress: (pct: number) => void) {
  const total = Number(f.contentLength || new URL(f.url!).searchParams.get("clen")) || 0;
  if (!total) throw new Error("ukuran stream tidak diketahui");
  if (total > MAX_BYTES) throw new AppError("File audio terlalu besar", 413, "TOO_LARGE");

  const part = `${target}.part`;
  const fh = await fsp.open(part, "w");
  try {
    for (let start = 0; start < total; start += CHUNK) {
      const end = Math.min(total, start + CHUNK) - 1;
      const buf = await fetchRange(f.url!, ua, start, end);
      if (!buf.length) throw new Error("chunk kosong");
      await fh.write(buf);
      onProgress(Math.min(99, Math.floor(((end + 1) / total) * 100)));
    }
  } catch (e) {
    await fh.close();
    await fsp.rm(part, { force: true });
    throw e;
  }
  await fh.close();
  await fsp.rename(part, target);
}

/** Unduh audio terbaik ke `<dir>/source.<ext>`; 403 dari googlevideo → format/client berikutnya */
export async function innertubeDownload(
  videoId: string,
  dir: string,
  maxDuration: number,
  onProgress: (pct: number) => void,
): Promise<{ path: string; title: string; duration: number }> {
  let lastErr: Error | null = null;
  for await (const r of resolveAll(videoId)) {
    if (r.live || r.duration > maxDuration) {
      throw new AppError(`Video dilewati: siaran live / lebih dari ${Math.floor(maxDuration / 60)} menit`, 422, "TOO_LONG");
    }
    for (const f of r.formats.slice(0, 2)) {
      const target = path.join(dir, `source.${extOf(f.mimeType)}`);
      try {
        await downloadFormat(f, r.client.ua, target, onProgress);
        onProgress(100);
        return { path: target, title: r.title, duration: r.duration };
      } catch (e) {
        if (e instanceof AppError) throw e;
        lastErr = new Error(`${r.client.name} itag ${f.itag}: ${(e as Error).message}`);
      }
    }
  }
  throw lastErr ?? new Error("InnerTube gagal");
}

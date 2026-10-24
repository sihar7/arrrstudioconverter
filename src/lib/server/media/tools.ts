import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import Url from "@/Url/Url";
import { config } from "../config";

// Lokasi binary yt-dlp & ffmpeg + unduh/update otomatis yt-dlp ke storage/bin

const isWin = process.platform === "win32";
const ytdlpLocal = path.join(config.paths.bin, isWin ? "yt-dlp.exe" : "yt-dlp");
const ASSET: Partial<Record<NodeJS.Platform, string>> = {
  win32: "yt-dlp.exe",
  linux: "yt-dlp_linux",
  darwin: "yt-dlp_macos",
};

const g = globalThis as unknown as { __arrcYtdlpInstall?: Promise<void> | null; __arrcYtdlpUpdatedAt?: number };

// PO Token provider bgutil (cara yang sama dengan arrweb/Docker) — mode script, jadi jalan di serverless.
// vendor/bgutil dibangun oleh scripts/build-bgutil.mjs; tidak ada → yt-dlp jalan tanpa PO token
const bgutilHome = path.join(process.cwd(), "vendor", "bgutil");
export const bgutil = fs.existsSync(path.join(bgutilHome, "build", "generate_once.js"))
  ? { home: bgutilHome, plugins: path.join(bgutilHome, "plugins") }
  : null;

export function ffmpegBin(): string {
  return config.bin.ffmpeg || ffmpegStatic || "ffmpeg";
}

export async function ytdlpBin(): Promise<string> {
  if (config.bin.ytdlp) return config.bin.ytdlp;
  if (fs.existsSync(ytdlpLocal)) return ytdlpLocal;
  if (ASSET[process.platform]) {
    try {
      await installYtdlp();
      return ytdlpLocal;
    } catch (e) {
      console.warn("[yt-dlp] unduh otomatis gagal, pakai PATH:", (e as Error).message);
    }
  }
  return "yt-dlp";
}

/** Unduh yt-dlp terbaru (sekali jalan bersamaan; dipakai juga untuk update) */
export function installYtdlp(): Promise<void> {
  if (g.__arrcYtdlpInstall) return g.__arrcYtdlpInstall;
  const asset = ASSET[process.platform];
  if (!asset) return Promise.reject(new Error(`OS ${process.platform} tidak didukung unduh otomatis`));

  g.__arrcYtdlpInstall = (async () => {
    await fsp.mkdir(config.paths.bin, { recursive: true });
    const res = await fetch(`${Url.ytdlpRelease}/${asset}`, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1_000_000) throw new Error("file yt-dlp tidak valid");
    const tmp = `${ytdlpLocal}.download`;
    await fsp.writeFile(tmp, buf, { mode: 0o755 });
    await fsp.rm(ytdlpLocal, { force: true });
    await fsp.rename(tmp, ytdlpLocal);
    g.__arrcYtdlpUpdatedAt = Date.now();
  })().finally(() => {
    g.__arrcYtdlpInstall = null;
  });
  return g.__arrcYtdlpInstall;
}

/** Update yt-dlp maksimal sekali per 6 jam (dipanggil saat YouTube mengubah sesuatu) */
export async function maybeUpdateYtdlp(): Promise<boolean> {
  if (config.bin.ytdlp || !ASSET[process.platform]) return false;
  if (g.__arrcYtdlpUpdatedAt && Date.now() - g.__arrcYtdlpUpdatedAt < 6 * 3_600_000) return false;
  try {
    await installYtdlp();
    return true;
  } catch {
    return false;
  }
}

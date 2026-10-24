import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import Url from "@/Url/Url";
import { config } from "../config";
import { AppError } from "../http";

// Cadangan unduh audio lewat API cobalt (v10+) saat yt-dlp diblokir YouTube (bot check di IP datacenter).
// Hanya ID video tervalidasi yang dikirim — URL dibangun ulang dari ID.

const MAX_BYTES = 300 * 1024 * 1024;

export const cobaltEnabled = () => Boolean(config.cobalt.url);

interface CobaltResponse {
  status: "tunnel" | "redirect" | "picker" | "local-processing" | "error";
  url?: string;
  filename?: string;
  error?: { code?: string };
}

const extOf = (filename?: string) => {
  const ext = path.extname(filename ?? "").slice(1).toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "audio";
};

/** Unduh audio terbaik ke `<dir>/source.<ext>`; kembalikan path file */
export async function cobaltDownload(videoId: string, dir: string, onProgress: (pct: number) => void): Promise<string> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (config.cobalt.key) headers.Authorization = `Api-Key ${config.cobalt.key}`;

  const res = await fetch(`${config.cobalt.url}/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: Url.youtubeWatch + videoId, downloadMode: "audio", audioFormat: "best", filenameStyle: "basic" }),
    signal: AbortSignal.timeout(30_000),
  }).catch((e: Error) => {
    throw new AppError(`Cobalt tidak bisa dihubungi: ${e.message}`, 502, "COBALT");
  });
  const data = (await res.json().catch(() => null)) as CobaltResponse | null;
  if (!data || data.status === "error" || !data.url || (data.status !== "tunnel" && data.status !== "redirect")) {
    throw new AppError(`Cobalt gagal: ${data?.error?.code ?? `HTTP ${res.status}`}`, 502, "COBALT");
  }

  const file = await fetch(data.url, { signal: AbortSignal.timeout(5 * 60_000) });
  if (!file.ok || !file.body) throw new AppError(`Cobalt gagal mengirim file (HTTP ${file.status})`, 502, "COBALT");

  // Tunnel cobalt tidak selalu memberi Content-Length → pakai estimasinya bila ada
  const total = Number(file.headers.get("content-length") || file.headers.get("estimated-content-length")) || 0;
  const target = path.join(dir, `source.${extOf(data.filename)}`);
  const part = `${target}.part`;
  let got = 0;
  let lastPct = -1;
  const meter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      got += chunk.length;
      if (got > MAX_BYTES) return cb(new AppError("File audio terlalu besar", 413, "TOO_LARGE"));
      if (total) {
        const pct = Math.min(99, Math.floor((got / total) * 100));
        if (pct !== lastPct) onProgress((lastPct = pct));
      }
      cb(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(file.body as import("node:stream/web").ReadableStream), meter, fs.createWriteStream(part));
    if (got < 1024) throw new AppError("Cobalt mengirim file kosong", 502, "COBALT");
    await fsp.rename(part, target);
  } catch (e) {
    await fsp.rm(part, { force: true });
    throw e;
  }
  onProgress(100);
  return target;
}

import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import Url from "@/Url/Url";
import { AppError } from "../http";
import type { PlaylistItem } from "@/type/converter";

// Klien jembatan YouTube di Google Apps Script (scripts/youtube-bridge.gs).
// YouTube memblokir IP datacenter Vercel; request dari server Google lolos. Audio dikirim per potongan
// (base64 dalam JSON) — tiap potongan di-resolve ulang di sisi script karena link stream terikat IP.

const MAX_BYTES = 300 * 1024 * 1024;

/** Kode error yang pasti sama di jalur mana pun → tidak perlu fallback */
export const FINAL_CODES = new Set(["NOT_FOUND", "TOO_LONG", "TOO_LARGE"]);

export const bridgeEnabled = () => Boolean(Url.youtubeBridge);

interface Envelope {
  ok: boolean;
  error?: string;
  code?: string;
}

interface Chunk {
  title: string;
  author: string;
  duration: number;
  live: boolean;
  itag: number;
  mime: string;
  total: number;
  start: number;
  data: string;
}

async function call<T>(params: Record<string, string>, timeoutMs: number): Promise<T> {
  // /exec membalas 302 ke script.googleusercontent.com — fetch mengikutinya otomatis (GET)
  const res = await fetch(`${Url.youtubeBridge}?${new URLSearchParams(params)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((e: Error) => {
    throw new AppError(`Jembatan YouTube tidak bisa dihubungi: ${e.message}`, 502, "BRIDGE");
  });
  // Kuota Apps Script habis / deployment dicabut → halaman HTML, bukan JSON
  const data = (await res.json().catch(() => null)) as (T & Envelope) | null;
  if (!data) throw new AppError(`Jembatan YouTube error (HTTP ${res.status})`, 502, "BRIDGE");
  if (!data.ok) {
    const final = data.code && FINAL_CODES.has(data.code);
    throw new AppError(data.error || "Jembatan YouTube gagal", final ? 422 : 502, final ? data.code! : "BRIDGE");
  }
  return data;
}

export const bridgeInfo = (videoId: string) =>
  call<{ title: string; author: string; duration: number; live: boolean }>({ info: videoId }, 30_000);

export const bridgePlaylist = (listId: string) => call<{ title: string; items: PlaylistItem[] }>({ list: listId }, 45_000);

/** Potongan dengan 1× ulang — eksekusi Apps Script sesekali gagal sesaat */
async function fetchChunk(params: Record<string, string>): Promise<Chunk> {
  try {
    return await call<Chunk>(params, 120_000);
  } catch (e) {
    if (e instanceof AppError && FINAL_CODES.has(e.code)) throw e;
    return call<Chunk>(params, 120_000);
  }
}

const extOf = (mime: string) => (mime.includes("webm") ? "webm" : mime.includes("mp4") ? "m4a" : "audio");

/** Unduh audio terbaik ke `<dir>/source.<ext>` lewat jembatan */
export async function bridgeDownload(
  videoId: string,
  dir: string,
  maxDuration: number,
  onProgress: (pct: number) => void,
): Promise<{ path: string; title: string; duration: number }> {
  const first = await fetchChunk({ v: videoId, start: "0" });
  if (first.live || first.duration > maxDuration) {
    throw new AppError(`Video dilewati: siaran live / lebih dari ${Math.floor(maxDuration / 60)} menit`, 422, "TOO_LONG");
  }
  if (first.total > MAX_BYTES) throw new AppError("File audio terlalu besar", 413, "TOO_LARGE");

  const target = path.join(dir, `source.${extOf(first.mime)}`);
  const part = `${target}.part`;
  const fh = await fsp.open(part, "w");
  try {
    let chunk = first;
    let got = 0;
    for (;;) {
      const buf = Buffer.from(chunk.data, "base64");
      if (!buf.length || chunk.start !== got) throw new AppError("Potongan audio dari jembatan tidak urut", 502, "BRIDGE");
      await fh.write(buf);
      got += buf.length;
      onProgress(Math.min(99, Math.floor((got / first.total) * 100)));
      if (got >= first.total) break;
      // itag dikunci → potongan berikutnya dari file yang sama persis walau client di script berganti
      chunk = await fetchChunk({ v: videoId, start: String(got), itag: String(first.itag) });
    }
  } catch (e) {
    await fh.close();
    await fsp.rm(part, { force: true });
    throw e;
  }
  await fh.close();
  await fsp.rename(part, target);
  onProgress(100);
  return { path: target, title: first.title, duration: first.duration };
}

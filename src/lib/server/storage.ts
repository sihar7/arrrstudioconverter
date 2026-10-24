import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";
import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";
import { config } from "./config";
import { AppError } from "./http";
import { getJson, K, redis, setJson } from "./redis";
import { MIME } from "./media/ffmpeg";
import type { AudioFormat } from "@/lib/schemas/convert.schema";

// File hasil konversi. Production (Vercel): Vercel Blob private. Dev: storage/out di disk.
// Metadata selalu di Redis (TTL) + sorted set kedaluwarsa untuk pembersihan.

export interface FileMeta {
  fileId: string;
  owner: string;
  filename: string;
  format: AudioFormat | string;
  mime: string;
  size: number;
  duration: number;
  title: string;
  videoId: string;
  createdAt: number;
  expiresAt: number;
  blobPath: string | null;
}

const EXP_SET = K("files", "exp");
const metaKey = (id: string) => K("file", id);

export function safeFilename(title: string) {
  const name = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[ .]+|[ .]+$/g, "")
    .slice(0, 120);
  return name || "audio";
}

export async function saveOutput(
  localPath: string,
  info: Omit<FileMeta, "fileId" | "mime" | "size" | "filename" | "createdAt" | "expiresAt" | "blobPath">,
): Promise<FileMeta> {
  const fileId = randomBytes(16).toString("hex");
  const stat = await fsp.stat(localPath);
  const now = Date.now();
  const ext = info.format;
  const mime = MIME[info.format as AudioFormat] ?? "application/octet-stream";
  let blobPath: string | null = null;

  if (config.blobEnabled) {
    blobPath = `arrc/${fileId}/audio.${ext}`;
    await blobPut(blobPath, fs.createReadStream(localPath), {
      access: "private",
      contentType: mime,
      multipart: stat.size > 8 * 1024 * 1024,
    });
    await fsp.rm(localPath, { force: true });
  } else {
    const dir = path.join(config.paths.out, fileId);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.rename(localPath, path.join(dir, `audio.${ext}`));
  }

  const meta: FileMeta = {
    ...info,
    fileId,
    mime,
    size: stat.size,
    filename: `${safeFilename(info.title)}.${ext}`,
    createdAt: now,
    expiresAt: now + config.limits.fileTtlMs,
    blobPath,
  };
  await setJson(metaKey(fileId), meta, Math.ceil(config.limits.fileTtlMs / 1000) + 600);
  await redis().zadd(EXP_SET, meta.expiresAt, fileId);
  return meta;
}

/** Simpan buffer apa adanya (mis. .rbxm fallback spoof) sebagai file yang bisa diunduh */
export async function saveBytes(
  bytes: Buffer,
  info: { owner: string; ext: string; mime: string; title: string },
): Promise<FileMeta> {
  const fileId = randomBytes(16).toString("hex");
  const now = Date.now();
  let blobPath: string | null = null;

  if (config.blobEnabled) {
    blobPath = `arrc/${fileId}/asset.${info.ext}`;
    await blobPut(blobPath, bytes, { access: "private", contentType: info.mime });
  } else {
    const dir = path.join(config.paths.out, fileId);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, `audio.${info.ext}`), bytes);
  }

  const meta: FileMeta = {
    fileId,
    owner: info.owner,
    filename: `${safeFilename(info.title)}.${info.ext}`,
    format: info.ext,
    mime: info.mime,
    size: bytes.length,
    duration: 0,
    title: info.title,
    videoId: "",
    createdAt: now,
    expiresAt: now + config.limits.fileTtlMs,
    blobPath,
  };
  await setJson(metaKey(fileId), meta, Math.ceil(config.limits.fileTtlMs / 1000) + 600);
  await redis().zadd(EXP_SET, meta.expiresAt, fileId);
  return meta;
}

export async function findFile(fileId: string, owner: string): Promise<FileMeta> {
  if (!/^[a-f0-9]{32}$/.test(fileId)) throw new AppError("ID file tidak valid", 400);
  const meta = await getJson<FileMeta>(metaKey(fileId));
  if (!meta || meta.owner !== owner || meta.expiresAt < Date.now()) {
    throw new AppError("File tidak ditemukan / sudah kedaluwarsa — convert ulang", 404, "FILE_GONE");
  }
  return meta;
}

export async function fileExists(fileId: string) {
  return (await redis().exists(metaKey(fileId))) === 1;
}

const localPathOf = (m: FileMeta) => path.join(config.paths.out, m.fileId, `audio.${m.format}`);

/** Stream isi file. Range hanya didukung untuk disk lokal (Blob dikirim utuh). */
export async function openFile(
  meta: FileMeta,
  range: { start: number; end: number } | null,
): Promise<{ stream: ReadableStream<Uint8Array>; length: number; partial: boolean }> {
  if (meta.blobPath) {
    const res = await blobGet(meta.blobPath, { access: "private" });
    if (!res || res.statusCode !== 200) throw new AppError("File tidak ditemukan di storage", 404, "FILE_GONE");
    return { stream: res.stream, length: res.blob.size, partial: false };
  }
  const p = localPathOf(meta);
  if (!fs.existsSync(p)) throw new AppError("File tidak ditemukan di storage", 404, "FILE_GONE");
  const opts = range ? { start: range.start, end: range.end } : undefined;
  const length = range ? range.end - range.start + 1 : meta.size;
  const node = fs.createReadStream(p, opts);
  return { stream: Readable.toWeb(node) as ReadableStream<Uint8Array>, length, partial: Boolean(range) };
}

export async function readBytes(meta: FileMeta): Promise<Buffer> {
  if (meta.blobPath) {
    const { stream } = await openFile(meta, null);
    return Buffer.from(await new Response(stream).arrayBuffer());
  }
  return fsp.readFile(localPathOf(meta));
}

async function removeStored(fileId: string) {
  const meta = await getJson<FileMeta>(metaKey(fileId));
  if (meta?.blobPath) await blobDel(meta.blobPath).catch(() => {});
  await fsp.rm(path.join(config.paths.out, fileId), { recursive: true, force: true });
  await redis().del(metaKey(fileId));
  await redis().zrem(EXP_SET, fileId);
}

/** Hapus file kedaluwarsa + cache sumber lama. Dipanggil cron (Vercel) / timer (dev). */
export async function cleanupExpired(): Promise<{ files: number; cache: number }> {
  const expired = await redis().zrangebyscore(EXP_SET, 0, Date.now(), "LIMIT", 0, 500);
  for (const id of expired) await removeStored(id);

  let cache = 0;
  const dirs = await fsp.readdir(config.paths.cache).catch(() => [] as string[]);
  for (const d of dirs) {
    const full = path.join(config.paths.cache, d);
    const st = await fsp.stat(full).catch(() => null);
    if (st && Date.now() - st.mtimeMs > config.limits.fileTtlMs) {
      await fsp.rm(full, { recursive: true, force: true });
      cache++;
    }
  }
  return { files: expired.length, cache };
}

const g = globalThis as unknown as { __arrcCleanup?: NodeJS.Timeout };

/** Timer pembersih — hanya untuk server yang hidup terus (dev lokal) */
export function ensureCleanupTimer() {
  if (config.serverless || g.__arrcCleanup) return;
  g.__arrcCleanup = setInterval(() => {
    cleanupExpired().catch((e) => console.error("[cleanup]", e));
  }, 10 * 60_000);
  g.__arrcCleanup.unref();
}

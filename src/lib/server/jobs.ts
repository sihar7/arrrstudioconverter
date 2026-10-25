import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { config } from "./config";
import { AppError } from "./http";
import { getJson, K, redis, setJson } from "./redis";
import { downloadSource, thumbOf, videoInfo } from "./media/youtube";
import { baselineBytes, encode } from "./media/ffmpeg";
import { ensureCleanupTimer, saveOutput } from "./storage";
import { addHistory, newHistoryId } from "./history";
import { refundQuota } from "./quota";
import type { AudioFormat, AudioOptions } from "@/lib/schemas/convert.schema";
import type { JobState, PublicJob } from "@/type/converter";

// Job konversi. State di Redis (bisa dibaca instance mana pun); eksekusi lewat next/server
// `after()` di route yang membuat job — sama di Vercel maupun dev lokal.

const JOB_TTL = 6 * 3600;
const jobKey = (id: string) => K("job", id);
const activeKey = (owner: string) => K("active", owner);

// Batas paralel per instance (di Vercel tiap instance biasanya 1 job)
const g = globalThis as unknown as { __arrcSlots?: { used: number; waiters: (() => void)[] } };
const slots = (g.__arrcSlots ??= { used: 0, waiters: [] });

async function acquire() {
  if (slots.used < config.limits.concurrent) {
    slots.used++;
    return;
  }
  await new Promise<void>((resolve) => slots.waiters.push(resolve));
}
function release() {
  const next = slots.waiters.shift();
  if (next) next();
  else slots.used = Math.max(0, slots.used - 1);
}

export const toPublic = ({ owner: _owner, ...job }: JobState): PublicJob => job;

export async function getJob(id: string, owner: string): Promise<JobState> {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("ID job tidak valid", 400);
  const job = await getJson<JobState>(jobKey(id));
  if (!job || job.owner !== owner) throw new AppError("Job tidak ditemukan / kedaluwarsa", 404, "NOT_FOUND");
  return job;
}

/** Buat job (status queued). Pemanggil wajib menjadwalkan runJob lewat after(). */
export async function createJob(owner: string, videoId: string, options: AudioOptions): Promise<JobState> {
  const r = redis();
  const active = await r.scard(activeKey(owner));
  if (active >= config.limits.perOwnerQueue) {
    throw new AppError(`Maksimal ${config.limits.perOwnerQueue} konversi berjalan bersamaan`, 429, "BUSY");
  }

  const now = Date.now();
  const job: JobState = {
    id: randomBytes(12).toString("hex"),
    owner,
    status: "queued",
    progress: 0,
    videoId,
    title: videoId,
    thumbnail: thumbOf(videoId),
    options,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  await setJson(jobKey(job.id), job, JOB_TTL);
  await r.sadd(activeKey(owner), job.id);
  await r.expire(activeKey(owner), 1800);
  return job;
}

export async function runJob(jobId: string, guestKeys: string[] | null) {
  ensureCleanupTimer();
  const job = await getJson<JobState>(jobKey(jobId));
  if (!job) return;

  let lastWrite = 0;
  let lastPct = -1;
  const save = async (patch: Partial<JobState>, force = false) => {
    Object.assign(job, patch, { updatedAt: Date.now() });
    const now = Date.now();
    if (!force && now - lastWrite < 700 && Math.abs(job.progress - lastPct) < 3) return;
    lastWrite = now;
    lastPct = job.progress;
    await setJson(jobKey(job.id), job, JOB_TTL);
  };

  await acquire();
  const tmpOut = path.join(/* turbopackIgnore: true */ config.paths.tmp, `${job.id}.${job.options.format}`);
  try {
    const info = await videoInfo(job.videoId).catch(() => null);
    await save({ status: "downloading", progress: 1, title: info?.title ?? job.title }, true);

    const src = await downloadSource(job.videoId, (p) => {
      void save({ progress: Math.max(1, Math.round(p * 0.55)) });
    });
    const title = info?.title && info.title !== job.videoId ? info.title : src.title;
    await save({ status: "processing", progress: 56, title }, true);

    await fsp.mkdir(config.paths.tmp, { recursive: true });
    const { duration } = await encode(src.path, tmpOut, job.options, { title, sourceDuration: src.duration }, (p) => {
      void save({ progress: 56 + Math.round(p * 0.42) });
    });

    const meta = await saveOutput(tmpOut, {
      owner: job.owner,
      format: job.options.format,
      duration,
      title,
      videoId: job.videoId,
    });

    const format = meta.format as AudioFormat;
    const base = job.options.compress ? baselineBytes(job.options, duration) : null;
    const saved = base && meta.size < base ? Math.round((1 - meta.size / base) * 100) : null;

    let historyId: string | null = null;
    if (job.owner.startsWith("u:")) {
      historyId = newHistoryId();
      await addHistory(job.owner.slice(2), {
        id: historyId,
        createdAt: Date.now(),
        videoId: job.videoId,
        title,
        thumbnail: job.thumbnail,
        format,
        size: meta.size,
        duration: meta.duration,
        options: job.options,
        fileId: meta.fileId,
        fileExpiresAt: meta.expiresAt,
        roblox: null,
      });
    }

    await save(
      {
        status: "done",
        progress: 100,
        result: {
          fileId: meta.fileId,
          filename: meta.filename,
          format,
          size: meta.size,
          saved,
          duration: meta.duration,
          expiresAt: meta.expiresAt,
          historyId,
        },
      },
      true,
    );
  } catch (e) {
    const message = e instanceof AppError ? e.message : "Konversi gagal, coba lagi";
    if (!(e instanceof AppError)) console.error("[job]", e);
    await refundQuota(job.owner, guestKeys);
    await save({ status: "error", error: message }, true);
  } finally {
    await fsp.rm(tmpOut, { force: true }).catch(() => {});
    await redis().srem(activeKey(job.owner), job.id);
    release();
  }
}

import "server-only";
import { AppError } from "../http";
import { run } from "./process";
import { ffmpegBin } from "./tools";
import { BITRATES, type AudioFormat, type AudioOptions } from "@/lib/schemas/convert.schema";

// Rantai filter ffmpeg untuk semua efek audio + encode ke format tujuan

const BASE_RATE = 44100;
const fx = (n: number, d = 4) => Number(n.toFixed(d)).toString();

export const MIME: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  m4a: "audio/mp4",
};

/** Durasi hasil (detik) dari durasi sumber + trim + speed */
export function outputDuration(o: AudioOptions, sourceDuration: number) {
  const start = o.trimStart ?? 0;
  const end = o.trimEnd != null ? Math.min(o.trimEnd, sourceDuration || o.trimEnd) : sourceDuration;
  return Math.max(0, (end - start) / o.speed);
}

/**
 * Pitch digeser lewat asetrate (ikut mengubah tempo), lalu atempo mengoreksi tempo supaya
 * hasil akhirnya tepat x speed. preservePitch=false → nada ikut speed (gaya nightcore/slowed).
 */
export function filterChain(o: AudioOptions, outDur: number): string {
  const f: string[] = [`aresample=${BASE_RATE}`];

  const semis = o.preservePitch ? o.pitch : o.pitch + 12 * Math.log2(o.speed);
  const p = 2 ** (semis / 12);
  if (Math.abs(p - 1) > 1e-4) f.push(`asetrate=${Math.round(BASE_RATE * p)}`, `aresample=${BASE_RATE}`);

  let tempo = o.speed / p;
  while (tempo > 2) {
    f.push("atempo=2.0");
    tempo /= 2;
  }
  while (tempo < 0.5) {
    f.push("atempo=0.5");
    tempo /= 0.5;
  }
  if (Math.abs(tempo - 1) > 1e-4) f.push(`atempo=${fx(tempo, 6)}`);

  if (o.bass) f.push(`bass=g=${fx(o.bass, 1)}:f=110:w=0.7`);
  if (o.treble) f.push(`treble=g=${fx(o.treble, 1)}:f=3500:w=0.7`);

  if (o.reverb > 0) {
    const r = o.reverb / 100;
    f.push(`aecho=0.85:${fx(0.75 + 0.15 * r, 2)}:45|80|125:${fx(0.4 * r, 3)}|${fx(0.28 * r, 3)}|${fx(0.18 * r, 3)}`);
  }
  if (o.spatial8d) f.push("aformat=channel_layouts=stereo", "apulsator=hz=0.09:amount=0.85");
  if (o.volume) f.push(`volume=${fx(o.volume, 1)}dB`);
  if (o.normalize) f.push("loudnorm=I=-14:TP=-1.5:LRA=11");
  if (o.bass > 0 || o.volume > 0) f.push("alimiter=limit=0.97:level=false");

  if (o.fadeIn > 0) f.push(`afade=t=in:st=0:d=${fx(o.fadeIn, 2)}`);
  if (o.fadeOut > 0 && outDur > o.fadeOut) f.push(`afade=t=out:st=${fx(outDur - o.fadeOut, 3)}:d=${fx(o.fadeOut, 2)}`);

  f.push(`aresample=${o.sampleRate}`);
  return f.join(",");
}

export interface SourceProbe {
  /** kbps audio sumber; null kalau tidak terbaca */
  kbps: number | null;
}

/** Baca bitrate sumber dari header ffmpeg (tanpa ffprobe — ffmpeg-static tidak menyertakannya) */
export async function probe(src: string): Promise<SourceProbe> {
  const r = await run(ffmpegBin(), ["-hide_banner", "-i", src], { timeoutMs: 20_000, label: "ffmpeg" }).catch(() => null);
  const text = r?.stderr ?? "";
  const stream = text.match(/Audio:.*?(\d+) kb\/s/);
  const total = text.match(/bitrate:\s*(\d+) kb\/s/);
  const kbps = Number(stream?.[1] ?? total?.[1]);
  return { kbps: Number.isFinite(kbps) && kbps > 0 ? kbps : null };
}

// Transcode lossy→lossy butuh sedikit ruang ekstra supaya tidak terdengar turun
const HEADROOM: Record<string, number> = { mp3: 1.35, ogg: 1.2, m4a: 1.25 };
// Kualitas VBR yang setara (transparan) dengan bitrate CBR pilihan
const LAME_Q: Record<number, number> = { 320: 0, 256: 1, 192: 2, 128: 5, 96: 6 };
const VORBIS_Q: Record<number, number> = { 320: 8, 256: 7, 192: 6, 128: 4, 96: 2 };

/** Bitrate efektif: tidak melebihi pilihan user, dan tidak melebihi yang dibutuhkan sumber */
export function effectiveBitrate(o: AudioOptions, src: SourceProbe): number {
  if (!o.compress || !src.kbps) return o.bitrate;
  const need = src.kbps * (HEADROOM[o.format] ?? 1.3);
  const fit = BITRATES.find((b) => b >= need) ?? BITRATES[BITRATES.length - 1];
  return Math.min(o.bitrate, fit);
}

function codecArgs(o: AudioOptions, kbps: number): string[] {
  const br = `${kbps}k`;
  switch (o.format) {
    case "mp3":
      return o.compress ? ["-c:a", "libmp3lame", "-q:a", String(LAME_Q[kbps] ?? 2)] : ["-c:a", "libmp3lame", "-b:a", br];
    case "ogg":
      return o.compress ? ["-c:a", "libvorbis", "-q:a", String(VORBIS_Q[kbps] ?? 6)] : ["-c:a", "libvorbis", "-b:a", br];
    case "wav":
      return ["-c:a", "pcm_s16le"];
    case "flac":
      // s16 eksplisit: tanpa ini filter float bisa jadi s32 (ukuran membengkak tanpa tambahan kualitas)
      return ["-c:a", "flac", "-sample_fmt", "s16", "-compression_level", o.compress ? "12" : "8", ...(o.compress ? ["-exact_rice_parameters", "1"] : [])];
    case "m4a":
      return ["-c:a", "aac", "-b:a", br, "-movflags", "+faststart"];
  }
}

/** Perkiraan ukuran tanpa kompres (CBR pilihan / PCM) — dasar hitung "hemat x%" */
export function baselineBytes(o: AudioOptions, duration: number): number | null {
  if (!duration) return null;
  if (o.format === "wav") return null;
  if (o.format === "flac") return Math.round(o.sampleRate * (o.mono ? 1 : 2) * 2 * duration);
  return Math.round((o.bitrate * 1000 * duration) / 8);
}

export async function encode(
  src: string,
  out: string,
  o: AudioOptions,
  meta: { title: string; sourceDuration: number },
  onProgress: (pct: number) => void,
) {
  const outDur = outputDuration(o, meta.sourceDuration);
  if (meta.sourceDuration && o.trimStart != null && o.trimStart >= meta.sourceDuration) {
    throw new AppError("Titik mulai trim melebihi durasi lagu", 422, "TRIM");
  }

  const kbps = effectiveBitrate(o, o.compress ? await probe(src) : { kbps: null });
  const args = ["-hide_banner", "-loglevel", "error", "-nostats", "-y"];
  if (o.trimStart) args.push("-ss", fx(o.trimStart, 3));
  if (o.trimEnd != null) args.push("-to", fx(o.trimEnd, 3));
  args.push(
    "-i",
    src,
    "-vn",
    "-map",
    "0:a:0",
    "-map_metadata",
    "-1",
    "-af",
    filterChain(o, outDur),
    "-ac",
    o.mono ? "1" : "2",
    "-ar",
    String(o.sampleRate),
    ...codecArgs(o, kbps),
    "-metadata",
    `title=${meta.title.slice(0, 200)}`,
    "-metadata",
    "comment=ARRR Studio Converter",
    "-progress",
    "pipe:1",
    out,
  );

  const r = await run(ffmpegBin(), args, {
    timeoutMs: 10 * 60_000,
    label: "ffmpeg",
    onLine: (line) => {
      const m = line.match(/^out_time_(?:ms|us)=(\d+)/);
      if (m && outDur > 0) onProgress(Math.min(100, (Number(m[1]) / 1e6 / outDur) * 100));
    },
  });
  if (r.code !== 0) {
    console.error("[ffmpeg]", r.stderr.slice(-800));
    throw new AppError("Gagal memproses audio (ffmpeg)", 500, "FFMPEG");
  }
  return { duration: Math.round(outDur), kbps };
}

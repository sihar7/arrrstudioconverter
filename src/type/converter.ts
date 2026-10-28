import type { AudioFormat, AudioOptions } from "@/lib/schemas/convert.schema";

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  /** detik; null kalau belum diketahui (oEmbed tidak memberi durasi) */
  duration: number | null;
  /** Video album (khusus admin): lagu-lagu dari chapter → dipecah jadi item antrean sendiri */
  tracks?: AlbumTrack[];
}

/** Satu lagu dalam video album (chapter) — dipotong lewat trimStart/trimEnd saat convert */
export interface AlbumTrack {
  title: string;
  /** detik mulai */
  start: number;
  /** detik selesai; null = sampai akhir video */
  end: number | null;
}

export interface PlaylistItem {
  videoId: string;
  title: string;
  duration: number | null;
}

export type JobStatus = "queued" | "downloading" | "processing" | "done" | "error";

export interface JobResult {
  fileId: string;
  filename: string;
  format: AudioFormat;
  size: number;
  /** % lebih kecil dibanding tanpa kompres pintar; null = tidak dikompres / tidak terhitung */
  saved?: number | null;
  duration: number;
  expiresAt: number;
  historyId: string | null;
}

export interface JobState {
  id: string;
  owner: string;
  status: JobStatus;
  /** 0–100 */
  progress: number;
  videoId: string;
  title: string;
  thumbnail: string;
  options: AudioOptions;
  result: JobResult | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Bentuk job yang dikirim ke klien (tanpa owner) */
export type PublicJob = Omit<JobState, "owner">;

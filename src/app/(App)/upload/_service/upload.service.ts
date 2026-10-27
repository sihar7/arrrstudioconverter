import { apiFetch } from "@/lib/utils";

// File audio dari perangkat → server per-chunk (body proxy web dibatasi), lalu upload Roblox lewat
// /api/roblox/upload yang sama dengan Converter (lihat useFileUpload)

export const CHUNK_BYTES = 3 * 1024 * 1024;

export interface SentFile {
  fileId: string;
  historyId: string;
  duration: number;
}

type ChunkResponse = { done: false; received: number } | ({ done: true; received: number } & SentFile);

/** Kirim file per-chunk; onProgress 0–100 dari byte yang sudah diterima server */
export async function sendFile(file: File, onProgress: (pct: number) => void, alive: () => boolean): Promise<SentFile> {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const total = file.size;
  for (let offset = 0; offset < total; ) {
    if (!alive()) throw new Error("aborted");
    const end = Math.min(total, offset + CHUNK_BYTES);
    const q = new URLSearchParams({ id, offset: String(offset), total: String(total), name: file.name });
    const r = await apiFetch<ChunkResponse>(`/api/files/upload?${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file.slice(offset, end),
    });
    onProgress(Math.round((r.received / total) * 100));
    if (r.done) return { fileId: r.fileId, historyId: r.historyId, duration: r.duration };
    offset = r.received;
  }
  throw new Error("Upload tidak selesai");
}

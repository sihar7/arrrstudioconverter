import { apiFetch } from "@/lib/utils";
import { deviceId } from "@/lib/deviceId";
import { withBase } from "@/Url/Url";
import { safeName, safeText } from "@/lib/schemas/safeText";
import type { AudioOptions } from "@/lib/schemas/convert.schema";
import type { PublicJob } from "@/type/converter";
import type { PermissionMode } from "@/type/history";
import type { CreateJobResponse, InfoResponse, UploadResponse } from "../_types/converter.type";

export function fetchInfo(url: string, playlist = false) {
  return apiFetch<InfoResponse>("/api/youtube/info", { method: "POST", json: { url, playlist } });
}

/** title = judul tetap (lagu dari video album) — server tidak menimpanya dengan judul video */
export async function createJob(videoId: string, options: AudioOptions, signal?: AbortSignal, title?: string) {
  // Sidik jari perangkat → kuota tamu tidak ter-reset lewat incognito / ganti browser / VPN
  const fp = await deviceId();
  return apiFetch<CreateJobResponse>("/api/convert", { method: "POST", json: { videoId, options, title }, signal, headers: fp ? { "x-arr-fp": fp } : undefined });
}

/** Batalkan job di server (proses dihentikan, file sementara dihapus, token dikembalikan) */
export function cancelJob(id: string) {
  return apiFetch<{ job: PublicJob }>(`/api/jobs/${id}`, { method: "DELETE" });
}

export function getJob(id: string, signal?: AbortSignal) {
  return apiFetch<{ job: PublicJob }>(`/api/jobs/${id}`, { signal, cache: "no-store" });
}

export interface UploadPayload {
  fileId: string;
  historyId?: string;
  apiKey: string;
  creatorType: "user" | "group";
  creatorId: string;
  displayName: string;
  description: string;
  permission: PermissionMode;
  placeId?: string;
}

/** Nama & deskripsi disaring dulu (kata kasar / data pribadi) — server menyaring ulang */
export function uploadToRoblox(body: UploadPayload) {
  const json = { ...body, displayName: safeName(body.displayName), description: safeText(body.description).text };
  return apiFetch<UploadResponse>("/api/roblox/upload", { method: "POST", json });
}

export function checkOperation(apiKey: string, operationId: string, historyId?: string) {
  return apiFetch<UploadResponse>("/api/roblox/operation", { method: "POST", json: { apiKey, operationId, historyId } });
}

export interface TrimBody {
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  historyId?: string;
}
export interface TrimmedFile {
  fileId: string;
  filename: string;
  format: string;
  size: number;
  duration: number;
  expiresAt: number;
}

/** Pangkas file hasil di server (waktu file, detik) → file baru menggantikan yang lama; tanpa token */
export function trimFile(fileId: string, body: TrimBody, signal?: AbortSignal) {
  return apiFetch<{ file: TrimmedFile }>(`/api/files/${fileId}/trim`, { method: "POST", json: body, signal });
}

export const fileUrl = (fileId: string, download = false) => withBase(`/api/files/${fileId}${download ? "?dl=1" : ""}`);
export const zipUrl = (fileIds: string[]) => withBase(`/api/files/zip?ids=${fileIds.join(",")}`);

export interface ResolvedVideo {
  videoId: string;
  title: string;
  author: string;
  duration: number | null;
  thumbnail: string;
}

/** Impor file: judul lagu (atau "id:<videoId>") → video YouTube paling cocok; null = tidak ketemu. Maks 25 per panggilan */
export function resolveSongs(queries: string[], signal?: AbortSignal) {
  return apiFetch<{ items: (ResolvedVideo | null)[] }>("/api/youtube/resolve", { method: "POST", json: { queries }, signal });
}

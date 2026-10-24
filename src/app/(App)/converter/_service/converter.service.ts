import { apiFetch } from "@/lib/utils";
import type { AudioOptions } from "@/lib/schemas/convert.schema";
import type { PublicJob } from "@/type/converter";
import type { PermissionMode } from "@/type/history";
import type { CreateJobResponse, InfoResponse, UploadResponse } from "../_types/converter.type";

export function fetchInfo(url: string, playlist = false) {
  return apiFetch<InfoResponse>("/api/youtube/info", { method: "POST", json: { url, playlist } });
}

export function createJob(videoId: string, options: AudioOptions, signal?: AbortSignal) {
  return apiFetch<CreateJobResponse>("/api/convert", { method: "POST", json: { videoId, options }, signal });
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

export function uploadToRoblox(body: UploadPayload) {
  return apiFetch<UploadResponse>("/api/roblox/upload", { method: "POST", json: body });
}

export function checkOperation(apiKey: string, operationId: string, historyId?: string) {
  return apiFetch<UploadResponse>("/api/roblox/operation", { method: "POST", json: { apiKey, operationId, historyId } });
}

export const fileUrl = (fileId: string, download = false) => `/api/files/${fileId}${download ? "?dl=1" : ""}`;
export const zipUrl = (fileIds: string[]) => `/api/files/zip?ids=${fileIds.join(",")}`;

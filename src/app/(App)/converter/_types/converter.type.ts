import type { PlaylistItem, PublicJob, VideoInfo } from "@/type/converter";
import type { QuotaInfo } from "@/type/auth";

export type InfoResponse =
  | { type: "video"; video: VideoInfo; playlistId: string | null }
  | { type: "playlist"; playlistId: string; title: string; items: PlaylistItem[] };

export interface CreateJobResponse {
  job: PublicJob;
  quota: QuotaInfo;
}

export interface UploadResponse {
  assetId: string | null;
  operationId: string | null;
}

export interface PlaylistSuggestion {
  url: string;
  playlistId: string;
}

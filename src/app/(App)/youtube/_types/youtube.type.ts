import type { VideoInfo } from "@/type/converter";

/** Satu hasil pencarian YouTube (BE /api/youtube/search) */
export interface SearchVideo extends VideoInfo {
  views: string;
  published: string;
}

export interface SearchResponse {
  items: SearchVideo[];
  /** token halaman berikutnya; null = habis */
  continuation: string | null;
}

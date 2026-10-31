import type { VideoInfo } from "@/type/converter";

/** Satu hasil pencarian YouTube (BE /api/youtube/search) */
export interface SearchVideo extends VideoInfo {
  views: string;
  published: string;
}

/** Filter pencarian (sama dengan menu Filter youtube.com; YouTube kini hanya mengurutkan relevansi / populer) */
export interface SearchFilters {
  duration: "any" | "short" | "medium" | "long";
  upload: "any" | "hour" | "today" | "week" | "month" | "year";
  sort: "relevance" | "views";
}

export const DEFAULT_FILTERS: SearchFilters = { duration: "any", upload: "any", sort: "relevance" };

export interface SearchResponse {
  items: SearchVideo[];
  /** token halaman berikutnya; null = habis */
  continuation: string | null;
}

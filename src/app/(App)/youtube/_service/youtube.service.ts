import { apiFetch } from "@/lib/utils";
import type { SearchResponse } from "../_types/youtube.type";

/** Kata kunci baru, atau halaman berikutnya lewat token `continuation` */
export function searchYoutube(q: string, continuation?: string, signal?: AbortSignal) {
  const qs = new URLSearchParams(continuation ? { c: continuation } : { q });
  return apiFetch<SearchResponse>(`/api/youtube/search?${qs}`, { signal });
}

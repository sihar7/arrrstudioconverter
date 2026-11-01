import { apiFetch } from "@/lib/utils";
import type { SearchFilters, SearchResponse } from "../_types/youtube.type";

/**
 * Kata kunci baru, atau halaman berikutnya lewat token `continuation`. Token sudah membawa filter; durasi tetap
 * dikirim karena server menyaring ulang tiap halaman.
 */
export function searchYoutube(q: string, filters: SearchFilters, continuation?: string, signal?: AbortSignal) {
  const qs = new URLSearchParams(continuation ? { c: continuation, duration: filters.duration } : { q, ...filters });
  return apiFetch<SearchResponse>(`/api/youtube/search?${qs}`, { signal });
}

/** Saran ketikan ala kotak cari YouTube; gagal → daftar kosong */
export function suggestYoutube(q: string, hl: "id" | "en", signal?: AbortSignal) {
  const qs = new URLSearchParams({ q, hl });
  return apiFetch<{ items: string[] }>(`/api/youtube/suggest?${qs}`, { signal }).then((r) => r.items);
}

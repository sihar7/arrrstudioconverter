import { apiFetch } from "@/lib/utils";
import { VERSION_TERMS, type SearchFilters, type SearchResponse } from "../_types/youtube.type";

/**
 * Kata kunci baru, atau halaman berikutnya lewat token `continuation`. Token sudah membawa filter; durasi tetap
 * dikirim karena server menyaring ulang tiap halaman.
 */
export function searchYoutube(q: string, filters: SearchFilters, continuation?: string, signal?: AbortSignal) {
  const { version, duration, upload, sort } = filters;
  // Versi = kata kunci tambahan; dilewati bila kata kuncinya sudah memuatnya (mis. "lagu cover" + Cover)
  const extra = VERSION_TERMS[version];
  const term = extra && !q.toLowerCase().includes(extra) ? `${q} ${extra}` : q;
  const qs = new URLSearchParams(continuation ? { c: continuation, duration } : { q: term, duration, upload, sort });
  return apiFetch<SearchResponse>(`/api/youtube/search?${qs}`, { signal });
}

/** Saran ketikan ala kotak cari YouTube; gagal → daftar kosong */
export function suggestYoutube(q: string, hl: "id" | "en", signal?: AbortSignal) {
  const qs = new URLSearchParams({ q, hl });
  return apiFetch<{ items: string[] }>(`/api/youtube/suggest?${qs}`, { signal }).then((r) => r.items);
}

/** Rekomendasi "Untukmu" / "Berikutnya": video terkait dari beberapa lagu acuan (maks 5) */
export function relatedYoutube(seeds: string[], signal?: AbortSignal) {
  const qs = new URLSearchParams({ v: seeds.slice(0, 5).join(",") });
  return apiFetch<SearchResponse>(`/api/youtube/related?${qs}`, { signal });
}

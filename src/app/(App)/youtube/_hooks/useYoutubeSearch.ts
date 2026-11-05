"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { searchYoutube } from "../_service/youtube.service";
import { DEFAULT_FILTERS, matchesVersion, type SearchFilters, type SearchVideo } from "../_types/youtube.type";

// Hasil tersaring (Versi) masih sedikit → muat halaman berikut otomatis, maks AUTO_FILL kali per pencarian
const MIN_VISIBLE = 12;
const AUTO_FILL = 4;

/** Pencarian YouTube + halaman berikutnya; permintaan lama dibatalkan saat kata kunci berganti */
export function useYoutubeSearch() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchVideo[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<SearchFilters>(DEFAULT_FILTERS);
  // Ref → search tetap stabil (dipakai listener palette) walau filter berganti
  const filtersRef = useRef(filters);
  const ctrl = useRef<AbortController | null>(null);
  const filled = useRef(0);

  const fail = useCallback(
    (e: unknown) => {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e));
    },
    [t],
  );

  const search = useCallback(
    async (q: string) => {
      const term = q.trim();
      if (!term) return;
      ctrl.current?.abort();
      const c = (ctrl.current = new AbortController());
      setQuery(term);
      filled.current = 0;
      setLoading(true);
      setError(null);
      try {
        const res = await searchYoutube(term, filtersRef.current, undefined, c.signal);
        setItems(res.items);
        setNext(res.continuation);
      } catch (e) {
        fail(e);
      } finally {
        if (ctrl.current === c) setLoading(false);
      }
    },
    [fail],
  );

  /**
   * Halaman berikutnya. auto = dari infinite scroll: TIDAK mengulang setelah error (dulu gagal → skeleton hilang →
   * sentinel terlihat lagi → muat lagi → halaman bergetar & kena rate limit). Ulang manual lewat tombol (auto=false).
   */
  const loadMore = useCallback(
    async (auto = false) => {
      if (!next || loadingMore || loading || (auto && error)) return;
      const c = ctrl.current;
      setLoadingMore(true);
      setError(null);
      try {
        const res = await searchYoutube("", filtersRef.current, next, c?.signal);
        // Kata kunci berganti selama memuat → halaman lama dibuang
        if (ctrl.current !== c) return;
        const seen = new Set(items.map((v) => v.videoId));
        const fresh = res.items.filter((v) => !seen.has(v.videoId));
        setItems((prev) => [...prev, ...fresh]);
        // Halaman tanpa video baru (YouTube mengulang hasil) → berhenti, jangan memuat tanpa akhir
        setNext(fresh.length ? res.continuation : null);
      } catch (e) {
        fail(e);
      } finally {
        setLoadingMore(false);
      }
    },
    [next, loadingMore, loading, error, items, fail],
  );

  /** Ganti sebagian filter → kata kunci aktif dicari ulang */
  const setFilters = useCallback(
    (patch: Partial<SearchFilters>) => {
      const nextFilters = { ...filtersRef.current, ...patch };
      filtersRef.current = nextFilters;
      setFiltersState(nextFilters);
      if (query) void search(query);
    },
    [query, search],
  );

  // Item mentah dari YouTube tetap disimpan (dedupe & halaman berikut); yang tampil = lolos saring Versi
  const visible = useMemo(() => items.filter((v) => matchesVersion(v.title, filters.version)), [items, filters.version]);
  useEffect(() => {
    if (loading || loadingMore || error || !next || visible.length >= MIN_VISIBLE || filled.current >= AUTO_FILL) return;
    filled.current++;
    void loadMore(true);
  }, [loading, loadingMore, error, next, visible.length, loadMore]);

  return { query, items: visible, pages: items.length, hasMore: Boolean(next), loading, loadingMore, error, search, loadMore, filters, setFilters };
}

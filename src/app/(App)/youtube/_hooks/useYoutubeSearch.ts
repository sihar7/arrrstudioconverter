"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { searchYoutube } from "../_service/youtube.service";
import type { SearchVideo } from "../_types/youtube.type";

/** Pencarian YouTube + halaman berikutnya; permintaan lama dibatalkan saat kata kunci berganti */
export function useYoutubeSearch() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchVideo[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

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
      setLoading(true);
      setError(null);
      try {
        const res = await searchYoutube(term, undefined, c.signal);
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

  const loadMore = useCallback(async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await searchYoutube("", next);
      setItems((prev) => {
        const seen = new Set(prev.map((v) => v.videoId));
        return [...prev, ...res.items.filter((v) => !seen.has(v.videoId))];
      });
      setNext(res.continuation);
    } catch (e) {
      fail(e);
    } finally {
      setLoadingMore(false);
    }
  }, [next, loadingMore, fail]);

  return { query, items, hasMore: Boolean(next), loading, loadingMore, error, search, loadMore };
}

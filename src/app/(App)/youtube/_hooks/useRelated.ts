"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { relatedYoutube } from "../_service/youtube.service";
import type { SearchVideo } from "../_types/youtube.type";

/**
 * Video terkait dari lagu acuan (Untukmu / Berikutnya). Permintaan lama dibatalkan saat acuan berganti / unmount.
 * seeds kosong atau enabled=false → tidak memanggil server.
 */
export function useRelated(seeds: string[], enabled = true) {
  const { t } = useT();
  const key = seeds.join(",");
  const [state, setState] = useState<{ key: string; items: SearchVideo[]; error: string | null }>({ key: "", items: [], error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !key) return;
    const ctrl = new AbortController();
    relatedYoutube(key.split(","), ctrl.signal)
      .then((r) => setState({ key, items: r.items, error: null }))
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setState({ key, items: [], error: e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e) });
      });
    return () => ctrl.abort();
  }, [key, enabled, nonce, t]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const ready = state.key === key;
  return { items: ready ? state.items : [], error: ready ? state.error : null, loading: enabled && Boolean(key) && !ready, reload };
}

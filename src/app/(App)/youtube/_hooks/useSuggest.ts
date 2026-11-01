"use client";

import { useEffect, useState } from "react";
import { useT } from "@/hooks/useT";
import { suggestYoutube } from "../_service/youtube.service";

const DEBOUNCE_MS = 180;

/**
 * Saran ketikan untuk kolom cari: menunggu jeda mengetik, permintaan lama dibatalkan.
 * enabled = false (kolom tidak fokus / link YouTube) → tidak memanggil server.
 */
export function useSuggest(input: string, enabled: boolean) {
  const { lang } = useT();
  const [state, setState] = useState<{ q: string; items: string[] }>({ q: "", items: [] });
  const term = input.trim();
  const active = enabled && term.length >= 1 && term.length <= 100;

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      suggestYoutube(term, lang, ctrl.signal)
        .then((items) => setState({ q: term, items }))
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [active, term, lang]);

  // Saran untuk kata sebelumnya tetap tampil selama yang baru dimuat (tanpa kedip); nonaktif → kosong
  return active && state.q ? state.items : [];
}

"use client";

import { useAppSelector } from "@/store/hooks";
import { useHydrated } from "@/hooks/useHydrated";
import { dictionaries, fmt, type Lang } from "@/utils/i18n";

/**
 * Kamus aktif + helper format: const { t, f, lang } = useT(); f(t.quota.guest, { left: 2 }).
 * Selama hydration selalu memakai bahasa default ("id") = bahasa HTML server. Boundary Suspense
 * (loading.tsx) di-hydrate SETELAH preferensi dipulihkan dari localStorage, jadi tanpa gerbang ini
 * teks server (id) ≠ client (en) → "Hydration failed … text didn't match".
 */
export function useT() {
  const stored = useAppSelector((s) => s.preferences.lang);
  const hydrated = useHydrated();
  const lang: Lang = hydrated ? stored : "id";
  return { t: dictionaries[lang], f: fmt, lang };
}

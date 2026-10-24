"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./store";
import { loadState, saveState } from "./persist";
import { hydratePreferences } from "./slices/preferencesSlice";
import { hydrateConverter } from "./slices/converterSlice";
import { updateRoblox } from "./slices/robloxSlice";

// Server: satu store default dibuat di level modul (DI LUAR render). createStore Redux memanggil
// Math.random(), yang ditolak Cache Components saat prerender. Aman dibagi antar request karena
// server tidak pernah dispatch — state dipulihkan & diubah hanya di klien (useEffect di bawah).
const serverStore = typeof window === "undefined" ? makeStore() : null;

export default function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<AppStore>(() => serverStore ?? makeStore());

  useEffect(() => {
    // Pulihkan setelah mount (SSR selalu render default → tidak ada hydration mismatch)
    const saved = loadState();
    if (saved.converter) store.dispatch(hydrateConverter(saved.converter));
    if (saved.roblox) store.dispatch(updateRoblox(saved.roblox));
    store.dispatch(hydratePreferences(saved.preferences ?? {}));

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = store.subscribe(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        saveState(store.getState());
      }, 400);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}

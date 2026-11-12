"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./store";
import { loadQueue, loadState, saveQueue, saveState } from "./persist";
import { hydratePreferences } from "./slices/preferencesSlice";
import { hydrateConverter, hydrateQueue } from "./slices/converterSlice";
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
    // Antrean & batch impor bertahan saat refresh / update (job server dilanjutkan, bukan diulang)
    const queue = loadQueue();
    if (queue) store.dispatch(hydrateQueue(queue));

    let timer: ReturnType<typeof setTimeout> | null = null;
    let qTimer: ReturnType<typeof setTimeout> | null = null;
    let lastItems = store.getState().converter.items;
    let lastBatches = store.getState().converter.batches;
    const flushQueue = () => {
      qTimer = null;
      const { items, batches } = store.getState().converter;
      saveQueue({ items, batches });
    };
    const unsubscribe = store.subscribe(() => {
      const { items, batches } = store.getState().converter;
      // Antrean ditulis hanya bila berubah, dirapatkan 1,5 dtk (ratusan item → JSON besar, jangan tiap progres)
      if ((items !== lastItems || batches !== lastBatches) && !qTimer) qTimer = setTimeout(flushQueue, 1500);
      lastItems = items;
      lastBatches = batches;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        saveState(store.getState());
      }, 400);
    });
    // Tutup / refresh tab → simpan antrean terakhir saat itu juga
    const onHide = () => {
      if (qTimer) clearTimeout(qTimer);
      flushQueue();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onHide);
      if (timer) clearTimeout(timer);
      if (qTimer) clearTimeout(qTimer);
    };
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}

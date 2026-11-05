// Pustaka YouTube per perangkat (localStorage): riwayat tonton, tonton nanti, riwayat pencarian, dan "selera"
// (videoId lagu yang diputar/ditambah/di-convert → bahan rekomendasi "Untukmu"). Satu store kecil untuk seluruh app,
// tersinkron antar-tab lewat event `storage`. Listener storage dipasang sekali saat ada pelanggan pertama.

import { useSyncExternalStore } from "react";

export interface LibVideo {
  videoId: string;
  title: string;
  author: string;
  duration: number | null;
  views: string;
  published: string;
  thumbnail: string;
}
export interface WatchedVideo extends LibVideo {
  at: number;
}

export interface YtLibrary {
  history: WatchedVideo[];
  later: LibVideo[];
  searches: string[];
  /** videoId terbaru di depan */
  seeds: string[];
}

const KEY = "arrc.yt.library.v1";
const MAX = { history: 120, later: 200, searches: 12, seeds: 12 } as const;
const EMPTY: YtLibrary = { history: [], later: [], searches: [], seeds: [] };
const YT_ID = /^[\w-]{11}$/;

let state: YtLibrary = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): YtLibrary {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<YtLibrary>;
    const arr = <T,>(x: unknown) => (Array.isArray(x) ? (x as T[]) : []);
    return {
      history: arr<WatchedVideo>(v.history).filter((h) => YT_ID.test(h?.videoId)).slice(0, MAX.history),
      later: arr<LibVideo>(v.later).filter((h) => YT_ID.test(h?.videoId)).slice(0, MAX.later),
      searches: arr<string>(v.searches).filter((s) => typeof s === "string").slice(0, MAX.searches),
      seeds: arr<string>(v.seeds).filter((s) => YT_ID.test(s)).slice(0, MAX.seeds),
    };
  } catch {
    return EMPTY;
  }
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
}

function commit(next: YtLibrary) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage penuh / diblokir — tetap jalan di memori */
  }
  listeners.forEach((l) => l());
}

const onStorage = (e: StorageEvent) => {
  if (e.key !== KEY) return;
  state = read();
  listeners.forEach((l) => l());
};

const subscribe = (cb: () => void) => {
  ensure();
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
};

const pick = (v: LibVideo): LibVideo => ({
  videoId: v.videoId,
  title: v.title,
  author: v.author,
  duration: v.duration ?? null,
  views: v.views ?? "",
  published: v.published ?? "",
  thumbnail: v.thumbnail,
});

const front = <T,>(list: T[], item: T, same: (x: T) => boolean, max: number) => [item, ...list.filter((x) => !same(x))].slice(0, max);

export const ytLibrary = {
  get: () => (ensure(), state),
  /** Diputar → riwayat tonton (paling baru di atas) + selera */
  watched(v: LibVideo) {
    ensure();
    commit({
      ...state,
      history: front(state.history, { ...pick(v), at: Date.now() }, (x) => x.videoId === v.videoId, MAX.history),
      seeds: front(state.seeds, v.videoId, (x) => x === v.videoId, MAX.seeds),
    });
  },
  removeWatched(videoId: string) {
    ensure();
    commit({ ...state, history: state.history.filter((x) => x.videoId !== videoId) });
  },
  clearHistory() {
    ensure();
    commit({ ...state, history: [] });
  },
  /** Simpan/lepas "Tonton nanti"; true = sekarang tersimpan */
  toggleLater(v: LibVideo): boolean {
    ensure();
    const has = state.later.some((x) => x.videoId === v.videoId);
    commit({
      ...state,
      later: has ? state.later.filter((x) => x.videoId !== v.videoId) : front(state.later, pick(v), (x) => x.videoId === v.videoId, MAX.later),
    });
    return !has;
  },
  searched(q: string) {
    const term = q.trim();
    if (!term || term.length > 100) return;
    ensure();
    commit({ ...state, searches: front(state.searches, term, (x) => x.toLowerCase() === term.toLowerCase(), MAX.searches) });
  },
  removeSearch(q: string) {
    ensure();
    commit({ ...state, searches: state.searches.filter((x) => x !== q) });
  },
  /** Lagu masuk antrean / di-convert → bahan rekomendasi. ID non-YouTube (tt:/sc:…) diabaikan */
  addSeeds(ids: string[]) {
    ensure();
    const fresh = ids.filter((id) => YT_ID.test(id) && state.seeds[0] !== id);
    if (!fresh.length) return;
    let seeds = state.seeds;
    for (const id of fresh) seeds = front(seeds, id, (x) => x === id, MAX.seeds);
    if (seeds.join() !== state.seeds.join()) commit({ ...state, seeds });
  },
};

export function useYtLibrary(): YtLibrary {
  return useSyncExternalStore(subscribe, () => (ensure(), state), () => EMPTY);
}

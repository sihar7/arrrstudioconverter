// Satu pemutar preview hasil convert untuk seluruh app (hanya satu lagu diputar). Di app desktop pemutar
// tetap jalan saat pindah menu dan dikendalikan dari mini-player transport bar.

import { useSyncExternalStore } from "react";
import { withBase } from "@/Url/Url";

export interface PreviewTrack {
  fileId: string;
  title: string;
  artist: string | null;
  cover: string;
  /** detik dari hasil convert — dipakai sampai metadata audio terbaca */
  duration?: number;
}

export interface PreviewState {
  track: PreviewTrack | null;
  playing: boolean;
  /** detik */
  time: number;
  duration: number;
}

let state: PreviewState = { track: null, playing: false, time: 0, duration: 0 };
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;

const set = (patch: Partial<PreviewState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

function el() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = "none";
  audio.addEventListener("play", () => set({ playing: true }));
  audio.addEventListener("pause", () => set({ playing: false }));
  audio.addEventListener("ended", () => set({ playing: false, time: 0 }));
  audio.addEventListener("error", () => set({ playing: false }));
  // timeupdate ±4×/detik — cukup untuk progres tanpa render tiap frame
  audio.addEventListener("timeupdate", () => set({ time: audio!.currentTime }));
  audio.addEventListener("loadedmetadata", () => Number.isFinite(audio!.duration) && set({ duration: audio!.duration }));
  return audio;
}

export const previewPlayer = {
  /** Putar lagu ini; lagu yang sama → jeda/lanjut */
  toggle(track: PreviewTrack) {
    const a = el();
    if (state.track?.fileId === track.fileId) {
      if (a.paused) void a.play().catch(() => set({ playing: false }));
      else a.pause();
      return;
    }
    a.src = withBase(`/api/files/${track.fileId}`);
    set({ track, time: 0, duration: track.duration ?? 0, playing: true });
    void a.play().catch(() => set({ playing: false }));
  },
  pause() {
    audio?.pause();
  },
  seek(sec: number) {
    if (!audio || !state.duration) return;
    audio.currentTime = Math.max(0, Math.min(state.duration, sec));
    set({ time: audio.currentTime });
  },
  /** Berhenti & lupakan lagu (mini-player hilang) */
  stop() {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    set({ track: null, playing: false, time: 0, duration: 0 });
  },
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const server: PreviewState = { track: null, playing: false, time: 0, duration: 0 };

export function usePreview() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => server,
  );
}

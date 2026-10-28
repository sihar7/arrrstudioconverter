import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastKind = "info" | "ok" | "err";
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  /** epoch ms — urutan deck bersama popup antrean */
  at: number;
}

/** Popup "masuk antrean" (kanan bawah, klik → Converter). Tambahan beruntun digabung ke satu popup. */
export interface QueueNotice {
  /** key item antrean, terbaru di akhir */
  keys: string[];
  /** item terakhir ternyata sudah ada di antrean */
  dup: boolean;
  /** berubah tiap tambahan → timer tutup otomatis diulang */
  stamp: number;
}

/**
 * Kartu pembaruan (tidak tutup otomatis): web = deploy baru → muat ulang;
 * desktop = update app (electron-updater) sedang diunduh / siap dipasang / harus diunduh manual (macOS).
 */
export type UpdateNotice =
  | { kind: "web"; at: number }
  | { kind: "desktop"; phase: "downloading" | "ready" | "manual"; version: string; percent: number; bps: number; at: number };

const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] as Toast[], queue: null as QueueNotice | null, update: null as UpdateNotice | null },
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items = [...state.items.slice(-3), action.payload];
      },
      prepare(message: string, kind: ToastKind = "info") {
        return { payload: { id: nanoid(), kind, message, at: Date.now() } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    queueNotice(state, action: PayloadAction<{ key: string; dup: boolean }>) {
      const { key, dup } = action.payload;
      const keys = (state.queue?.keys ?? []).filter((k) => k !== key);
      state.queue = { keys: [...keys, key].slice(-20), dup, stamp: Date.now() };
    },
    dismissQueueNotice(state) {
      state.queue = null;
    },
    // Update app desktop lebih penting dari deploy web (restart app juga memuat web terbaru) → tidak ditimpa "web"
    setUpdateNotice(state, action: PayloadAction<UpdateNotice>) {
      if (action.payload.kind === "web" && state.update?.kind === "desktop") return;
      // Progres unduhan tidak mengubah urutan kartu di deck
      const at = state.update && state.update.kind === action.payload.kind ? state.update.at : action.payload.at;
      state.update = { ...action.payload, at };
    },
    dismissUpdateNotice(state) {
      state.update = null;
    },
    dismissDesktopDownload(state) {
      if (state.update?.kind === "desktop" && state.update.phase === "downloading") state.update = null;
    },
  },
});

export const { pushToast, dismissToast, queueNotice, dismissQueueNotice, setUpdateNotice, dismissUpdateNotice, dismissDesktopDownload } =
  toastSlice.actions;
export default toastSlice.reducer;

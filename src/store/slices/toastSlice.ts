import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastKind = "info" | "ok" | "err";
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
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

const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] as Toast[], queue: null as QueueNotice | null },
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items = [...state.items.slice(-3), action.payload];
      },
      prepare(message: string, kind: ToastKind = "info") {
        return { payload: { id: nanoid(), kind, message } };
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
  },
});

export const { pushToast, dismissToast, queueNotice, dismissQueueNotice } = toastSlice.actions;
export default toastSlice.reducer;

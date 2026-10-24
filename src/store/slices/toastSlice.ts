import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastKind = "info" | "ok" | "err";
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const toastSlice = createSlice({
  name: "toast",
  initialState: { items: [] as Toast[] },
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
  },
});

export const { pushToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;

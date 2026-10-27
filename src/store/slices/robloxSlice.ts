import type { CoverStyle } from "@/lib/trackMeta";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PermissionMode } from "@/type/history";

export interface KeyCheck {
  ok: boolean;
  name: string | null;
  ownerId: string | null;
  enabled: boolean | null;
  expired: boolean | null;
  scopes: string[];
  missing: string[];
  missingOptional: string[];
}

export interface RobloxState {
  apiKey: string;
  remember: boolean;
  creatorType: "user" | "group";
  creatorId: string;
  defaultPermission: PermissionMode;
  placeId: string;
  /** Cover album ikut diupload sebagai Decal saat audio diupload */
  uploadCover: boolean;
  /** auto = cover otomatis yang aman dari moderasi (bawaan); original = cover album asli apa adanya */
  coverStyle: CoverStyle;
  keyCheck: KeyCheck | null;
}

const initialState: RobloxState = {
  apiKey: "",
  remember: true,
  creatorType: "user",
  creatorId: "",
  defaultPermission: "none",
  placeId: "",
  uploadCover: true,
  coverStyle: "safe",
  keyCheck: null,
};

const robloxSlice = createSlice({
  name: "roblox",
  initialState,
  reducers: {
    updateRoblox(state, action: PayloadAction<Partial<RobloxState>>) {
      // Key berubah → hasil cek lama tidak berlaku lagi
      if (action.payload.apiKey !== undefined && action.payload.apiKey !== state.apiKey) state.keyCheck = null;
      Object.assign(state, action.payload);
    },
    setKeyCheck(state, action: PayloadAction<KeyCheck | null>) {
      state.keyCheck = action.payload;
    },
  },
});

export const { updateRoblox, setKeyCheck } = robloxSlice.actions;
export default robloxSlice.reducer;

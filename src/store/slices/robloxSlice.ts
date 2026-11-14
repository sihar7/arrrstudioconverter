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

/** Field yang melekat ke satu akun Roblox (ikut berganti saat ganti akun) */
type AccountField = "apiKey" | "creatorType" | "creatorId" | "placeId" | "defaultPermission" | "keyCheck";

export interface RobloxAccount extends Pick<RobloxState, AccountField> {
  id: string;
  /** Nama tampilan Roblox (diisi otomatis dari profil) — label di pemilih akun */
  name: string;
  avatarUrl: string | null;
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
  /** Akun tersimpan. Field di atas = salinan kerja akun aktif (dipakai semua halaman) */
  accounts: RobloxAccount[];
  activeAccountId: string;
}

export const MAX_ACCOUNTS = 10;

const blank = (): Pick<RobloxState, AccountField> => ({
  apiKey: "",
  creatorType: "user",
  creatorId: "",
  placeId: "",
  defaultPermission: "none",
  keyCheck: null,
});

const newId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const initialState: RobloxState = {
  ...blank(),
  remember: true,
  uploadCover: true,
  coverStyle: "safe",
  accounts: [],
  activeAccountId: "",
};

function pickAccount(s: Pick<RobloxState, AccountField>): Pick<RobloxState, AccountField> {
  return { apiKey: s.apiKey, creatorType: s.creatorType, creatorId: s.creatorId, placeId: s.placeId, defaultPermission: s.defaultPermission, keyCheck: s.keyCheck };
}

/** Salin field kerja ke entri akun aktif (buat entri bila belum ada) */
function syncActive(state: RobloxState) {
  let acc = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!acc) {
    acc = { id: state.activeAccountId || newId(), name: "", avatarUrl: null, ...blank() };
    state.activeAccountId = acc.id;
    state.accounts.push(acc);
  }
  Object.assign(acc, pickAccount(state));
}

function load(state: RobloxState, acc: RobloxAccount) {
  state.activeAccountId = acc.id;
  Object.assign(state, pickAccount(acc));
}

const robloxSlice = createSlice({
  name: "roblox",
  initialState,
  reducers: {
    updateRoblox(state, action: PayloadAction<Partial<Omit<RobloxState, "accounts" | "activeAccountId">>>) {
      // Key berubah → hasil cek lama tidak berlaku lagi
      if (action.payload.apiKey !== undefined && action.payload.apiKey !== state.apiKey) state.keyCheck = null;
      Object.assign(state, action.payload);
      syncActive(state);
    },
    setKeyCheck(state, action: PayloadAction<KeyCheck | null>) {
      state.keyCheck = action.payload;
      syncActive(state);
    },
    /** Pulihkan dari localStorage; data lama (tanpa daftar akun) → dimigrasi jadi akun pertama */
    hydrateRoblox(state, action: PayloadAction<Partial<RobloxState>>) {
      const { accounts, activeAccountId, ...rest } = action.payload;
      Object.assign(state, rest);
      const list = Array.isArray(accounts)
        ? accounts
            .filter((a) => a && typeof a.id === "string" && a.id)
            .map((a): RobloxAccount => ({
              ...blank(),
              ...a,
              name: typeof a.name === "string" ? a.name : "",
              avatarUrl: typeof a.avatarUrl === "string" ? a.avatarUrl : null,
              keyCheck: null,
            }))
        : [];
      state.accounts = list.slice(0, MAX_ACCOUNTS);
      const active = state.accounts.find((a) => a.id === activeAccountId) ?? state.accounts[0];
      if (active) load(state, active);
      else {
        state.activeAccountId = "";
        syncActive(state);
      }
    },
    switchAccount(state, action: PayloadAction<string>) {
      const acc = state.accounts.find((a) => a.id === action.payload);
      if (!acc || acc.id === state.activeAccountId) return;
      syncActive(state);
      load(state, acc);
    },
    /** Akun baru kosong lalu langsung aktif (isi API key-nya di Pengaturan) */
    addAccount(state) {
      if (state.accounts.length >= MAX_ACCOUNTS) return;
      syncActive(state);
      const acc: RobloxAccount = { id: newId(), name: "", avatarUrl: null, ...blank() };
      state.accounts.push(acc);
      load(state, acc);
    },
    removeAccount(state, action: PayloadAction<string>) {
      const i = state.accounts.findIndex((a) => a.id === action.payload);
      if (i < 0) return;
      state.accounts.splice(i, 1);
      if (action.payload !== state.activeAccountId) return;
      const next = state.accounts[Math.max(0, i - 1)];
      if (next) load(state, next);
      else {
        Object.assign(state, blank());
        state.activeAccountId = "";
        syncActive(state);
      }
    },
    /** Label akun dari profil Roblox (dipanggil kartu profil saat data masuk) */
    setAccountMeta(state, action: PayloadAction<{ name: string; avatarUrl: string | null }>) {
      const acc = state.accounts.find((a) => a.id === state.activeAccountId);
      if (!acc || (acc.name === action.payload.name && acc.avatarUrl === action.payload.avatarUrl)) return;
      acc.name = action.payload.name.slice(0, 60);
      acc.avatarUrl = action.payload.avatarUrl;
    },
  },
});

export const { updateRoblox, setKeyCheck, hydrateRoblox, switchAccount, addAccount, removeAccount, setAccountMeta } = robloxSlice.actions;
export default robloxSlice.reducer;

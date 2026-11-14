import type { RootState } from "./store";
import { ytLibrary } from "@/lib/ytLibrary";

// Simpan preferensi ke localStorage (per perangkat). API key hanya disimpan kalau "Ingat" aktif.

const KEY = "arrc_state_v1";

export interface PersistedState {
  preferences?: Partial<RootState["preferences"]>;
  converter?: Partial<Pick<RootState["converter"], "options" | "preset" | "autoUpload" | "autoPermission" | "autoConvert" | "customPresets" | "robloxMode" | "trimAsk">>;
  roblox?: Partial<RootState["roblox"]>;
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : {};
  } catch {
    return {};
  }
}

export function saveState(s: RootState) {
  const { apiKey, remember, keyCheck: _keyCheck, accounts, ...robloxRest } = s.roblox;
  // Key tiap akun ikut aturan "Ingat"; hasil cek key tidak disimpan (dicek ulang)
  const savedAccounts = accounts.map((a) => ({ ...a, apiKey: remember ? a.apiKey : "", keyCheck: null }));
  const data: PersistedState = {
    preferences: { lang: s.preferences.lang, theme: s.preferences.theme },
    converter: {
      options: s.converter.options,
      preset: s.converter.preset,
      autoUpload: s.converter.autoUpload,
      autoPermission: s.converter.autoPermission,
      autoConvert: s.converter.autoConvert,
      customPresets: s.converter.customPresets,
      robloxMode: s.converter.robloxMode,
      trimAsk: s.converter.trimAsk,
    },
    roblox: { ...robloxRest, remember, apiKey: remember ? apiKey : "", accounts: savedAccounts },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    // Dibaca skrip anti-flash di <head>
    localStorage.setItem("arrc_theme", s.preferences.theme);
    // Lagu di antrean = bahan rekomendasi "Untukmu" di halaman YouTube (tanpa perubahan bila sama)
    ytLibrary.addSeeds(s.converter.items.map((i) => i.videoId));
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

// ---------- Antrean converter (terpisah: bisa ratusan lagu dari impor file) ----------

const QUEUE_KEY = "arrc_queue_v1";

type QueueSnapshot = Pick<RootState["converter"], "items" | "batches">;

export function loadQueue(): QueueSnapshot | null {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<QueueSnapshot>;
    return Array.isArray(data.items) ? { items: data.items, batches: Array.isArray(data.batches) ? data.batches : [] } : null;
  } catch {
    return null;
  }
}

/** Disimpan supaya antrean tetap ada setelah refresh / update aplikasi — job server dilanjutkan polling-nya */
export function saveQueue(s: QueueSnapshot) {
  try {
    if (!s.items.length && !s.batches.length) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify({ items: s.items, batches: s.batches }));
  } catch {
    /* storage penuh / diblokir — antrean tetap jalan, hanya tidak bertahan saat refresh */
  }
}

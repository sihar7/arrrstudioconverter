import type { RootState } from "./store";

// Simpan preferensi ke localStorage (per perangkat). API key hanya disimpan kalau "Ingat" aktif.

const KEY = "arrc_state_v1";

export interface PersistedState {
  preferences?: Partial<RootState["preferences"]>;
  converter?: Partial<Pick<RootState["converter"], "options" | "preset" | "autoUpload" | "autoPermission" | "autoConvert" | "customPresets">>;
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
  const { apiKey, remember, keyCheck: _keyCheck, ...robloxRest } = s.roblox;
  const data: PersistedState = {
    preferences: { lang: s.preferences.lang, theme: s.preferences.theme },
    converter: {
      options: s.converter.options,
      preset: s.converter.preset,
      autoUpload: s.converter.autoUpload,
      autoPermission: s.converter.autoPermission,
      autoConvert: s.converter.autoConvert,
      customPresets: s.converter.customPresets,
    },
    roblox: { ...robloxRest, remember, apiKey: remember ? apiKey : "" },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    // Dibaca skrip anti-flash di <head>
    localStorage.setItem("arrc_theme", s.preferences.theme);
  } catch {
    /* storage penuh / diblokir — abaikan */
  }
}

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Lang } from "@/utils/i18n";

export type Theme = "dark" | "light";

interface PreferencesState {
  lang: Lang;
  theme: Theme;
  hydrated: boolean;
}

const initialState: PreferencesState = { lang: "id", theme: "dark", hydrated: false };

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setLang(state, action: PayloadAction<Lang>) {
      state.lang = action.payload;
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    hydratePreferences(state, action: PayloadAction<Partial<Omit<PreferencesState, "hydrated">>>) {
      Object.assign(state, action.payload, { hydrated: true });
    },
  },
});

export const { setLang, setTheme, hydratePreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;

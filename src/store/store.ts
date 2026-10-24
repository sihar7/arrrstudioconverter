import { configureStore } from "@reduxjs/toolkit";
import preferences from "./slices/preferencesSlice";
import converter from "./slices/converterSlice";
import roblox from "./slices/robloxSlice";
import toast from "./slices/toastSlice";
import { baseApi } from "./api/baseApi";

export function makeStore() {
  return configureStore({
    reducer: {
      preferences,
      converter,
      roblox,
      toast,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gdm) => gdm().concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

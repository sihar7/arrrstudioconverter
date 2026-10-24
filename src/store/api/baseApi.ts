import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { MeResponse } from "@/type/auth";
import type { HistoryItem } from "@/type/history";
import type { RobloxProfile } from "@/type/roblox";

// RTK Query untuk data yang di-cache & di-invalidate (sesi/kuota, riwayat)
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api", credentials: "same-origin" }),
  tagTypes: ["Me", "History"],
  endpoints: (b) => ({
    me: b.query<MeResponse, void>({ query: () => "auth/me", providesTags: ["Me"] }),
    logout: b.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "auth/logout", method: "POST" }),
      invalidatesTags: ["Me", "History"],
    }),
    devLogin: b.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "auth/dev", method: "POST" }),
      invalidatesTags: ["Me", "History"],
    }),
    robloxProfile: b.query<{ profile: RobloxProfile }, { type: "user" | "group"; id: string }>({
      query: ({ type, id }) => `roblox/profile?type=${type}&id=${id}`,
      keepUnusedDataFor: 600,
    }),
    history: b.query<{ items: HistoryItem[] }, void>({ query: () => "history", providesTags: ["History"] }),
    deleteHistory: b.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `history/${id}`, method: "DELETE" }),
      invalidatesTags: ["History"],
    }),
    clearHistory: b.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "history", method: "DELETE" }),
      invalidatesTags: ["History"],
    }),
  }),
});

export const {
  useMeQuery,
  useLogoutMutation,
  useDevLoginMutation,
  useHistoryQuery,
  useRobloxProfileQuery,
  useDeleteHistoryMutation,
  useClearHistoryMutation,
} = baseApi;

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { useHydrated } from "@/hooks/useHydrated";
import { withBase } from "@/Url/Url";
import type { MeResponse } from "@/type/auth";
import type { HistoryItem } from "@/type/history";
import type { RobloxProfile } from "@/type/roblox";

// RTK Query untuk data yang di-cache & di-invalidate (sesi/kuota, riwayat)
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: withBase("/api"), credentials: "same-origin" }),
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
  useLogoutMutation,
  useDevLoginMutation,
  useHistoryQuery,
  useRobloxProfileQuery,
  useDeleteHistoryMutation,
  useClearHistoryMutation,
} = baseApi;

/**
 * Sesi/kuota yang aman untuk hydration: selama komponen ini masih di-hydrate, hasilnya selalu "memuat"
 * (sama dengan HTML server). Tanpa ini, boundary yang hydrate belakangan bisa mendapati sesi sudah terjawab
 * (mis. app desktop yang langsung memeriksa sesi) → hydration mismatch.
 */
export function useMeQuery() {
  const hydrated = useHydrated();
  const result = baseApi.useMeQuery();
  return hydrated ? result : { ...result, data: undefined, currentData: undefined, isLoading: true, isSuccess: false, isError: false };
}

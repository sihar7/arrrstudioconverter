"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { baseApi } from "@/store/api/baseApi";
import { isRunning, itemFailed } from "@/store/slices/converterSlice";
import { cancelJob } from "../_service/converter.service";

/**
 * Batalkan convert: item kembali ke "siap" (bisa di-convert lagi), job di server dihentikan & tokennya dikembalikan.
 * `filter` memilih item mana (mis. satu batch); bawaan = semua yang sedang berjalan / menunggu.
 * Runner otomatis menghentikan polling item yang tidak lagi berjalan.
 */
export function useCancel() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  return useCallback(
    (filter: (i: { key: string; batch: string | null }) => boolean = () => true) => {
      const targets = store.getState().converter.items.filter((i) => isRunning(i.status) && filter(i));
      for (const i of targets) {
        if (i.jobId) void cancelJob(i.jobId).catch(() => {});
        dispatch(itemFailed({ key: i.key, error: "", reset: true }));
      }
      if (targets.some((i) => i.jobId)) dispatch(baseApi.util.invalidateTags(["Me"]));
      return targets.length;
    },
    [dispatch, store],
  );
}

"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { addItems } from "@/store/slices/converterSlice";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { fetchInfo } from "../../converter/_service/converter.service";

/** Satu link video → info → antrean Converter (duplikat yang belum selesai dilewati) */
export function useQuickAdd() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const toast = useToast();
  const { t, f } = useT();
  const [busy, setBusy] = useState(false);

  const add = useCallback(
    async (url: string) => {
      setBusy(true);
      try {
        const res = await fetchInfo(url);
        if (res.type !== "video") return;
        const v = res.video;
        const queued = store.getState().converter.items.some((i) => i.videoId === v.videoId && i.status !== "done" && i.status !== "error");
        if (queued) {
          toast(t.desktop.ytAlready, "info");
          return;
        }
        dispatch(addItems([v]));
        toast(f(t.desktop.ytAdded, { title: v.title }), "ok");
      } catch (e) {
        toast(e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e), "err");
      } finally {
        setBusy(false);
      }
    },
    [dispatch, store, toast, t, f],
  );

  return { add, busy };
}

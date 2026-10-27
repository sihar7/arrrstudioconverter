"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { addItems } from "@/store/slices/converterSlice";
import { queueNotice } from "@/store/slices/toastSlice";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { fetchInfo } from "../../converter/_service/converter.service";
import type { VideoInfo } from "@/type/converter";

/**
 * Kirim video ke antrean Converter (duplikat yang belum selesai dilewati) + popup kanan bawah yang membuka antrean.
 * `add(url)` mengambil info dulu (link dari YouTube di app); `addVideo(info)` untuk hasil pencarian yang sudah lengkap.
 */
export function useQuickAdd() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const toast = useToast();
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  const addVideo = useCallback(
    (v: VideoInfo) => {
      const open = (s: ReturnType<typeof store.getState>) =>
        s.converter.items.findLast((i) => i.videoId === v.videoId && i.status !== "done" && i.status !== "error");
      const queued = open(store.getState());
      if (!queued) dispatch(addItems([{ videoId: v.videoId, title: v.title, author: v.author, thumbnail: v.thumbnail, duration: v.duration }]));
      const item = queued ?? open(store.getState());
      if (item) dispatch(queueNotice({ key: item.key, dup: Boolean(queued) }));
    },
    [dispatch, store],
  );

  const add = useCallback(
    async (url: string) => {
      setBusy(true);
      try {
        const res = await fetchInfo(url);
        if (res.type === "video") addVideo(res.video);
      } catch (e) {
        toast(e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e), "err");
      } finally {
        setBusy(false);
      }
    },
    [addVideo, toast, t],
  );

  return { add, addVideo, busy };
}

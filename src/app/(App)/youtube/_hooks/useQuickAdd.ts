"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { addItems } from "@/store/slices/converterSlice";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { fetchInfo } from "../../converter/_service/converter.service";
import type { VideoInfo } from "@/type/converter";

/**
 * Kirim video ke antrean Converter (duplikat yang belum selesai dilewati).
 * `add(url)` mengambil info dulu (link dari YouTube di app); `addVideo(info)` untuk hasil pencarian yang sudah lengkap.
 */
export function useQuickAdd() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const toast = useToast();
  const { t, f } = useT();
  const [busy, setBusy] = useState(false);

  const addVideo = useCallback(
    (v: VideoInfo) => {
      const queued = store.getState().converter.items.some((i) => i.videoId === v.videoId && i.status !== "done" && i.status !== "error");
      if (queued) {
        toast(t.desktop.ytAlready, "info");
        return;
      }
      dispatch(addItems([{ videoId: v.videoId, title: v.title, author: v.author, thumbnail: v.thumbnail, duration: v.duration }]));
      toast(f(t.desktop.ytAdded, { title: v.title }), "ok");
    },
    [dispatch, store, toast, t, f],
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

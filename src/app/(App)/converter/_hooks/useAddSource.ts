"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { addItems, type QueueInput } from "@/store/slices/converterSlice";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { fetchInfo } from "../_service/converter.service";
import { extractLinks } from "../_utils/helpers";
import type { PlaylistSuggestion } from "../_types/converter.type";
import type { PlaylistItem, VideoInfo } from "@/type/converter";

const fromPlaylist = (items: PlaylistItem[]): VideoInfo[] =>
  items.map((i) => ({
    videoId: i.videoId,
    title: i.title,
    author: "",
    thumbnail: `https://i.ytimg.com/vi/${i.videoId}/hqdefault.jpg`,
    duration: i.duration,
  }));

/** Video album (server mengirim `tracks` hanya untuk admin) → satu item antrean per lagu, dipotong saat convert */
const fromAlbum = (v: VideoInfo): QueueInput[] =>
  (v.tracks ?? []).map((tr, i, all) => ({
    videoId: v.videoId,
    title: tr.title,
    author: v.author,
    thumbnail: v.thumbnail,
    duration: (tr.end ?? v.duration ?? tr.start) - tr.start || null,
    clip: { start: tr.start, end: tr.end, index: i + 1, total: all.length },
  }));

const itemKey = (v: QueueInput) => `${v.videoId}@${v.clip?.start ?? ""}`;

/** Input link → info video / playlist → masuk antrean */
export function useAddSource() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const toast = useToast();
  const { t, f } = useT();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<PlaylistSuggestion | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  /** text = sumber lain (mis. Ctrl+V global); default isi kolom input */
  const submit = useCallback(async (text?: string) => {
    const links = extractLinks(text ?? value);
    if (!links.length) {
      setError(t.converter.sourceHelp);
      return;
    }
    setBusy(true);
    setError(null);
    setSuggestion(null);

    // Hasil disimpan per indeks link → urutan antrean sama dengan urutan input
    const results: QueueInput[][] = links.map(() => []);
    let invalid = 0;
    let lastError = "";
    let next = 0;
    // Paralel kecil (3) supaya cepat tapi tidak membanjiri server
    const worker = async () => {
      while (next < links.length) {
        const idx = next++;
        const link = links[idx];
        try {
          const res = await fetchInfo(link);
          if (res.type === "video" && res.video.tracks?.length) {
            results[idx] = fromAlbum(res.video);
            toast(f(t.converter.albumSplit, { n: res.video.tracks.length, title: res.video.title }), "ok");
          } else if (res.type === "video") {
            results[idx] = [res.video];
            if (res.playlistId && links.length === 1) setSuggestion({ url: link, playlistId: res.playlistId });
          } else {
            results[idx] = fromPlaylist(res.items);
            toast(f(t.converter.addedPlaylist, { n: res.items.length, title: res.title }), "ok");
        if (res.truncated) toast(f(t.plan.playlistTruncated, { n: res.truncated }), "info");
          }
        } catch (e) {
          invalid++;
          lastError = e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    // Duplikat (sudah di antrean & belum selesai) dilewati slice — beri tahu jumlahnya
    const queued = new Set(
      store
        .getState()
        .converter.items.filter((i) => i.status !== "done" && i.status !== "error")
        .map((i) => itemKey({ ...i, clip: i.clip ?? undefined })),
    );
    const seen = new Set<string>();
    const videos = results.flat().filter((v) => !queued.has(itemKey(v)) && !seen.has(itemKey(v)) && seen.add(itemKey(v)));
    const dups = results.flat().length - videos.length;
    if (videos.length) dispatch(addItems(videos));
    if (dups) toast(f(t.converter.dupSkipped, { n: dups }), "info");

    if (invalid && !videos.length && !dups) setError(lastError);
    else if (invalid) toast(f(t.converter.invalidLinks, { n: invalid }), "err");
    if ((videos.length || dups) && text === undefined) setValue("");
    setBusy(false);
  }, [value, dispatch, store, toast, t, f]);

  const addPlaylist = useCallback(async () => {
    if (!suggestion) return;
    setLoadingPlaylist(true);
    try {
      const res = await fetchInfo(suggestion.url, true);
      if (res.type === "playlist") {
        dispatch(addItems(fromPlaylist(res.items)));
        toast(f(t.converter.addedPlaylist, { n: res.items.length, title: res.title }), "ok");
        if (res.truncated) toast(f(t.plan.playlistTruncated, { n: res.truncated }), "info");
      }
      setSuggestion(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : String(e), "err");
    } finally {
      setLoadingPlaylist(false);
    }
  }, [suggestion, dispatch, toast, t, f]);

  return { value, setValue, busy, error, setError, submit, suggestion, dismissSuggestion: () => setSuggestion(null), addPlaylist, loadingPlaylist };
}

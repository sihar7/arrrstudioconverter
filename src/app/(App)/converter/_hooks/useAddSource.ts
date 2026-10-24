"use client";

import { useCallback, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { addItems } from "@/store/slices/converterSlice";
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

/** Input link → info video / playlist → masuk antrean */
export function useAddSource() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { t, f } = useT();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<PlaylistSuggestion | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const submit = useCallback(async () => {
    const links = extractLinks(value);
    if (!links.length) {
      setError(t.converter.sourceHelp);
      return;
    }
    setBusy(true);
    setError(null);
    setSuggestion(null);

    // Hasil disimpan per indeks link → urutan antrean sama dengan urutan input
    const results: VideoInfo[][] = links.map(() => []);
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
          if (res.type === "video") {
            results[idx] = [res.video];
            if (res.playlistId && links.length === 1) setSuggestion({ url: link, playlistId: res.playlistId });
          } else {
            results[idx] = fromPlaylist(res.items);
            toast(f(t.converter.addedPlaylist, { n: res.items.length, title: res.title }), "ok");
          }
        } catch (e) {
          invalid++;
          lastError = e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    const videos = results.flat();
    if (videos.length) dispatch(addItems(videos));

    if (invalid && !videos.length) setError(lastError);
    else if (invalid) toast(f(t.converter.invalidLinks, { n: invalid }), "err");
    if (videos.length) setValue("");
    setBusy(false);
  }, [value, dispatch, toast, t, f]);

  const addPlaylist = useCallback(async () => {
    if (!suggestion) return;
    setLoadingPlaylist(true);
    try {
      const res = await fetchInfo(suggestion.url, true);
      if (res.type === "playlist") {
        dispatch(addItems(fromPlaylist(res.items)));
        toast(f(t.converter.addedPlaylist, { n: res.items.length, title: res.title }), "ok");
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

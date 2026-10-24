"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileUrl } from "../_service/converter.service";

/** Satu elemen audio bersama untuk preview hasil (hanya satu yang diputar) */
export function useAudioPreview() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audio.current?.pause();
      if (audio.current) audio.current.src = "";
      audio.current = null;
    };
  }, []);

  const toggle = useCallback(
    (fileId: string) => {
      if (!audio.current) {
        audio.current = new Audio();
        audio.current.preload = "none";
        audio.current.addEventListener("ended", () => setPlaying(null));
        audio.current.addEventListener("error", () => setPlaying(null));
      }
      const a = audio.current;
      if (playing === fileId) {
        a.pause();
        setPlaying(null);
        return;
      }
      a.src = fileUrl(fileId);
      void a.play().catch(() => setPlaying(null));
      setPlaying(fileId);
    },
    [playing],
  );

  return { playing, toggle };
}

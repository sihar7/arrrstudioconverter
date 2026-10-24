"use client";

import { useEffect, useState } from "react";

/**
 * true setelah halaman discroll lewat `threshold` px.
 * Satu listener pasif + rAF; React melewati render kalau boolean-nya tidak berubah,
 * jadi komponen pemakai TIDAK ikut render ulang tiap frame scroll.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}

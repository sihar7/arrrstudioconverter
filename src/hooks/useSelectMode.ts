"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type PickState = [Set<string>, Dispatch<SetStateAction<Set<string>>>];

/**
 * Mode pilih TANPA checkbox (Riwayat, Audio saya): klik item = pilih, Shift+klik = rentang,
 * Ctrl/Cmd+A = semua yang tampil, Esc = keluar. State pilihan boleh milik pemanggil (mis. useLibrary).
 * `ids` = urutan item yang sedang tampil (untuk rentang & pilih semua); `paused` = abaikan keyboard (dialog terbuka).
 */
export function useSelectMode(ids: readonly string[], external?: PickState, paused = false) {
  const own = useState<Set<string>>(() => new Set());
  const [picked, setPicked] = external ?? own;
  const [selecting, setSelecting] = useState(false);
  const anchor = useRef<string | null>(null);

  const exit = useCallback(() => {
    setSelecting(false);
    setPicked(new Set());
    anchor.current = null;
  }, [setPicked]);

  /** Masuk mode pilih; dengan id → langsung memilih item itu (tekan lama / klik pertama) */
  const start = useCallback(
    (id?: string) => {
      setSelecting(true);
      if (id) {
        setPicked(new Set([id]));
        anchor.current = id;
      }
    },
    [setPicked],
  );

  const toggle = useCallback(
    (id: string, shift = false) => {
      // Ambil jangkar SEBELUM setState — updater bisa dijalankan belakangan saat render
      const from = anchor.current;
      anchor.current = id;
      setPicked((prev) => {
        const next = new Set(prev);
        if (shift && from) {
          const a = ids.indexOf(from);
          const b = ids.indexOf(id);
          if (a !== -1 && b !== -1) {
            for (const x of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(x);
            return next;
          }
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [ids, setPicked],
  );

  const pick = useCallback((list: readonly string[]) => setPicked(new Set(list)), [setPicked]);

  useEffect(() => {
    if (!selecting || paused) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select");
      if (e.key === "Escape") exit();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        setPicked(new Set(ids));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, paused, ids, exit, setPicked]);

  return { selecting, picked, start, exit, toggle, pick };
}

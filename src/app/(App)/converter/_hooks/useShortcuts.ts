"use client";

import { useEffect, useRef } from "react";

interface Handlers {
  /** "/" — fokus ke kolom link */
  onFocusInput: () => void;
  /** Ctrl/⌘+V di luar kolom input — teks clipboard berisi link */
  onPasteLinks: (text: string) => void;
  /** Ctrl/⌘+Enter — convert semua yang siap */
  onConvertAll: () => void;
  /** Esc — batalkan pilihan */
  onEscape: () => void;
  /** "?" — buka daftar pintasan */
  onHelp: () => void;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Pintasan keyboard halaman converter; satu listener, handler terbaru dibaca lewat ref */
export function useShortcuts(handlers: Handlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = ref.current;
      // Dialog terbuka → biarkan dialog yang menangani
      if (document.querySelector("dialog[open]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        h.onConvertAll();
        return;
      }
      if (e.key === "Escape") return h.onEscape();
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        h.onFocusInput();
      } else if (e.key === "?") {
        e.preventDefault();
        h.onHelp();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!/youtu\.?be|^[A-Za-z0-9_-]{11}$/m.test(text)) return;
      e.preventDefault();
      ref.current.onPasteLinks(text);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);
}

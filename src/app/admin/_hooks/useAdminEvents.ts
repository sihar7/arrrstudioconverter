"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminEvent } from "@/type/billing";

/** Nama CustomEvent di window — tab lain (mis. Order) cukup mendengarkan ini untuk memuat ulang */
export const ADMIN_EVENT = "arr:admin-event";

export type LinkState = "connecting" | "live" | "offline";

const SOUND_KEY = "arr-admin-sound";
const eventKey = (e: AdminEvent) => `${e.type}:${e.orderId}:${e.at}`;
const RETRY_MS = 15_000;

const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
};

/** Bunyi notifikasi singkat dua nada (WebAudio, tanpa file) */
function chime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [880, 1320].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = hz;
      const t0 = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // browser memblokir audio sebelum ada interaksi — abaikan
  }
}

/**
 * Notifikasi realtime panel admin lewat SSE (/api/admin/events).
 * EventSource menyambung ulang sendiri; bila ditutup permanen (mis. sesi habis / proxy memutus) dicoba lagi tiap 15 dtk.
 * Event diteruskan ke window (ADMIN_EVENT) + bunyi + notifikasi desktop (bila diizinkan & tab tidak sedang dilihat).
 */
export function useAdminEvents(onEvent: (e: AdminEvent) => void, enabled: boolean) {
  const [state, setState] = useState<LinkState>("connecting");
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const clearedAt = useRef(0);
  // Lazy init aman: panel admin (lonceng) baru dirender di klien setelah sesi termuat, jadi tidak ada beda SSR
  const [sound, setSoundState] = useState(() => (typeof window === "undefined" ? true : readSound()));
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const cb = useRef(onEvent);
  const soundRef = useRef(sound);
  useEffect(() => {
    cb.current = onEvent;
  });

  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const connect = () => {
      if (!alive) return;
      setState("connecting");
      es = new EventSource("/api/admin/events");
      es.onopen = () => setState("live");
      es.onerror = () => {
        if (!es) return;
        if (es.readyState === EventSource.CLOSED) {
          es = null;
          setState("offline");
          retry = setTimeout(connect, RETRY_MS);
        } else setState("connecting");
      };
      es.addEventListener("admin", (msg) => {
        let e: AdminEvent;
        try {
          e = JSON.parse((msg as MessageEvent<string>).data) as AdminEvent;
        } catch {
          return;
        }
        // Event yang sudah dibersihkan / terkirim dobel (sambung ulang, dua koneksi sesaat) tidak ditampilkan lagi
        if (e.at <= clearedAt.current) return;
        setEvents((list) => (list.some((x) => eventKey(x) === eventKey(e)) ? list : [e, ...list].slice(0, 20)));
        window.dispatchEvent(new CustomEvent(ADMIN_EVENT, { detail: e }));
        cb.current(e);
        // Hanya event yang butuh perhatian admin yang berbunyi / muncul di desktop
        const loud = e.type === "order.confirming" || e.type === "order.proof" || e.type === "order.created";
        if (!loud) return;
        if (soundRef.current) chime();
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          new Notification(e.title, { body: e.body, tag: `order-${e.orderId}` });
        }
      });
    };
    connect();

    return () => {
      alive = false;
      es?.close();
      if (retry) clearTimeout(retry);
    };
  }, [enabled]);

  const setSound = useCallback((v: boolean) => {
    soundRef.current = v;
    setSoundState(v);
    try {
      localStorage.setItem(SOUND_KEY, v ? "1" : "0");
    } catch {
      // mode privat — preferensi tidak tersimpan
    }
    if (v) chime();
  }, []);

  const requestDesktop = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    setPermission(await Notification.requestPermission());
  }, []);

  /** Bersihkan daftar: semua event sampai detik ini disembunyikan permanen (sampai panel dimuat ulang) */
  const clear = useCallback(() => {
    clearedAt.current = Date.now();
    setEvents([]);
  }, []);

  return { state, events, sound, setSound, permission, requestDesktop, clear };
}

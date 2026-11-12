"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { itemFailed, jobUpdated, requeue, type QueueItem } from "@/store/slices/converterSlice";
import { baseApi } from "@/store/api/baseApi";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { cancelJob, createJob, getJob } from "../_service/converter.service";
import { MAX_PARALLEL, POLL_MS } from "../_constants/converter.constants";

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

/**
 * Menjalankan antrean: kirim item "pending" ke server (maks `parallel` = batas plan, bawaan MAX_PARALLEL) lalu polling statusnya.
 * Job tetap jalan di server walau user pindah halaman — polling dilanjutkan saat kembali.
 */
// Job yang sudah pernah dikirim ulang karena hilang di server (per tab) → kedua kalinya baru dianggap gagal
const requeued = new Set<string>();

export function useQueueRunner(opts: { onGuestLimit: () => void; onDone: (key: string) => void; parallel?: number }) {
  const parallel = Math.max(1, opts.parallel ?? MAX_PARALLEL);
  const items = useAppSelector((s) => s.converter.items);
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const toast = useToast();
  const { t, f } = useT();
  const active = useRef(new Map<string, AbortController>());
  const [tick, setTick] = useState(0);
  // Kena rem server (429 RATE_LIMIT / BUSY) → JANGAN gagalkan lagu: tetap "menunggu", antrean jeda sampai waktu ini.
  // Dulu tiap 429 menandai lagu gagal lalu langsung mencoba lagu berikutnya → ratusan lagu impor gagal beruntun.
  const cooldownUntil = useRef(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  const textRef = useRef({ t, f });

  useEffect(() => {
    optsRef.current = opts;
    textRef.current = { t, f };
  });

  // Hentikan semua polling saat komponen dilepas (job server tetap jalan)
  useEffect(() => {
    const map = active.current;
    return () => {
      map.forEach((c) => c.abort());
      map.clear();
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  useEffect(() => {
    const finish = (key: string) => {
      active.current.delete(key);
      setTick((n) => n + 1);
    };

    const poll = async (key: string, jobId: string, ctrl: AbortController) => {
      let misses = 0;
      while (!ctrl.signal.aborted) {
        await sleep(POLL_MS, ctrl.signal);
        if (ctrl.signal.aborted) return;
        try {
          const { job } = await getJob(jobId, ctrl.signal);
          misses = 0;
          dispatch(jobUpdated({ key, job }));
          if (job.status === "done") {
            const { t, f } = textRef.current;
            toast(f(t.toast.converted, { title: job.title }), "ok");
            finish(key);
            optsRef.current.onDone(key);
            return;
          }
          if (job.status === "error") {
            const { t, f } = textRef.current;
            toast(f(t.toast.failed, { title: job.title, error: job.error ?? "" }), "err");
            finish(key);
            return;
          }
        } catch (e) {
          if (ctrl.signal.aborted) return;
          if (e instanceof ApiError && e.status === 404) {
            // Job hilang (server di-update / restart di tengah convert) → kirim ulang sekali, tidak langsung gagal
            if (!requeued.has(key)) {
              requeued.add(key);
              dispatch(requeue(key));
              finish(key);
              return;
            }
            dispatch(itemFailed({ key, error: e.message }));
            finish(key);
            return;
          }
          // Jaringan putus sesaat → coba lagi, menyerah setelah ±30 dtk
          if (++misses > 30) {
            dispatch(itemFailed({ key, error: textRef.current.t.toast.network }));
            finish(key);
            return;
          }
        }
      }
    };

    const start = async (item: QueueItem, ctrl: AbortController) => {
      try {
        // Lagu dari video album: potong ke rentang lagunya + judul tetap
        // Impor file: pangkas sedikit di awal & akhir + fade halus (menggantikan trim manual untuk item ini)
        const { clip, cut } = item;
        const base = item.options!;
        const options = clip
          ? { ...base, trimStart: clip.start || null, trimEnd: clip.end }
          : cut
            ? { ...base, trimStart: cut.start || null, trimEnd: cut.end, fadeIn: Math.max(base.fadeIn, cut.fadeIn), fadeOut: Math.max(base.fadeOut, cut.fadeOut) }
            : base;
        const { job } = await createJob(item.videoId, options, ctrl.signal, clip ? item.title : undefined);
        // Dibatalkan saat request masih di jalan → job terlanjur dibuat di server, hentikan juga
        if (ctrl.signal.aborted) {
          void cancelJob(job.id).catch(() => {});
          return;
        }
        dispatch(jobUpdated({ key: item.key, job }));
        dispatch(baseApi.util.invalidateTags(["Me"]));
        await poll(item.key, job.id, ctrl);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && (e.code === "RATE_LIMIT" || e.code === "BUSY")) {
          // Lagu tetap "pending"; antrean berhenti mengirim sampai rem selesai, lalu lanjut sendiri
          const wait = e.code === "BUSY" ? 4 : Math.min(60, Math.max(2, Number(e.data?.retryAfter) || 10));
          const until = Date.now() + wait * 1000;
          if (until > cooldownUntil.current) {
            cooldownUntil.current = until;
            if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
            cooldownTimer.current = setTimeout(() => setTick((n) => n + 1), wait * 1000 + 50);
          }
          finish(item.key);
          return;
        }
        if (e instanceof ApiError && (e.code === "GUEST_LIMIT" || e.code === "TOKEN_LIMIT")) {
          // Kembalikan semua yang menunggu ke "siap"; guest → gerbang login, user → toast token habis
          for (const i of store.getState().converter.items) {
            if (i.status === "pending") dispatch(itemFailed({ key: i.key, error: "", reset: true }));
          }
          dispatch(itemFailed({ key: item.key, error: "", reset: true }));
          dispatch(baseApi.util.invalidateTags(["Me"]));
          if (e.code === "GUEST_LIMIT") {
            // VPN / proxy → jelaskan alasannya dulu, lalu ajak login
            if (e.data?.reason === "vpn") toast(e.message, "err");
            optsRef.current.onGuestLimit();
          }
          else toast(e.message, "err");
        } else {
          const msg = e instanceof ApiError ? (e.code === "NETWORK" ? textRef.current.t.toast.network : e.message) : String(e);
          dispatch(itemFailed({ key: item.key, error: msg }));
          toast(msg, "err");
        }
        finish(item.key);
      }
    };

    // Item dibatalkan / dihapus → hentikan polling & request yang masih berjalan untuk item itu
    for (const [key, ctrl] of active.current) {
      const it = items.find((i) => i.key === key);
      if (!it || !["pending", "queued", "downloading", "processing"].includes(it.status)) {
        ctrl.abort();
        active.current.delete(key);
      }
    }

    // Lanjutkan polling job yang sudah berjalan (mis. setelah pindah halaman)
    for (const it of items) {
      if (it.jobId && ["queued", "downloading", "processing"].includes(it.status) && !active.current.has(it.key)) {
        const ctrl = new AbortController();
        active.current.set(it.key, ctrl);
        void poll(it.key, it.jobId, ctrl).finally(() => active.current.get(it.key) === ctrl && finish(it.key));
      }
    }

    if (Date.now() < cooldownUntil.current) return;
    const free = parallel - active.current.size;
    if (free <= 0) return;
    const pending = items.filter((i) => i.status === "pending" && !active.current.has(i.key)).slice(0, free);
    for (const it of pending) {
      const ctrl = new AbortController();
      active.current.set(it.key, ctrl);
      void start(it, ctrl);
    }
  }, [items, tick, parallel, dispatch, store, toast]);
}

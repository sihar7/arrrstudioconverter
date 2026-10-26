"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { itemFailed, jobUpdated, type QueueItem } from "@/store/slices/converterSlice";
import { baseApi } from "@/store/api/baseApi";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { createJob, getJob } from "../_service/converter.service";
import { MAX_PARALLEL, POLL_MS } from "../_constants/converter.constants";

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

/**
 * Menjalankan antrean: kirim item "pending" ke server (maks MAX_PARALLEL) lalu polling statusnya.
 * Job tetap jalan di server walau user pindah halaman — polling dilanjutkan saat kembali.
 */
export function useQueueRunner(opts: { onGuestLimit: () => void; onDone: (key: string) => void }) {
  const items = useAppSelector((s) => s.converter.items);
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const toast = useToast();
  const { t, f } = useT();
  const active = useRef(new Map<string, AbortController>());
  const [tick, setTick] = useState(0);
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
        const { job } = await createJob(item.videoId, item.options!, ctrl.signal);
        dispatch(jobUpdated({ key: item.key, job }));
        dispatch(baseApi.util.invalidateTags(["Me"]));
        await poll(item.key, job.id, ctrl);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && (e.code === "GUEST_LIMIT" || e.code === "DAILY_LIMIT")) {
          // Kembalikan semua yang menunggu ke "siap"; guest → gerbang login, user → toast batas harian
          for (const i of store.getState().converter.items) {
            if (i.status === "pending") dispatch(itemFailed({ key: i.key, error: "", reset: true }));
          }
          dispatch(itemFailed({ key: item.key, error: "", reset: true }));
          dispatch(baseApi.util.invalidateTags(["Me"]));
          if (e.code === "GUEST_LIMIT") optsRef.current.onGuestLimit();
          else toast(e.message, "err");
        } else {
          const msg = e instanceof ApiError ? (e.code === "NETWORK" ? textRef.current.t.toast.network : e.message) : String(e);
          dispatch(itemFailed({ key: item.key, error: msg }));
          toast(msg, "err");
        }
        finish(item.key);
      }
    };

    // Lanjutkan polling job yang sudah berjalan (mis. setelah pindah halaman)
    for (const it of items) {
      if (it.jobId && ["queued", "downloading", "processing"].includes(it.status) && !active.current.has(it.key)) {
        const ctrl = new AbortController();
        active.current.set(it.key, ctrl);
        void poll(it.key, it.jobId, ctrl).finally(() => active.current.get(it.key) === ctrl && finish(it.key));
      }
    }

    const free = MAX_PARALLEL - active.current.size;
    if (free <= 0) return;
    const pending = items.filter((i) => i.status === "pending" && !active.current.has(i.key)).slice(0, free);
    for (const it of pending) {
      const ctrl = new AbortController();
      active.current.set(it.key, ctrl);
      void start(it, ctrl);
    }
  }, [items, tick, dispatch, store, toast]);
}

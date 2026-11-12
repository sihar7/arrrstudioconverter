"use client";

import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { batchUpdated, isRunning, type Batch, type QueueItem } from "@/store/slices/converterSlice";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { shortName } from "@/lib/shortName";
import type { useRobloxUpload } from "./useRobloxUpload";

/** Upload yang masih "processing" lebih lama dari ini dianggap selesai (asset ID biasanya keluar < 1 menit) */
const SETTLE_MS = 4 * 60_000;

const inFlight = (i: QueueItem) => i.upload.status === "uploading" || i.upload.status === "processing";

/**
 * Upload batch impor ke Roblox BERURUTAN per gelombang: ambil N lagu berikutnya (urutan file) → tunggu semuanya
 * selesai di-convert → upload bersamaan → tunggu semua dapat asset ID → gelombang berikutnya.
 * Ada yang gagal di satu gelombang → batch DIJEDA (mis. kena moderasi / batas Roblox) supaya akun tidak diserbu
 * upload bermasalah; user melanjutkan sendiri dari kartu batch.
 */
export function useBatchUpload(roblox: ReturnType<typeof useRobloxUpload>) {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.converter.items);
  const batches = useAppSelector((s) => s.converter.batches);
  const toast = useToast();
  const { t, f } = useT();
  // Penjaga: gelombang yang sudah dikirim di render ini (dispatch status "uploading" baru terlihat di render berikutnya)
  const started = useRef(new Set<string>());
  const ref = useRef({ roblox, toast, t, f });
  useEffect(() => {
    ref.current = { roblox, toast, t, f };
  });

  // Gelombang yang tertahan "processing" butuh dicek ulang walau tidak ada perubahan state
  const waiting = batches.some((b) => b.status === "running" && b.waveAt != null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [waiting]);

  useEffect(() => {
    const { roblox, toast, t, f } = ref.current;
    const b = t.converter.importer;
    const patch = (id: string, p: Partial<Batch>) => dispatch(batchUpdated({ id, patch: p }));

    for (const batch of batches) {
      if (!batch.upload) continue;
      const own = items.filter((i) => i.batch === batch.id);
      // Batch "selesai" tapi ada lagu yang di-convert ulang (Coba lagi yang gagal) → hidupkan lagi supaya ikut diupload
      if (batch.status === "done" && own.some((i) => isRunning(i.status))) {
        patch(batch.id, { status: "running", note: null });
        continue;
      }
      if (batch.status !== "running") continue;

      // 1) Gelombang berjalan → tunggu sampai semua punya hasil (selesai / gagal / processing kelamaan)
      if (batch.wave.length) {
        const wave = batch.wave.map((k) => own.find((i) => i.key === k)).filter((i): i is QueueItem => Boolean(i));
        const late = batch.waveAt != null && Date.now() - batch.waveAt > SETTLE_MS;
        if (wave.some((i) => i.upload.status === "uploading" || (i.upload.status === "processing" && !late))) continue;
        const failed = wave.filter((i) => i.upload.status === "error");
        batch.wave.forEach((k) => started.current.delete(k));
        if (failed.length) {
          const note = f(b.pausedFailed, { n: failed.length, error: failed[0].upload.error ?? "" });
          patch(batch.id, { status: "paused", note, wave: [], waveAt: null });
          toast(note, "err");
          continue;
        }
        patch(batch.id, { wave: [], waveAt: null, waves: batch.waves + 1 });
        continue;
      }

      // 2) Gelombang berikutnya: N lagu berikutnya yang belum terupload (lagu yang gagal convert dilewati)
      const next = own.filter((i) => i.status !== "error" && (i.upload.status === "idle" || i.upload.status === "error") && !started.current.has(i.key));
      if (!next.length) {
        // Selesai hanya bila impor sudah tuntas, tidak ada upload berjalan, dan tidak ada lagu yang masih di-convert
        if (batch.importing || !own.length || own.some(inFlight) || own.some((i) => isRunning(i.status))) continue;
        const ok = own.filter((i) => i.upload.status === "done").length;
        patch(batch.id, { status: "done", note: null });
        toast(f(b.batchDone, { ok, n: own.length }), "ok");
        continue;
      }
      const wave = next.slice(0, batch.waveSize);
      // Berurutan: tunggu sampai SEMUA lagu di gelombang ini selesai di-convert
      if (!wave.every((i) => i.status === "done" && i.result)) continue;
      const block = roblox.blockReason(wave[0]);
      if (block) {
        patch(batch.id, { status: "paused", note: block === "format" ? b.pausedFormat : b.pausedKey });
        continue;
      }
      wave.forEach((i) => started.current.add(i.key));
      patch(batch.id, { wave: wave.map((i) => i.key), waveAt: Date.now() });
      for (const item of wave) {
        const form = roblox.defaultForm(item);
        void roblox.upload(item, { ...form, displayName: item.assetName ? shortName(item.assetName, 50) : form.displayName, permission: batch.permission }, true);
      }
    }
  }, [items, batches, tick, dispatch]);
}

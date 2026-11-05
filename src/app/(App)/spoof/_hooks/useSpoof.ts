"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/hooks";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { OPERATION_POLL_MS } from "@/app/(App)/converter/_constants/converter.constants";
import { clearSpoofs, listSpoofs, refreshSpoof, runSpoof } from "../_service/spoof.service";
import { grantAccess } from "@/app/(App)/library/_service/library.service";
import type { PermissionMode } from "@/type/history";
import type { SpoofRecord, SpoofWant } from "@/type/spoof";

export const MAX_IDS = 25;
// Upload Roblox kadang butuh beberapa detik → cek ulang maks ±1 menit per aset
const MAX_POLLS = 15;

export interface SpoofSettings {
  autoUpload: boolean;
  creatorType: "user" | "group";
  creatorId: string;
  permission: PermissionMode;
  placeId: string;
}

/** Tujuan "Beri akses": komunitas (Group ID), game (Place ID), atau publik / Open Use (tanpa ID tujuan) */
export type SpoofGrantTarget = { kind: "group" | "place" | "open"; id: string };

/** Hasil "Beri akses": ID tetap, komunitas / game diberi izin pakai (tidak tersimpan di riwayat) */
export interface SpoofGrant {
  assetId: string;
  target: SpoofGrantTarget;
  error: string | null;
}

/** Aset yang sedang diproses (belum jadi catatan riwayat) */
export interface SpoofPending {
  sourceId: string;
  kind: SpoofWant;
  error: string | null;
}

/** Riwayat spoof + antrean proses berurutan + polling upload yang masih diproses Roblox */
export function useSpoof() {
  const store = useAppStore();
  const toast = useToast();
  const { t, f } = useT();
  const S = t.spoof;
  const [items, setItems] = useState<SpoofRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<SpoofPending[]>([]);
  const [grants, setGrants] = useState<SpoofGrant[]>([]);
  const [granting, setGranting] = useState(false);
  const busy = granting || pending.some((p) => !p.error);
  const alive = useRef(true);
  const polls = useRef(new Map<string, number>());

  useEffect(() => {
    alive.current = true;
    listSpoofs()
      .then((list) => alive.current && setItems(list))
      .catch(() => {})
      .finally(() => alive.current && setLoaded(true));
    return () => {
      alive.current = false;
    };
  }, []);

  const upsert = useCallback((rec: SpoofRecord) => {
    setItems((list) => [rec, ...list.filter((r) => r.id !== rec.id)].sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  /** Proses ID satu per satu (hemat rate limit Roblox); gagal per ID tidak menghentikan antrean */
  const start = useCallback(
    async (ids: string[], kind: SpoofWant, settings: SpoofSettings) => {
      const apiKey = store.getState().roblox.apiKey;
      if (!apiKey || !ids.length) return;
      setPending((p) => [...p.filter((x) => x.error), ...ids.map((sourceId) => ({ sourceId, kind, error: null }))]);
      let ok = 0;
      for (const sourceId of ids) {
        if (!alive.current) return;
        try {
          const rec = await runSpoof({
            apiKey,
            kind,
            sourceId,
            autoUpload: settings.autoUpload,
            creatorType: settings.creatorType,
            creatorId: settings.creatorId,
            permission: settings.permission,
            placeId: settings.permission === "place" ? settings.placeId : undefined,
          });
          if (!alive.current) return;
          upsert(rec);
          setPending((p) => p.filter((x) => !(x.sourceId === sourceId && !x.error)));
          ok++;
        } catch (e) {
          if (!alive.current) return;
          const msg = e instanceof ApiError || e instanceof Error ? e.message : S.failed;
          setPending((p) => p.map((x) => (x.sourceId === sourceId && !x.error ? { ...x, error: msg } : x)));
        }
      }
      if (ids.length > 1) toast(f(S.doneToast, { n: ok, total: ids.length }), ok ? "ok" : "err");
    },
    [store, upsert, toast, f, S],
  );

  /** Beri izin pakai ke komunitas / game untuk ID yang sudah ada — tanpa upload ulang, ID tidak berubah */
  const grant = useCallback(
    async (ids: string[], target: SpoofGrantTarget) => {
      const apiKey = store.getState().roblox.apiKey;
      if (!apiKey || !ids.length) return;
      setGranting(true);
      let rows: SpoofGrant[];
      try {
        const r = await grantAccess(apiKey, ids, target.kind, target.id);
        rows = ids.map((assetId) => ({ assetId, target, error: r.failed[assetId] ?? null }));
      } catch (e) {
        const msg = e instanceof ApiError || e instanceof Error ? e.message : S.failed;
        rows = ids.map((assetId) => ({ assetId, target, error: msg }));
      }
      if (!alive.current) return;
      setGranting(false);
      const done = new Set(ids);
      setGrants((g) => [...rows, ...g.filter((x) => !done.has(x.assetId))]);
      const ok = rows.filter((x) => !x.error).length;
      toast(f(S.grantToast, { n: ok, total: ids.length }), ok ? "ok" : "err");
    },
    [store, toast, f, S],
  );

  const dismissGrant = useCallback((assetId: string) => setGrants((g) => g.filter((x) => x.assetId !== assetId)), []);

  /** Catatan tanpa ID baru → spoof ulang dengan upload otomatis menyala */
  const uploadNow = useCallback(
    (rec: SpoofRecord, settings: SpoofSettings) => start([rec.sourceId], rec.kind, { ...settings, autoUpload: true }),
    [start],
  );

  const dismiss = useCallback((sourceId: string) => setPending((p) => p.filter((x) => x.sourceId !== sourceId || !x.error)), []);

  /** ids → hapus yang dipilih; tanpa ids → hapus semua. true = berhasil */
  const remove = useCallback(
    async (ids?: string[]) => {
      try {
        await clearSpoofs(ids);
      } catch {
        toast(S.deleteFailed, "err");
        return false;
      }
      if (!alive.current) return true;
      if (!ids) setItems([]);
      else {
        const gone = new Set(ids);
        setItems((list) => list.filter((r) => !gone.has(r.id)));
      }
      return true;
    },
    [toast, S],
  );

  // Upload yang masih diproses Roblox → cek berkala sampai asset ID ada (dibatasi MAX_POLLS)
  const waiting = items.filter((r) => !r.assetId && r.operationId && (polls.current.get(r.id) ?? 0) < MAX_POLLS);
  const waitingKey = waiting.map((r) => r.id).join(",");
  useEffect(() => {
    if (!waitingKey) return;
    const timer = setTimeout(async () => {
      const apiKey = store.getState().roblox.apiKey;
      if (!apiKey) return;
      for (const id of waitingKey.split(",")) {
        polls.current.set(id, (polls.current.get(id) ?? 0) + 1);
        const rec = await refreshSpoof(id, apiKey).catch(() => null);
        if (!alive.current) return;
        if (rec) upsert(rec);
        else setItems((list) => [...list]); // tetap hitung percobaan supaya polling berhenti
      }
    }, OPERATION_POLL_MS);
    return () => clearTimeout(timer);
  }, [waitingKey, items, store, upsert]);

  return { items, loaded, pending, grants, busy, start, grant, uploadNow, dismiss, dismissGrant, remove };
}

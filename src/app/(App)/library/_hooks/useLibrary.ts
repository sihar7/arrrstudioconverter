"use client";

import { useCallback, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { archiveAssets, fetchLibrary, grantAccess } from "../_service/library.service";
import type { GrantStatus, LibraryAsset } from "@/type/roblox";

const CHUNK = 50; // batas Asset Permissions API per request

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** State & aksi halaman Audio saya: muat (inventory / ID manual), pilih, izinkan place massal */
export function useLibrary() {
  const roblox = useAppSelector((s) => s.roblox);
  const toast = useToast();
  const { t, f } = useT();
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Kunci sinkron: infinite scroll bisa memicu load berkali-kali sebelum state loading ter-render
  const busy = useRef(false);
  const [granting, setGranting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [grants, setGrants] = useState<Record<string, GrantStatus>>({});

  const merge = (list: LibraryAsset[], replace: boolean) =>
    setAssets((cur) => {
      const base = replace ? [] : cur;
      const seen = new Set(base.map((a) => a.assetId));
      return [...base, ...list.filter((a) => !seen.has(a.assetId))];
    });

  const load = useCallback(
    async (opts: { more?: boolean; assetIds?: string[] } = {}) => {
      if (busy.current) return;
      busy.current = true;
      setLoading(true);
      try {
        const r = await fetchLibrary({
          apiKey: roblox.apiKey,
          creatorType: roblox.creatorType,
          creatorId: roblox.creatorId,
          pageToken: opts.more ? (nextToken ?? undefined) : undefined,
          assetIds: opts.assetIds,
        });
        // ID manual ditambahkan ke daftar; muat ulang inventory mengganti daftar
        merge(r.assets, !opts.more && !opts.assetIds);
        if (!opts.assetIds) setNextToken(r.nextPageToken);
        // Halaman lanjutan (scroll otomatis) tidak perlu toast
        if (!opts.more) toast(f(t.library.loadedToast, { n: r.assets.length }), "ok");
      } catch (e) {
        toast(errText(e, t.toast.network), "err");
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [roblox.apiKey, roblox.creatorType, roblox.creatorId, nextToken, toast, t, f],
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  /** Izinkan semua aset terpilih di satu place / jadikan publik — dipecah per 50, berjalan paralel */
  const grant = useCallback(
    async (mode: "place" | "public", placeId?: string) => {
      const ids = [...selected];
      if (!ids.length) return;
      setGranting(true);
      const chunks = Array.from({ length: Math.ceil(ids.length / CHUNK) }, (_, i) => ids.slice(i * CHUNK, (i + 1) * CHUNK));
      const next: Record<string, GrantStatus> = {};
      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const r = await grantAccess(roblox.apiKey, chunk, mode, placeId);
            for (const id of r.granted) next[id] = { status: "granted" };
            for (const [id, message] of Object.entries(r.failed)) next[id] = { status: "failed", message };
          } catch (e) {
            const message = errText(e, t.toast.network);
            for (const id of chunk) next[id] = { status: "failed", message };
          }
        }),
      );
      setGrants((g) => ({ ...g, ...next }));
      const ok = Object.values(next).filter((x) => x.status === "granted").length;
      const failed = ids.length - ok;
      toast(f(mode === "public" ? t.library.publicToast : t.library.doneToast, { ok, failed }), failed ? "err" : "ok");
      setGranting(false);
    },
    [selected, roblox.apiKey, toast, t, f],
  );

  /** Hapus (arsipkan) / pulihkan — dipecah per 50, paralel; status arsip diperbarui di daftar tanpa muat ulang */
  const archive = useCallback(
    async (ids: string[], on: boolean) => {
      if (!ids.length) return;
      setArchiving(true);
      const chunks = Array.from({ length: Math.ceil(ids.length / CHUNK) }, (_, i) => ids.slice(i * CHUNK, (i + 1) * CHUNK));
      const done = new Set<string>();
      let lastErr: string | null = null;
      await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const r = await archiveAssets(roblox.apiKey, chunk, on);
            r.done.forEach((id) => done.add(id));
            lastErr = Object.values(r.failed)[0] ?? lastErr;
          } catch (e) {
            lastErr = errText(e, t.toast.network);
          }
        }),
      );
      setAssets((cur) => cur.map((a) => (done.has(a.assetId) ? { ...a, archived: on } : a)));
      if (on) setSelected((s) => new Set([...s].filter((id) => !done.has(id))));
      const failed = ids.length - done.size;
      toast(
        failed && lastErr ? `${f(on ? t.library.archivedToast : t.library.restoredToast, { ok: done.size, failed })} — ${lastErr}` : f(on ? t.library.archivedToast : t.library.restoredToast, { ok: done.size, failed }),
        failed ? "err" : "ok",
      );
      setArchiving(false);
    },
    [roblox.apiKey, toast, t, f],
  );

  return {
    assets,
    nextToken,
    loading,
    granting,
    archiving,
    archive,
    selected,
    setSelected,
    grants,
    load,
    toggle,
    grant,
    ready: Boolean(roblox.apiKey && roblox.creatorId),
    ownerType: roblox.creatorType,
    ownerId: roblox.creatorId,
    savedPlace: roblox.placeId,
  };
}

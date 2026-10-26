"use client";

import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { baseApi } from "@/store/api/baseApi";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { applyPermission, applyPermissionMany, checkStatus, deleteMany, uploadEntry } from "../_service/history.service";
import { canGoPublic, needsCheck } from "../_utils/helpers";
import type { HistoryEntry, HistoryItem } from "@/type/history";
import type { UploadForm } from "@/type/roblox";

/** Aksi halaman riwayat: cek status Roblox, izin, upload ulang, hapus */
export function useHistoryActions() {
  const dispatch = useAppDispatch();
  const apiKey = useAppSelector((s) => s.roblox.apiKey);
  const toast = useToast();
  const { t, f } = useT();
  const [checking, setChecking] = useState(false);

  const errMsg = useCallback(
    (e: unknown) => (e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e)),
    [t],
  );
  const refresh = useCallback(() => dispatch(baseApi.util.invalidateTags(["History"])), [dispatch]);

  const checkAll = useCallback(
    async (items: HistoryItem[], quiet = false) => {
      if (!apiKey) return quiet ? undefined : toast(t.history.needKeyForStatus, "err");
      // Prioritaskan yang masih diproses/direview, maks 25 per panggilan
      const ids = [...items.filter(needsCheck), ...items.filter((i) => i.roblox && !needsCheck(i))].slice(0, 25).map((i) => i.id);
      if (!ids.length) return;
      if (!quiet) setChecking(true);
      try {
        const r = await checkStatus(apiKey, ids);
        const errs = Object.values(r.errors);
        if (!quiet) toast(errs.length ? errs[0] : t.toast.statusUpdated, errs.length ? "err" : "ok");
        refresh();
      } catch (e) {
        if (!quiet) toast(errMsg(e), "err");
      } finally {
        if (!quiet) setChecking(false);
      }
    },
    [apiKey, toast, t, refresh, errMsg],
  );

  /** Jadikan publik banyak entri sekaligus (yang masih direview → menunggu, diterapkan saat Disetujui) */
  const [publishing, setPublishing] = useState(false);
  const publishMany = useCallback(
    async (items: HistoryItem[]) => {
      if (!apiKey) return toast(t.history.needKeyForStatus, "err");
      const ids = items.filter(canGoPublic).map((i) => i.id);
      if (!ids.length) return;
      setPublishing(true);
      try {
        let granted = 0;
        let waiting = 0;
        // Per 50 (batas skema), berurutan
        for (let i = 0; i < ids.length; i += 50) {
          const r = await applyPermissionMany(apiKey, ids.slice(i, i + 50), "public");
          for (const e of r.entries) {
            const p = e.roblox?.permissions.find((x) => x.mode === "public");
            if (p?.status === "granted") granted++;
            else if (p?.status === "pending") waiting++;
          }
        }
        const failed = ids.length - granted - waiting;
        toast(f(t.history.publicBulkDone, { ok: granted, wait: waiting, failed }), failed ? "err" : "ok");
        refresh();
      } catch (e) {
        toast(errMsg(e), "err");
      } finally {
        setPublishing(false);
      }
    },
    [apiKey, toast, t, f, refresh, errMsg],
  );

  const setPermission = useCallback(
    async (entry: HistoryEntry, mode: "place" | "public", placeId?: string) => {
      try {
        const { entry: next } = await applyPermission(apiKey, entry, mode, placeId);
        const failed = next.roblox?.permissions.find((p) => p.mode === mode && p.status === "failed");
        toast(failed?.message ?? t.toast.permissionApplied, failed ? "err" : "ok");
        refresh();
        return !failed;
      } catch (e) {
        toast(errMsg(e), "err");
        return false;
      }
    },
    [apiKey, toast, t, refresh, errMsg],
  );

  const upload = useCallback(
    async (entry: HistoryEntry, form: UploadForm) => {
      try {
        const r = await uploadEntry(apiKey, entry, form);
        toast(r.assetId ? f(t.toast.uploaded, { id: r.assetId }) : t.upload.processing, "ok");
        refresh();
        return true;
      } catch (e) {
        toast(errMsg(e), "err");
        return false;
      }
    },
    [apiKey, toast, t, f, refresh, errMsg],
  );

  /** Hapus banyak riwayat (konfirmasi lewat DeleteDialog); archive = aset yang sudah diupload diarsipkan di Roblox */
  const [deleting, setDeleting] = useState(false);
  const removeMany = useCallback(
    async (items: HistoryItem[], archive: boolean) => {
      if (!items.length) return false;
      setDeleting(true);
      try {
        const r = await deleteMany(
          items.map((i) => i.id),
          archive,
          apiKey,
        );
        toast(r.archived ? f(t.history.archivedSummary, { n: r.deleted, a: r.archived }) : f(t.history.deletedSummary, { n: r.deleted }), "ok");
        if (r.archiveFailed) toast(f(t.history.archiveFailed, { n: r.archiveFailed }), "err");
        refresh();
        return true;
      } catch (e) {
        toast(errMsg(e), "err");
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [apiKey, toast, t, f, refresh, errMsg],
  );

  return { apiKey, checking, deleting, checkAll, publishing, publishMany, setPermission, upload, removeMany };
}

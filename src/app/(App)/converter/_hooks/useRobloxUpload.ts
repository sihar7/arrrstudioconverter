"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { consumeAutoUpload, uploadUpdated, type QueueItem } from "@/store/slices/converterSlice";
import { baseApi, useMeQuery } from "@/store/api/baseApi";
import { ROBLOX_FORMATS } from "@/lib/schemas/convert.schema";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { checkOperation, uploadToRoblox } from "../_service/converter.service";
import { OPERATION_POLL_MS, UPLOAD_PARALLEL } from "../_constants/converter.constants";
import { shortName } from "@/lib/shortName";
import type { UploadBlock, UploadForm } from "@/type/roblox";

/** Upload hasil ke Roblox + polling operasi sampai asset ID keluar */
export function useRobloxUpload() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const roblox = useAppSelector((s) => s.roblox);
  const { data: me } = useMeQuery();
  const toast = useToast();
  const { t, f } = useT();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const blockReason = useCallback(
    (item: QueueItem): UploadBlock => {
      if (!me?.user) return "login";
      if (item.result && !(ROBLOX_FORMATS as readonly string[]).includes(item.result.format)) return "format";
      if (!roblox.apiKey || !roblox.creatorId) return "key";
      return null;
    },
    [me?.user, roblox.apiKey, roblox.creatorId],
  );

  const defaultForm = useCallback(
    (item: QueueItem): UploadForm => ({
      displayName: shortName(item.title),
      description: "",
      creatorType: roblox.creatorType,
      creatorId: roblox.creatorId,
      permission: roblox.defaultPermission,
      placeId: roblox.placeId,
    }),
    [roblox],
  );

  const pollOperation = useCallback(
    async (key: string, operationId: string, historyId?: string, quiet = false) => {
      const apiKey = store.getState().roblox.apiKey;
      const deadline = Date.now() + 3 * 60_000;
      while (alive.current && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, OPERATION_POLL_MS));
        if (!alive.current) return;
        try {
          const r = await checkOperation(apiKey, operationId, historyId);
          if (r.assetId) {
            dispatch(uploadUpdated({ key, upload: { status: "done", assetId: r.assetId, operationId: null } }));
            if (!quiet) toast(f(t.toast.uploaded, { id: r.assetId }), "ok");
            dispatch(baseApi.util.invalidateTags(["History"]));
            return;
          }
        } catch (e) {
          dispatch(uploadUpdated({ key, upload: { status: "error", error: e instanceof ApiError ? e.message : String(e) } }));
          return;
        }
      }
    },
    [dispatch, store, toast, t, f],
  );

  const upload = useCallback(
    async (item: QueueItem, form: UploadForm, quiet = false) => {
      if (!item.result) return false;
      const apiKey = store.getState().roblox.apiKey;
      dispatch(uploadUpdated({ key: item.key, upload: { status: "uploading", error: null } }));
      try {
        const r = await uploadToRoblox({
          fileId: item.result.fileId,
          historyId: item.result.historyId ?? undefined,
          apiKey,
          creatorType: form.creatorType,
          creatorId: form.creatorId,
          displayName: form.displayName.trim().slice(0, 50) || "Audio",
          description: form.description,
          permission: form.permission,
          placeId: form.permission === "place" ? form.placeId : undefined,
        });
        dispatch(baseApi.util.invalidateTags(["History"]));
        if (r.assetId) {
          dispatch(uploadUpdated({ key: item.key, upload: { status: "done", assetId: r.assetId } }));
          if (!quiet) toast(f(t.toast.uploaded, { id: r.assetId }), "ok");
        } else if (r.operationId) {
          dispatch(uploadUpdated({ key: item.key, upload: { status: "processing", operationId: r.operationId } }));
          void pollOperation(item.key, r.operationId, item.result.historyId ?? undefined, quiet);
        }
        return true;
      } catch (e) {
        const msg = e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String(e);
        dispatch(uploadUpdated({ key: item.key, upload: { status: "error", error: msg } }));
        if (!quiet) toast(msg, "err");
        return false;
      }
    },
    [dispatch, store, toast, t, f, pollOperation],
  );

  /** Item yang bisa ikut upload massal: selesai, belum terupload, format diterima Roblox */
  const uploadable = useCallback(
    (item: QueueItem) =>
      Boolean(item.result) &&
      (item.upload.status === "idle" || item.upload.status === "error") &&
      blockReason(item) !== "format",
    [blockReason],
  );

  /** Upload serentak: beberapa item berjalan paralel (dibatasi) lalu satu toast ringkasan */
  const uploadMany = useCallback(
    async (jobs: { item: QueueItem; form: UploadForm }[]) => {
      let ok = 0;
      let next = 0;
      const worker = async () => {
        while (alive.current && next < jobs.length) {
          const { item, form } = jobs[next++];
          if (await upload(item, form, true)) ok++;
        }
      };
      await Promise.all(Array.from({ length: Math.min(UPLOAD_PARALLEL, jobs.length) }, worker));
      const failed = jobs.length - ok;
      toast(f(failed ? t.toast.bulkPartial : t.toast.bulkDone, { ok, failed }), failed ? "err" : "ok");
    },
    [upload, toast, t, f],
  );

  /** Dipanggil runner saat item selesai: upload otomatis kalau diminta & memungkinkan */
  const autoUpload = useCallback(
    (key: string) => {
      const state = store.getState();
      const item = state.converter.items.find((i) => i.key === key);
      if (!item?.autoUpload) return;
      dispatch(consumeAutoUpload(key));
      if (blockReason(item)) return;
      void upload(item, { ...defaultForm(item), permission: state.converter.autoPermission });
    },
    [store, dispatch, blockReason, upload, defaultForm],
  );

  return { upload, uploadMany, uploadable, autoUpload, blockReason, defaultForm };
}

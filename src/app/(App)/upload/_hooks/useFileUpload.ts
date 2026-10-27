"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { baseApi } from "@/store/api/baseApi";
import { ApiError } from "@/lib/utils";
import { shortName } from "@/lib/shortName";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { checkOperation, uploadToRoblox } from "@/app/(App)/converter/_service/converter.service";
import { OPERATION_POLL_MS } from "@/app/(App)/converter/_constants/converter.constants";
import { sendFile } from "../_service/upload.service";
import type { PermissionMode } from "@/type/history";

export const ACCEPT = [".mp3", ".ogg", ".wav", ".flac"];
const ACCEPT_RE = /\.(mp3|ogg|wav|flac)$/i;
export const MAX_FILES = 50;
const MAX_BYTES = 20 * 1024 * 1024;
// Kirim file paralel secukupnya — lebih banyak hanya berebut bandwidth upload user
const PARALLEL = 3;

export type FileStatus = "idle" | "sending" | "processing" | "done" | "error";

export interface FileItem {
  key: string;
  file: File;
  /** object URL untuk pratinjau; dicabut saat item dihapus / halaman ditutup */
  url: string;
  ext: string;
  /** Nama aset Roblox (bisa diubah per baris) */
  name: string;
  duration: number | null;
  status: FileStatus;
  progress: number;
  fileId: string | null;
  historyId: string | null;
  assetId: string | null;
  error: string | null;
}

export interface UploadSettings {
  creatorType: "user" | "group";
  creatorId: string;
  description: string;
  permission: PermissionMode;
  placeId: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
const baseName = (n: string) => n.replace(/\.[^.]+$/, "").replace(/_+/g, " ").trim() || n;

/** Durasi dari metadata audio (tanpa decode penuh); null kalau browser tidak bisa membaca */
function readDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const a = new Audio();
    const done = (v: number | null) => {
      a.removeAttribute("src");
      resolve(v);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
    a.onerror = () => done(null);
    a.src = url;
  });
}

/** Daftar file lokal + kirim ke server + upload Roblox + polling asset ID */
export function useFileUpload() {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { t, f } = useT();
  const U = t.fileUpload;
  const [items, setItems] = useState<FileItem[]>([]);
  // Salinan terbaru untuk callback async (tanpa membuat ulang callback tiap progres)
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      for (const i of itemsRef.current) URL.revokeObjectURL(i.url);
    };
  }, []);

  const patch = useCallback((key: string, p: Partial<FileItem>) => {
    if (alive.current) setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }, []);

  const busy = items.some((i) => i.status === "sending" || i.status === "processing");

  // Jangan sampai tab tertutup saat file masih terkirim
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const add = useCallback(
    (files: Iterable<File>) => {
      const have = new Set(itemsRef.current.map((i) => fileKey(i.file)));
      const added: FileItem[] = [];
      const skipped: string[] = [];
      for (const file of files) {
        const why = !ACCEPT_RE.test(file.name)
          ? U.badType
          : file.size > MAX_BYTES
            ? U.tooBig
            : have.has(fileKey(file))
              ? U.duplicate
              : itemsRef.current.length + added.length >= MAX_FILES
                ? f(U.limit, { n: MAX_FILES })
                : null;
        if (why) {
          skipped.push(`${file.name} (${why})`);
          continue;
        }
        have.add(fileKey(file));
        added.push({
          key: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          ext: file.name.split(".").pop()!.toLowerCase(),
          name: shortName(baseName(file.name)).slice(0, 50),
          duration: null,
          status: "idle",
          progress: 0,
          fileId: null,
          historyId: null,
          assetId: null,
          error: null,
        });
      }
      if (added.length) {
        setItems((list) => [...list, ...added]);
        for (const it of added) void readDuration(it.url).then((duration) => patch(it.key, { duration }));
      }
      if (skipped.length) {
        const names = skipped.slice(0, 3).join(", ") + (skipped.length > 3 ? ` +${skipped.length - 3}` : "");
        toast(f(U.skipped, { n: skipped.length, names }), "err");
      }
    },
    [U, f, toast, patch],
  );

  const remove = useCallback((key: string) => {
    setItems((list) => {
      const it = list.find((i) => i.key === key);
      if (!it || it.status === "sending" || it.status === "processing") return list;
      URL.revokeObjectURL(it.url);
      return list.filter((i) => i.key !== key);
    });
  }, []);

  const clear = useCallback((onlyDone: boolean) => {
    setItems((list) => {
      const drop = list.filter((i) => (onlyDone ? i.status === "done" : i.status !== "sending" && i.status !== "processing"));
      for (const i of drop) URL.revokeObjectURL(i.url);
      return list.filter((i) => !drop.includes(i));
    });
  }, []);

  const rename = useCallback((key: string, name: string) => patch(key, { name }), [patch]);

  const errText = useCallback(
    (e: unknown) => (e instanceof ApiError ? (e.code === "NETWORK" ? t.toast.network : e.message) : String((e as Error)?.message ?? e)),
    [t],
  );

  /** Satu file: kirim ke server (sekali saja — ulangi memakai fileId yang sama) → Roblox → tunggu asset ID */
  const uploadOne = useCallback(
    async (key: string, s: UploadSettings): Promise<{ assetId: string } | { error: string } | null> => {
      const it = itemsRef.current.find((i) => i.key === key);
      if (!it || it.status === "sending" || it.status === "processing" || it.status === "done") return null;
      const apiKey = store.getState().roblox.apiKey;
      let { fileId, historyId } = it;
      try {
        if (!fileId || !historyId) {
          patch(key, { status: "sending", progress: 0, error: null });
          const sent = await sendFile(it.file, (progress) => patch(key, { progress }), () => alive.current);
          ({ fileId, historyId } = sent);
          patch(key, { fileId, historyId, duration: it.duration ?? sent.duration });
        }
        patch(key, { status: "processing", progress: 100, error: null });
        const r = await uploadToRoblox({
          fileId,
          historyId,
          apiKey,
          creatorType: s.creatorType,
          creatorId: s.creatorId,
          displayName: it.name.trim().slice(0, 50) || "Audio",
          description: s.description,
          permission: s.permission,
          placeId: s.permission === "place" ? s.placeId : undefined,
        });
        let assetId = r.assetId;
        const deadline = Date.now() + 3 * 60_000;
        while (!assetId && r.operationId && alive.current && Date.now() < deadline) {
          await sleep(OPERATION_POLL_MS);
          assetId = (await checkOperation(apiKey, r.operationId, historyId)).assetId;
        }
        if (!assetId) throw new Error(t.upload.processing);
        patch(key, { status: "done", assetId });
        return { assetId };
      } catch (e) {
        // File kedaluwarsa di server → kirim ulang dari awal saat diulangi
        const gone = e instanceof ApiError && e.code === "FILE_GONE";
        const error = errText(e);
        patch(key, { status: "error", error, ...(gone ? { fileId: null, historyId: null } : {}) });
        return { error };
      } finally {
        dispatch(baseApi.util.invalidateTags(["History"]));
      }
    },
    [store, dispatch, patch, errText, t],
  );

  /** Semua yang belum terupload (atau gagal) — beberapa berjalan paralel, lalu satu toast ringkasan */
  const uploadAll = useCallback(
    async (s: UploadSettings) => {
      const keys = itemsRef.current.filter((i) => i.status === "idle" || i.status === "error").map((i) => i.key);
      if (!keys.length) return;
      let ok = 0;
      let next = 0;
      const worker = async () => {
        while (alive.current && next < keys.length) {
          const r = await uploadOne(keys[next++], s);
          if (r && "assetId" in r) ok++;
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL, keys.length) }, worker));
      if (!alive.current) return;
      const failed = keys.length - ok;
      toast(f(failed ? t.toast.bulkPartial : t.toast.bulkDone, { ok, failed }), failed ? "err" : "ok");
    },
    [uploadOne, toast, t, f],
  );

  /** Upload satuan dari tombol baris → toast hasilnya */
  const uploadSingle = useCallback(
    async (key: string, s: UploadSettings) => {
      const r = await uploadOne(key, s);
      if (r && "assetId" in r) toast(f(t.toast.uploaded, { id: r.assetId }), "ok");
      else if (r) toast(r.error, "err");
    },
    [uploadOne, toast, t, f],
  );

  return { items, busy, add, remove, clear, rename, uploadSingle, uploadAll };
}

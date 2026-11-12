"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "@reduxjs/toolkit";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { addItems, batchCreated, type Cut, type QueueInput } from "@/store/slices/converterSlice";
import { readTable, ImportError } from "@/lib/import/sheet";
import { detectRows, type ImportRow } from "@/lib/import/rows";
import { ApiError } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { fetchInfo, resolveSongs, type ResolvedVideo } from "../_service/converter.service";
import { parseLink } from "../_utils/helpers";

export type TrimLevel = "off" | "light" | "medium";

/** Pangkas otomatis: detik dibuang di awal / akhir + fade (dikit saja — lagu tetap utuh terdengar) */
const TRIM: Record<Exclude<TrimLevel, "off">, { start: number; end: number; fadeIn: number; fadeOut: number }> = {
  light: { start: 0.5, end: 1.5, fadeIn: 0.3, fadeOut: 1 },
  medium: { start: 2, end: 3, fadeIn: 0.5, fadeOut: 1.5 },
};

const CHUNK = 25;

export interface ImportSettings {
  trim: TrimLevel;
  upload: boolean;
  waveSize: number;
}

type Phase =
  | { kind: "pick" }
  | { kind: "reading" }
  | { kind: "ready"; file: string; rows: ImportRow[]; truncated: number | null; links: number; playlists: number }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; added: number; notFound: string[] };

function cutFor(level: TrimLevel, duration: number | null): Cut | undefined {
  if (level === "off") return undefined;
  const p = TRIM[level];
  // Lagu pendek (< 30 dtk) tidak dipotong, cukup fade; durasi tak diketahui → hanya awal yang dipotong
  if (duration != null && duration < 30) return { start: 0, end: null, fadeIn: p.fadeIn, fadeOut: p.fadeOut };
  return { start: p.start, end: duration != null ? Math.round((duration - p.end) * 10) / 10 : null, fadeIn: p.fadeIn, fadeOut: p.fadeOut };
}

/** ID YouTube langsung (video / shorts / music / ID polos) → "id:<id>" untuk endpoint resolve */
const youtubeId = (link: string) => {
  const p = parseLink(link);
  return p.id && ["video", "short", "music", "id"].includes(p.kind) ? p.id : null;
};

/** Impor file → daftar lagu → antrean (dengan batch untuk upload bergelombang) */
export function useImport(limit: number) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Dialog ditutup di tengah pencarian → hentikan request yang tersisa
  useEffect(() => () => abort.current?.abort(), []);

  const pick = useCallback(
    async (file: File) => {
      setError(null);
      setPhase({ kind: "reading" });
      try {
        const { rows: all } = detectRows(await readTable(file));
        if (!all.length) throw new ImportError("EMPTY");
        const rows = all.slice(0, limit);
        setPhase({
          kind: "ready",
          file: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Impor",
          rows,
          truncated: all.length > limit ? limit : null,
          links: rows.filter((r) => r.link).length,
          playlists: rows.filter((r) => r.link && parseLink(r.link).kind === "playlist").length,
        });
      } catch (e) {
        const code = e instanceof ImportError ? e.code : "BROKEN";
        setError(t.converter.importer.errors[code]);
        setPhase({ kind: "pick" });
      }
    },
    [limit, t],
  );

  const start = useCallback(
    async (s: ImportSettings) => {
      if (phase.kind !== "ready") return;
      const { rows, file } = phase;
      const ctrl = new AbortController();
      abort.current = ctrl;
      const batch = nanoid(8);
      dispatch(
        batchCreated({
          id: batch,
          label: file,
          upload: s.upload,
          waveSize: s.waveSize,
          permission: store.getState().converter.autoPermission,
          status: "running",
          note: null,
          wave: [],
          waveAt: null,
          waves: 0,
        }),
      );

      // Playlist tidak diimpor dari file (bisa ratusan lagu tersembunyi di satu baris)
      const todo = rows.filter((r) => !(r.link && parseLink(r.link).kind === "playlist"));
      const notFound: string[] = [];
      setPhase({ kind: "running", done: 0, total: todo.length });

      const toInput = (row: ImportRow, v: ResolvedVideo): QueueInput => ({
        ...v,
        batch,
        cut: cutFor(s.trim, v.duration),
        // Nama aset: kolom nama di file → judul yang ditulis user → (link) judul YouTube saat upload
        assetName: row.name ?? row.query ?? null,
      });

      for (let i = 0; i < todo.length && !ctrl.signal.aborted; i += CHUNK) {
        const part = todo.slice(i, i + CHUNK);
        const out: (QueueInput | null)[] = part.map(() => null);
        // YouTube (link / ID) & judul → resolve sekaligus; link sosial lain lewat info satu per satu
        const viaResolve = part.map((r, k) => ({ r, k, q: r.link ? (youtubeId(r.link) ? `id:${youtubeId(r.link)}` : null) : r.query })).filter((x) => x.q);
        try {
          if (viaResolve.length) {
            const { items } = await resolveSongs(viaResolve.map((x) => x.q!), ctrl.signal);
            viaResolve.forEach((x, n) => {
              const v = items[n];
              if (v) out[x.k] = toInput(x.r, v);
            });
          }
          for (const [k, r] of part.entries()) {
            if (!r.link || youtubeId(r.link) || ctrl.signal.aborted) continue;
            const res = await fetchInfo(r.link).catch(() => null);
            if (res?.type === "video") out[k] = toInput(r, res.video);
          }
        } catch (e) {
          if (ctrl.signal.aborted) break;
          // Gagal satu potongan (jaringan / batas) → judulnya masuk daftar "tidak ketemu", lanjut potongan berikutnya
          if (e instanceof ApiError && e.code === "PLAN_REQUIRED") {
            setError(e.message);
            break;
          }
        }
        out.forEach((v, k) => !v && notFound.push(part[k].query ?? part[k].link ?? ""));
        const ok = out.filter((v): v is QueueInput => Boolean(v));
        if (ok.length) dispatch(addItems(ok));
        setPhase({ kind: "running", done: Math.min(todo.length, i + CHUNK), total: todo.length });
      }
      abort.current = null;
      // Hitung dari antrean: lagu kembar di file / sudah ada di antrean dilewati addItems
      const inQueue = store.getState().converter.items.filter((i) => i.batch === batch).length;
      setPhase({ kind: "done", added: inQueue, notFound });
    },
    [phase, dispatch, store],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    setError(null);
    setPhase({ kind: "pick" });
  }, []);

  const stop = useCallback(() => abort.current?.abort(), []);

  return { phase, error, pick, start, reset, stop };
}

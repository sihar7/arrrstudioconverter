"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CloudUpload, MediaImagePlus, Trash, WarningTriangle } from "iconoir-react";
import { cn, formatBytes } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/shared/PageHeader";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import DropZone from "@/components/shared/ImageDropZone";
import Button from "@/components/ui/Button";
import Progress from "@/components/ui/Progress";
import { formatMb, type ModelDef } from "@/lib/ai/runtime";
import type { useAiModel } from "@/hooks/useAiModel";
import CompareView from "./CompareView";

export interface ImageSource {
  file: File;
  url: string;
  bitmap: ImageBitmap;
  w: number;
  h: number;
}

const isImage = (f: File) => /^image\/(png|jpeg|webp)$/.test(f.type);

/** Gambar sumber + object URL dengan pembersihan otomatis (ganti / hapus / tinggalkan halaman) */
export function useImageSource(onLoaded?: (s: ImageSource) => void) {
  const { t } = useT();
  const toast = useToast();
  const [source, setSource] = useState<ImageSource | null>(null);
  const ref = useRef<ImageSource | null>(null);

  const release = (s: ImageSource | null) => {
    if (!s) return;
    URL.revokeObjectURL(s.url);
    s.bitmap.close();
  };

  useEffect(() => () => release(ref.current), []);

  const load = useCallback(
    async (file: File): Promise<ImageSource | null> => {
      if (!isImage(file)) {
        toast(t.imgtools.notImage, "err");
        return null;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const next = { file, url: URL.createObjectURL(file), bitmap, w: bitmap.width, h: bitmap.height };
        release(ref.current);
        ref.current = next;
        setSource(next);
        onLoaded?.(next);
        return next;
      } catch {
        toast(t.imgtools.openFail, "err");
        return null;
      }
    },
    [onLoaded, t, toast],
  );

  const clear = useCallback(() => {
    release(ref.current);
    ref.current = null;
    setSource(null);
  }, []);

  return { source, load, clear };
}

/** Object URL untuk hasil (blob) — dicabut otomatis saat diganti */
export function useResultUrl() {
  const [result, setResult] = useState<{ blob: Blob; url: string; w: number; h: number } | null>(null);
  const ref = useRef(result);
  useEffect(() => () => {
    if (ref.current) URL.revokeObjectURL(ref.current.url);
  }, []);
  const set = useCallback((blob: Blob | null, w = 0, h = 0) => {
    if (ref.current) URL.revokeObjectURL(ref.current.url);
    const next = blob ? { blob, url: URL.createObjectURL(blob), w, h } : null;
    ref.current = next;
    setResult(next);
  }, []);
  return [result, set] as const;
}

/** Baris status model AI: belum diunduh (ukuran) · progres unduh · siap (GPU/CPU) · gagal */
export function ModelLine({ model, state }: { model: ModelDef; state: ReturnType<typeof useAiModel> }) {
  const { t, f } = useT();
  const s = t.imgtools;
  if (state.status === "loading" && state.progress < 1) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[12.5px] tabular-nums text-fg-2">{f(s.modelLoading, { pct: Math.round(state.progress * 100) })}</p>
        <Progress value={state.progress * 100} label={s.modelLoading} />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-err">
        <WarningTriangle width={14} height={14} className="mt-0.5 shrink-0" /> {s.modelFail}
      </p>
    );
  }
  if (state.status === "ready" && state.backend) {
    return (
      <p className="flex items-center gap-2 text-[12.5px] text-fg-3">
        <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" /> {s.modelReady} · {s.backend[state.backend]}
      </p>
    );
  }
  return <p className="text-[12.5px] leading-relaxed text-fg-3">{state.cached ? s.modelReady : f(s.modelFirst, { size: formatMb(model.bytes) })}</p>;
}

/** Catatan batas plan + ajakan upgrade (tersembunyi di plan tertinggi) */
export function PlanCap({ plan, planName, max, scaledFrom, top }: { plan: string; planName: string; max: number; scaledFrom?: string | null; top: boolean }) {
  const { t, f } = useT();
  const s = t.imgtools;
  return (
    <div className="flex flex-col gap-1 text-[12.5px] leading-relaxed text-fg-3" data-plan={plan}>
      <p>{f(s.capNote, { plan: planName, max })}</p>
      {scaledFrom && <p className="text-warn">{f(s.capScaled, { from: scaledFrom, plan: planName })}</p>}
      {!top && (
        <Link href="/pricing" className="link-line w-fit font-semibold text-fg-2 hover:text-fg">
          {s.upgrade}
        </Link>
      )}
    </div>
  );
}

/**
 * Kerangka halaman alat gambar: kepala · preview (drop zone / banding) · panel pengaturan.
 * Isi panel & aksi diserahkan ke tiap alat.
 */
export default function ImageToolFrame({
  title,
  sub,
  source,
  onFile,
  onClear,
  resultUrl,
  busy,
  progress,
  panel,
}: {
  title: string;
  sub: string;
  source: ImageSource | null;
  onFile: (f: File) => void;
  onClear: () => void;
  resultUrl?: string | null;
  busy: boolean;
  progress?: number | null;
  panel: ReactNode;
}) {
  const { t } = useT();
  const s = t.imgtools;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={s.eyebrow} title={title} sub={sub} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <CardBox>
          <CardHeader title={source ? source.file.name : s.choose} aside={<span className="text-[12.5px] text-fg-3">{s.privacy}</span>} />
          <div className="p-3 sm:p-4">
            {!source ? (
              <DropZone
                label={s.choose}
                onFiles={(files) => onFile(files[0])}
                className="flex min-h-[360px] flex-col items-center justify-center rounded border border-dashed border-line-2 px-6 py-12 text-center hover:border-fg-3 hover:bg-fg/[0.03] sm:min-h-[460px]"
              >
                <span className="grid size-14 place-items-center rounded-full bg-fg/[0.07] text-fg">
                  <CloudUpload width={26} height={26} />
                </span>
                <p className="mt-5 font-display text-[19px] font-bold tracking-[-0.02em]">{s.dropTitle}</p>
                <p className="mt-1.5 text-[14px] text-fg-2">{s.dropSub}</p>
                <span className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[15px] font-semibold text-on-accent">
                  <MediaImagePlus width={18} height={18} /> {s.choose}
                </span>
              </DropZone>
            ) : (
              <div className="flex flex-col gap-3">
                <CompareView before={source.url} after={resultUrl} ratio={source.w / source.h} busy={busy} />
                {progress != null && <Progress value={progress * 100} label={s.processing} />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[12.5px] tabular-nums text-fg-3">
                    {source.w}×{source.h} · {formatBytes(source.file.size)}
                  </p>
                  <div className="flex gap-2">
                    <DropZone label={s.replace} onFiles={(files) => onFile(files[0])} className={cn("rounded-full", busy && "pointer-events-none opacity-50")}>
                      <span className="inline-flex h-9 items-center gap-2 rounded-full bg-fg/[0.07] px-4 text-[13.5px] font-semibold hover:bg-fg/[0.12]">
                        <MediaImagePlus width={16} height={16} /> {s.replace}
                      </span>
                    </DropZone>
                    <Button size="sm" variant="subtle" icon={<Trash width={16} height={16} />} disabled={busy} onClick={onClear}>
                      {s.remove}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBox>
        <div className="flex min-w-0 flex-col gap-6">{panel}</div>
      </div>
    </div>
  );
}

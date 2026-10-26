"use client";

import { CloudUpload, MediaImagePlus, Trash, WarningTriangle } from "iconoir-react";
import { cn, formatBytes } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import Switch from "@/components/ui/Switch";
import DropZone from "./DropZone";

export interface SourceInfo {
  name: string;
  bytes: number;
  thumb: string;
  w: number;
  h: number;
  original: { w: number; h: number };
  scaled: boolean;
}

/** Kartu input selalu terlihat (juga saat preview 3D tidak tersedia) — tarik-lepas / pilih file */
export default function InputCard({
  source,
  flat,
  onFlat,
  seam,
  onSeam,
  faceSize,
  onFile,
  onRemove,
}: {
  source: SourceInfo | null;
  flat: boolean;
  onFlat: (v: boolean) => void;
  seam: boolean;
  onSeam: (v: boolean) => void;
  faceSize: number;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const { t, f } = useT();
  const s = t.skybox;

  if (!source) {
    return (
      <CardBox>
        <CardHeader title={s.input} />
        <div className="p-4">
          <DropZone
            label={s.choose}
            onFiles={(files) => onFile(files[0])}
            className="flex flex-col items-center rounded border border-dashed border-line-2 px-5 py-9 text-center hover:border-fg-3 hover:bg-fg/[0.03]"
          >
            <span className="grid size-12 place-items-center rounded-full bg-fg/[0.07] text-fg">
              <CloudUpload width={22} height={22} />
            </span>
            <p className="mt-4 text-[15px] font-semibold">{s.dropTitle}</p>
            <p className="mt-1 text-[13.5px] text-fg-2">{s.dropSub}</p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-fg-3">{s.dropHint}</p>
            <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-fg/[0.1] px-4 text-[14px] font-semibold text-fg transition-colors hover:bg-fg/[0.15]">
              <MediaImagePlus width={16} height={16} /> {s.choose}
            </span>
          </DropZone>
        </div>
      </CardBox>
    );
  }

  const ratio = source.original.w / source.original.h;
  // Detail per sisi = lebar sumber yang menutupi 90° (panorama: ¼ lebar · gambar biasa: ½ lebar)
  const detail = Math.round(source.original.w / (flat ? 2 : 4));
  const q = detail / faceSize;
  const tone = q >= 0.95 ? "ok" : q >= 0.6 ? "warn" : "err";
  const label = tone === "ok" ? s.sharpGood : tone === "warn" ? s.sharpOk : s.sharpLow;

  return (
    <CardBox>
      <CardHeader title={s.input} />
      <div className="flex flex-col gap-5 p-4">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={source.thumb} alt="" className="h-[60px] w-[104px] shrink-0 rounded-s bg-fg/[0.06] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold" title={source.name}>
              {source.name}
            </p>
            <p className="text-[12.5px] tabular-nums text-fg-3">
              {source.original.w}×{source.original.h} · {formatBytes(source.bytes)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <DropZone label={s.replace} onFiles={(files) => onFile(files[0])} className="rounded-full">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-fg/[0.07] px-3 text-[12.5px] font-semibold hover:bg-fg/[0.12]">
                  <MediaImagePlus width={14} height={14} /> {s.replace}
                </span>
              </DropZone>
              <Button size="sm" variant="subtle" className="h-8 px-2.5 text-[12.5px]" icon={<Trash width={14} height={14} />} onClick={onRemove}>
                {s.remove}
              </Button>
            </div>
          </div>
        </div>

        {source.scaled && <p className="-mt-2 text-[12.5px] text-fg-3">{f(s.scaled, { from: `${source.original.w}px`, to: `${source.w}px` })}</p>}

        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-medium">{s.projection}</p>
          <Segmented
            label={s.projection}
            value={flat ? "flat" : "pano"}
            onChange={(v) => onFlat(v === "flat")}
            options={[
              { value: "pano", label: s.projPano },
              { value: "flat", label: s.projFlat },
            ]}
          />
          <p className="text-[12.5px] leading-relaxed text-fg-3">{flat ? s.projFlatHint : s.projPanoHint}</p>
          {!flat && <Switch label={s.seam} hint={s.seamHint} checked={seam} onChange={onSeam} />}
          {!flat && Math.abs(ratio - 2) > 0.08 && (
            <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-warn">
              <WarningTriangle width={14} height={14} className="mt-0.5 shrink-0" /> {f(s.ratioWarn, { ratio: ratio.toFixed(2) })}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-medium">{s.sharp}</p>
            <span className={cn("text-[12.5px] font-semibold", tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-err")}>{label}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.08]" role="meter" aria-label={s.sharp} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, q) * 100)}>
            <div
              className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease)]", tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-err")}
              style={{ width: `${Math.max(6, Math.min(1, q) * 100)}%` }}
            />
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-3">{f(s.sharpDetail, { d: detail, t: faceSize, min: faceSize * (flat ? 2 : 4) })}</p>
        </div>
      </div>
    </CardBox>
  );
}

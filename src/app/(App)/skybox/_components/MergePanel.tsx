"use client";

import { useState } from "react";
import { ArrowRight, Download } from "iconoir-react";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import { saveBlob } from "../_lib/zip";

// 4096 per sisi (panorama 16384) hanya untuk plan dengan skyboxMaxFace ≥ 4096 (admin)
const SIZES = [512, 1024, 2048, 4096] as const;

export default function MergePanel({
  filled,
  busy,
  merged,
  onMerge,
  onUseInConvert,
  maxFace,
}: {
  filled: number;
  busy: boolean;
  merged: { blob: Blob; url: string } | null;
  onMerge: (faceSize: number) => void;
  onUseInConvert: () => void;
  /** ukuran sisi maksimal plan */
  maxFace: number;
}) {
  const { t } = useT();
  const s = t.skybox;
  const [size, setSize] = useState<number>(1024);

  return (
    <CardBox>
      <CardHeader title={s.merge} />
      <div className="flex flex-col gap-3 px-5 py-5">
        <p className="text-[14px] font-medium">{s.mergeWidth}</p>
        <Segmented label={s.mergeWidth} value={size} onChange={setSize} options={SIZES.filter((n) => n <= maxFace).map((n) => ({ value: n, label: `${n * 4}px` }))} />
        <p className="text-[12.5px] leading-relaxed text-fg-3">{s.mergeWidthHint}</p>
        <Button variant="primary" size="lg" className="mt-2 w-full" loading={busy} disabled={!filled} onClick={() => onMerge(size)}>
          {busy ? s.merging : s.merge}
        </Button>
        {merged && (
          <div className="rise mt-2 flex flex-col gap-2 border-t border-[var(--hairline)] pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={merged.url} alt={s.mergeDone} className="aspect-[2/1] w-full rounded-s bg-fg/[0.06] object-cover" />
            <Button variant="tonal" className="w-full" icon={<Download width={18} height={18} />} onClick={() => saveBlob(merged.blob, `skybox-panorama-${size * 4}.png`)}>
              {s.downloadPanorama}
            </Button>
            <Button variant="subtle" className="w-full" iconRight={<ArrowRight width={16} height={16} />} onClick={onUseInConvert}>
              {s.useInConvert}
            </Button>
          </div>
        )}
      </div>
    </CardBox>
  );
}

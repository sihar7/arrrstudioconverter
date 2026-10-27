"use client";

import { useRef, useState } from "react";
import { Download, Xmark } from "iconoir-react";
import { useMeQuery } from "@/store/api/baseApi";
import { usePlans } from "@/hooks/usePlans";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useAiModel } from "@/hooks/useAiModel";
import { MODELS } from "@/lib/ai/runtime";
import { baseName, canvasToBlob, drawScaled, fitWithin, nextFrame, saveBlob } from "@/lib/ai/image";
import { upscaleImage } from "@/lib/ai/pipelines";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import { SfEnlarge } from "@/components/icons/SfIcons";
import ImageToolFrame, { ModelLine, PlanCap, useImageSource, useResultUrl, type ImageSource } from "@/components/imagetools/ImageToolFrame";

type Scale = 2 | 4;

/** Upscale Real-ESRGAN per tile; hasil dibatasi sisi terpanjang plan (input diperkecil dulu bila perlu) */
export default function UpscaleScreen() {
  const { t, f } = useT();
  const s = t.upscale;
  const g = t.imgtools;
  const toast = useToast();
  const { data: me } = useMeQuery();
  const planId = me?.plan?.id ?? "free";
  const plan = usePlans().plans[planId];

  const model = useAiModel(MODELS.upscale);
  const { source, load, clear } = useImageSource();
  const [result, setResult] = useResultUrl();
  const [scale, setScale] = useState<Scale>(2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const cancelled = useRef(false);

  // Input diperkecil supaya hasil (input × skala) tidak melewati batas plan
  const plan4 = plan.upscaleScales.includes(4);
  const inSize = source ? fitWithin(source.w, source.h, Math.floor(plan.imageMaxSide / scale)) : null;
  const outSize = inSize ? { w: inSize.w * scale, h: inSize.h * scale } : null;
  const scaledFrom = source && inSize && inSize.w < source.w ? `${source.w}×${source.h}` : null;

  const run = async (src: ImageSource) => {
    if (!inSize) return;
    cancelled.current = false;
    setBusy(true);
    setProgress(0);
    setResult(null);
    try {
      const { session } = await model.ensure();
      await nextFrame();
      const input = drawScaled(src.bitmap, inSize.w, inSize.h);
      const out = await upscaleImage(session, input, scale, (p) => setProgress(p), () => cancelled.current);
      setResult(await canvasToBlob(out), out.width, out.height);
      toast(s.done, "ok");
    } catch (e) {
      if (!(e instanceof Error && e.message === "cancelled")) toast(g.failed, "err");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <ImageToolFrame
      title={s.title}
      sub={s.sub}
      source={source}
      onFile={(file) => {
        setResult(null);
        void load(file);
      }}
      onClear={() => {
        clear();
        setResult(null);
      }}
      resultUrl={result?.url}
      busy={busy}
      progress={progress}
      panel={
        <CardBox>
          <CardHeader title={s.scale} />
          <div className="flex flex-col gap-5 p-5">
            <Segmented
              label={s.scale}
              value={scale}
              onChange={(v) => {
                setScale(v);
                setResult(null);
              }}
              options={[
                { value: 2, label: "2×" },
                { value: 4, label: plan4 ? "4×" : `4× · ${t.plan.names.pro}`, disabled: !plan4 },
              ]}
            />
            <p className="-mt-2 text-[12.5px] leading-relaxed text-fg-3">{s.tip}</p>

            <div className="flex flex-col gap-1 border-t border-[var(--hairline)] pt-4">
              <p className="text-[14px] font-medium">{g.output}</p>
              <p className="text-[13px] tabular-nums text-fg-2">{outSize ? f(g.outputSize, outSize) : "—"}</p>
            </div>
            <PlanCap plan={planId} planName={t.plan.names[planId]} max={plan.imageMaxSide} scaledFrom={scaledFrom} top={planId === "studio"} />

            <div className="flex flex-col gap-2">
              {busy ? (
                <Button variant="ghost" size="lg" className="w-full" icon={<Xmark width={18} height={18} />} onClick={() => (cancelled.current = true)}>
                  {progress != null ? f(s.progress, { pct: Math.round(progress * 100) }) : g.processing} · {s.cancel}
                </Button>
              ) : (
                <Button variant="primary" size="lg" className="w-full" icon={<SfEnlarge size={20} />} disabled={!source} onClick={() => source && void run(source)}>
                  {result ? s.rerun : s.run}
                </Button>
              )}
              <Button
                variant="tonal"
                className="w-full"
                icon={<Download width={18} height={18} />}
                disabled={!result || busy}
                onClick={() => result && source && saveBlob(result.blob, `${baseName(source.file.name)}-${scale}x.png`)}
              >
                {g.download}
              </Button>
            </div>
            <ModelLine model={MODELS.upscale} state={model} />
          </div>
        </CardBox>
      }
    />
  );
}

"use client";

import { useRef, useState } from "react";
import { Download } from "iconoir-react";
import { useMeQuery } from "@/store/api/baseApi";
import { usePlans } from "@/hooks/usePlans";
import { isTopPlan, cheapestPlan } from "@/lib/schemas/plans";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useAiModel } from "@/hooks/useAiModel";
import { MODELS } from "@/lib/ai/runtime";
import { baseName, canvasToBlob, fitWithin, nextFrame, saveBlob } from "@/lib/ai/image";
import { composeCutout, predictMask, type Background } from "@/lib/ai/pipelines";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import ImageToolFrame, { ModelLine, PlanCap, useImageSource, useResultUrl, type ImageSource } from "@/components/imagetools/ImageToolFrame";

type BgMode = "transparent" | "white" | "color" | "blur";

const spec = (mode: BgMode, color: string): Background =>
  mode === "white" ? { kind: "color", color: "#ffffff" } : mode === "color" ? { kind: "color", color } : mode === "blur" ? { kind: "blur" } : { kind: "transparent" };

/** Hapus background: model jalan sekali per gambar, ganti latar hanya menggabung ulang (instan) */
export default function RemoveBgScreen() {
  const { t, f } = useT();
  const s = t.rmbg;
  const g = t.imgtools;
  const toast = useToast();
  const { data: me } = useMeQuery();
  const planId = me?.plan?.id ?? "free";
  const plan = usePlans().plans[planId];
  const fullBg = plan.imageBg === "full";
  // Admin: model presisi penuh + inferensi ganda + penyempurnaan tepi (lib/ai/pipelines predictMask)
  const pro = plan.imageAi === "pro";

  const model = useAiModel(pro ? MODELS.removeBgPro : MODELS.removeBg);
  const { source, load, clear } = useImageSource();
  const [result, setResult] = useResultUrl();
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState<BgMode>("transparent");
  const [color, setColor] = useState("#2f6fed");
  const mask = useRef<HTMLCanvasElement | null>(null);

  const compose = async (src: ImageSource, mode: BgMode, c: string) => {
    if (!mask.current) return;
    const out = composeCutout(src.bitmap, mask.current, spec(mode, c));
    setResult(await canvasToBlob(out), out.width, out.height);
  };

  const run = async (src: ImageSource) => {
    setBusy(true);
    setResult(null);
    mask.current = null;
    try {
      const { session } = await model.ensure();
      await nextFrame();
      const size = fitWithin(src.w, src.h, plan.imageMaxSide);
      mask.current = await predictMask(session, src.bitmap, size.w, size.h, { tta: pro, refine: pro });
      await compose(src, bg, color);
      toast(s.done, "ok");
    } catch {
      toast(g.failed, "err");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    const src = await load(file);
    if (src) await run(src);
  };

  const changeBg = (mode: BgMode) => {
    setBg(mode);
    if (source) void compose(source, mode, color);
  };
  const changeColor = (c: string) => {
    setColor(c);
    if (source && bg === "color") void compose(source, "color", c);
  };

  const size = source ? fitWithin(source.w, source.h, plan.imageMaxSide) : null;
  const scaledFrom = source && size && size.w < source.w ? `${source.w}×${source.h}` : null;
  const bgPlan = t.plan.names[cheapestPlan((p) => p.imageBg === "full")];
  const lock = (label: string) => (fullBg ? label : `${label} · ${bgPlan}`);

  return (
    <ImageToolFrame
      compareMode="after"
      title={s.title}
      sub={s.sub}
      source={source}
      onFile={(file) => void onFile(file)}
      onClear={() => {
        clear();
        setResult(null);
        mask.current = null;
      }}
      resultUrl={result?.url}
      busy={busy}
      panel={
        <CardBox>
          <CardHeader title={s.background} />
          <div className="flex flex-col gap-5 p-5">
            <Segmented
              label={s.background}
              value={bg}
              onChange={changeBg}
              options={[
                { value: "transparent", label: s.bg.transparent },
                { value: "white", label: s.bg.white },
                { value: "color", label: lock(s.bg.color), disabled: !fullBg },
                { value: "blur", label: lock(s.bg.blur), disabled: !fullBg },
              ]}
            />
            {bg === "color" && (
              <label className="flex items-center justify-between gap-3 text-[14px] font-medium">
                {s.color}
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] uppercase text-fg-3">{color}</span>
                  <input type="color" value={color} onChange={(e) => changeColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-s border border-line bg-transparent" />
                </span>
              </label>
            )}
            {!fullBg && (
              <p className="-mt-2 text-[12.5px] text-fg-3">
                {f(g.locked, { plan: bgPlan })}: {s.bg.color} & {s.bg.blur}
              </p>
            )}

            <div className="flex flex-col gap-1 border-t border-[var(--hairline)] pt-4">
              <p className="text-[14px] font-medium">{g.output}</p>
              <p className="text-[13px] tabular-nums text-fg-2">{size ? f(g.outputSize, size) : "—"}</p>
            </div>
            {pro && (
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" /> {g.proMode}
                </p>
                <p className="text-[12.5px] leading-relaxed text-fg-3">{s.proHint}</p>
              </div>
            )}
            <PlanCap plan={planId} planName={t.plan.names[planId]} max={plan.imageMaxSide} scaledFrom={scaledFrom} top={isTopPlan(planId)} />

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={<Download width={18} height={18} />}
                disabled={!result || busy}
                onClick={() => result && source && saveBlob(result.blob, `${baseName(source.file.name)}-no-bg.png`)}
              >
                {g.download}
              </Button>
              {source && (
                <Button variant="ghost" className="w-full" loading={busy} onClick={() => void run(source)}>
                  {busy ? g.processing : s.rerun}
                </Button>
              )}
            </div>
            <ModelLine model={MODELS.removeBg} state={model} />
          </div>
        </CardBox>
      }
    />
  );
}

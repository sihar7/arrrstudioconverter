"use client";

import { Undo } from "iconoir-react";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";
import Segmented from "@/components/ui/Segmented";
import { SfCube } from "@/components/icons/SfIcons";
import Spinner from "@/components/ui/Spinner";
import { DEFAULT_ADJUST, type SkyAdjust } from "../_lib/skyGl";

const FACE_SIZES = [512, 1024, 2048] as const;
const deg = (v: number) => `${v > 0 ? "+" : ""}${v}°`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`;

export default function AdjustPanel({
  adjust,
  onAdjust,
  size,
  onSize,
  disabled,
  busy,
  hasResult,
}: {
  adjust: SkyAdjust;
  onAdjust: (a: SkyAdjust) => void;
  size: number;
  onSize: (n: number) => void;
  disabled: boolean;
  busy: boolean;
  hasResult: boolean;
}) {
  const { t } = useT();
  const s = t.skybox;
  const set = <K extends keyof SkyAdjust>(k: K) => (v: number) => onAdjust({ ...adjust, [k]: v });
  const dirty = JSON.stringify(adjust) !== JSON.stringify(DEFAULT_ADJUST);

  const slider = (k: keyof SkyAdjust, label: string, min: number, max: number, step: number, format: (v: number) => string) => (
    <Slider label={label} value={adjust[k]} min={min} max={max} step={step} defaultValue={DEFAULT_ADJUST[k]} onChange={set(k)} format={format} disabled={disabled} />
  );

  return (
    <CardBox>
      <CardHeader
        title={s.direction}
        aside={
          <Button size="sm" variant="subtle" icon={<Undo width={16} height={16} />} disabled={!dirty || disabled} onClick={() => onAdjust(DEFAULT_ADJUST)}>
            {s.resetAll}
          </Button>
        }
      />
      <div className="flex flex-col gap-5 px-5 py-5">
        {slider("yaw", s.yaw, -180, 180, 1, deg)}
        {slider("horizon", s.horizon, -30, 30, 0.5, deg)}
      </div>

      <p className="caps border-t border-[var(--hairline)] px-5 pb-1 pt-5 text-fg-3">{s.color}</p>
      <div className="flex flex-col gap-5 px-5 pb-5 pt-3">
        {slider("brightness", s.brightness, 0.5, 1.5, 0.01, pct)}
        {slider("contrast", s.contrast, 0.5, 1.5, 0.01, pct)}
        {slider("saturation", s.saturation, 0, 2, 0.01, pct)}
        {slider("temperature", s.temperature, -1, 1, 0.01, signed)}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--hairline)] px-5 py-5">
        <p className="text-[14px] font-medium">{s.faceSize}</p>
        <Segmented label={s.faceSize} value={size} onChange={onSize} options={FACE_SIZES.map((n) => ({ value: n, label: `${n}px` }))} />
        <p className="text-[12.5px] leading-relaxed text-fg-3">{s.faceSizeHint}</p>
        {/* Convert otomatis — tidak perlu tombol; cukup status */}
        {!disabled && (
          <p role="status" className="mt-2 flex items-center gap-2 text-[13px] text-fg-2">
            {busy ? <Spinner className="size-3.5" /> : <SfCube size={16} />}
            {busy ? s.converting : hasResult ? s.autoDone : s.converting}
          </p>
        )}
      </div>
    </CardBox>
  );
}

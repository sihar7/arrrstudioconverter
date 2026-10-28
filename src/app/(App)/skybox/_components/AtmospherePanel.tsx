"use client";

import { Undo } from "iconoir-react";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";
import Switch from "@/components/ui/Switch";
import type { SkyAtmosphere } from "../_lib/atmosphere";

type Rgb = SkyAtmosphere["color"];
type NumKey = "density" | "offset" | "glare" | "haze";

const toHex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const fromHex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const fixed = (v: number) => v.toFixed(2);

/** Atmosphere yang menyertai skybox: nilai awal otomatis dari warna langit, semua bisa diatur */
export default function AtmospherePanel({
  value,
  auto,
  on,
  onToggle,
  onChange,
}: {
  value: SkyAtmosphere;
  auto: SkyAtmosphere;
  on: boolean;
  onToggle: (v: boolean) => void;
  onChange: (a: SkyAtmosphere) => void;
}) {
  const { t } = useT();
  const s = t.skybox;
  const dirty = JSON.stringify(value) !== JSON.stringify(auto);

  const slider = (k: NumKey, label: string, max: number, step: number) => (
    <Slider label={label} value={value[k]} min={0} max={max} step={step} defaultValue={auto[k]} onChange={(v) => onChange({ ...value, [k]: v })} format={fixed} disabled={!on} />
  );
  const swatch = (k: "color" | "decay", label: string) => (
    <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-s bg-fg/[0.05] px-3 py-2.5 transition-colors hover:bg-fg/[0.08] has-[:disabled]:cursor-default has-[:disabled]:opacity-45">
      <input
        type="color"
        value={toHex(value[k])}
        disabled={!on}
        onChange={(e) => onChange({ ...value, [k]: fromHex(e.target.value) })}
        className="size-8 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0 disabled:cursor-default [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
      />
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{label}</span>
        <span className="block font-mono text-[12px] uppercase text-fg-3">{toHex(value[k])}</span>
      </span>
    </label>
  );

  return (
    <CardBox>
      <CardHeader
        title={s.atmosphere}
        aside={
          <Button size="sm" variant="subtle" icon={<Undo width={16} height={16} />} disabled={!dirty || !on} onClick={() => onChange(auto)}>
            {s.atmoAuto}
          </Button>
        }
      />
      <div className="flex flex-col gap-5 px-5 py-5">
        <Switch label={s.atmoInclude} hint={s.atmoHint} checked={on} onChange={onToggle} />
        <div className="flex flex-wrap gap-2">
          {swatch("color", s.atmoColor)}
          {swatch("decay", s.atmoDecay)}
        </div>
        {slider("density", s.atmoDensity, 1, 0.01)}
        {slider("offset", s.atmoOffset, 1, 0.01)}
        {slider("haze", s.atmoHaze, 10, 0.1)}
        {slider("glare", s.atmoGlare, 10, 0.05)}
      </div>
    </CardBox>
  );
}

"use client";

import { Undo } from "iconoir-react";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";
import Switch from "@/components/ui/Switch";
import type { SkyAtmosphere } from "../_lib/atmosphere";

type Rgb = SkyAtmosphere["color"];
type NumKey = "density" | "offset" | "glare" | "haze" | "clockTime" | "latitude" | "ccBrightness" | "ccContrast" | "ccSaturation";
type ColorKey = "color" | "decay" | "ccTint";

const toHex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const fromHex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const fixed = (v: number) => v.toFixed(2);
const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
const clock = (v: number) => `${String(Math.floor(v)).padStart(2, "0")}:${String(Math.round((v % 1) * 60) % 60).padStart(2, "0")}`;
const deg = (v: number) => `${v.toFixed(1)}°`;

/** Paket pencahayaan skybox: nilai awal otomatis dari tema langit (siang/senja/malam), semua bisa diatur */
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

  const slider = (k: NumKey, label: string, min: number, max: number, step: number, format = fixed) => (
    <Slider label={label} value={value[k]} min={min} max={max} step={step} defaultValue={auto[k]} onChange={(v) => onChange({ ...value, [k]: v })} format={format} disabled={!on} />
  );
  /** `idle` = alasan properti belum berpengaruh (aturan Roblox), ditampilkan di bawah nilai */
  const swatch = (k: ColorKey, label: string, idle: string | null = null) => (
    <label className="flex min-w-[140px] flex-1 cursor-pointer items-center gap-3 rounded-s bg-fg/[0.05] px-3 py-2.5 transition-colors hover:bg-fg/[0.08] has-[:disabled]:cursor-default has-[:disabled]:opacity-45">
      <input
        type="color"
        value={toHex(value[k])}
        disabled={!on}
        onChange={(e) => onChange({ ...value, [k]: fromHex(e.target.value) })}
        className="size-8 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0 disabled:cursor-default [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
      />
      <span className="min-w-0">
        <span className="block text-[14px] font-medium">{label}</span>
        <span className="block font-mono text-[12px] text-fg-3">{value[k].join(", ")}</span>
        {idle && on && <span className="mt-0.5 block text-[11.5px] leading-snug text-warn">{idle}</span>}
      </span>
    </label>
  );
  const section = (title: string) => <p className="caps border-t border-[var(--hairline)] px-5 pb-1 pt-5 text-fg-3">{title}</p>;

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
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-center gap-2 text-[13px] text-fg-2">
          {s.atmoTheme} <Badge tone="neutral">{s.atmoThemes[auto.theme]}</Badge>
        </div>
        <Switch label={s.atmoInclude} hint={s.atmoHint} checked={on} onChange={onToggle} />
      </div>

      {/* Urutan & grup sama dengan panel Properties Atmosphere di Studio */}
      {section("Atmosphere · Appearance")}
      <div className="flex flex-col gap-5 px-5 pb-5 pt-3">
        {slider("density", "Density", 0, 1, 0.001)}
        {slider("offset", "Offset", 0, 1, 0.01)}
      </div>
      {section("Atmosphere · State")}
      <div className="flex flex-col gap-5 px-5 pb-5 pt-3">
        <div className="flex flex-wrap gap-2">
          {swatch("color", "Color", value.haze > 0 ? null : s.atmoNeedHaze)}
          {swatch("decay", "Decay", value.haze > 0 && value.glare > 0 ? null : s.atmoNeedHazeGlare)}
        </div>
        {slider("glare", "Glare", 0, 10, 0.01)}
        {value.haze <= 0 && value.glare > 0 && <p className="-mt-3 text-[12.5px] text-warn">{s.atmoNeedHaze}</p>}
        {slider("haze", "Haze", 0, 10, 0.1)}
      </div>

      {section("Lighting")}
      <div className="flex flex-col gap-5 px-5 pb-5 pt-3">
        {slider("clockTime", "ClockTime", 0, 24, 0.1, clock)}
        {slider("latitude", "GeographicLatitude", -180, 360, 1, deg)}
        <Switch label="Bloom & SunRays" hint={s.atmoEffectsHint} checked={value.effects} onChange={(v) => onChange({ ...value, effects: v })} disabled={!on} />
      </div>

      {section("ColorCorrection")}
      <div className="flex flex-col gap-5 px-5 pb-5 pt-3">
        {swatch("ccTint", "TintColor")}
        {slider("ccBrightness", "Brightness", -0.5, 0.5, 0.01, signed)}
        {slider("ccContrast", "Contrast", -0.5, 0.5, 0.01, signed)}
        {slider("ccSaturation", "Saturation", -1, 1, 0.01, signed)}
      </div>
    </CardBox>
  );
}

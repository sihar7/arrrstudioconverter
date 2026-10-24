"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, NavArrowDown } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { applyPreset, resetOptions, setAutoUpload, setOptions } from "@/store/slices/converterSlice";
import { updateRoblox } from "@/store/slices/robloxSlice";
import { useMeQuery } from "@/store/api/baseApi";
import { DEFAULT_OPTIONS, LIMITS, type AudioOptions } from "@/lib/schemas/convert.schema";
import { cn, formatDuration, parseTime } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Segmented from "@/components/ui/Segmented";
import Slider from "@/components/ui/Slider";
import Switch from "@/components/ui/Switch";
import Field, { Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { BITRATE_OPTIONS, FORMAT_OPTIONS, PRESET_ORDER, SPEED_QUICK } from "../_constants/converter.constants";
import { dbLabel, secLabel, semiLabel, speedLabel } from "../_utils/helpers";

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line/70 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="state-layer flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left text-fg"
      >
        <span className="caps text-[11px] text-fg-2">{title}</span>
        <NavArrowDown width={16} height={16} className={cn("text-fg-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-5 px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Input waktu m:ss yang baru diterapkan saat blur / Enter (di-remount via key saat nilai luar berubah) */
function TimeInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(value == null ? "" : formatDuration(value));
  const [err, setErr] = useState(false);
  const commit = () => {
    const v = parseTime(text);
    if (v != null && Number.isNaN(v)) return setErr(true);
    setErr(false);
    onCommit(v);
  };
  return (
    <Field label={label}>
      {({ id }) => (
        <Input
          id={id}
          inputMode="numeric"
          placeholder="0:00"
          value={text}
          aria-invalid={err}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="font-mono"
        />
      )}
    </Field>
  );
}

export default function SettingsPanel() {
  const dispatch = useAppDispatch();
  const converter = useAppSelector((s) => s.converter);
  const roblox = useAppSelector((s) => s.roblox);
  const { data: me } = useMeQuery();
  // Selama hydration pakai nilai default (sama dengan HTML server); preferensi tersimpan & sesi dipakai setelahnya
  const hydrated = useHydrated();
  const o = hydrated ? converter.options : DEFAULT_OPTIONS;
  const preset = hydrated ? converter.preset : "normal";
  const autoUpload = hydrated && converter.autoUpload;
  const autoPermission = converter.autoPermission;
  const { t } = useT();
  const p = t.converter.panel;
  const set = (patch: Partial<AudioOptions>) => dispatch(setOptions(patch));
  const lossless = o.format === "wav" || o.format === "flac";
  const canAuto = hydrated && Boolean(me?.user && roblox.apiKey && roblox.creatorId);

  return (
    <CardBox as="aside" className="rise overflow-hidden [animation-delay:120ms] lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col">
      <CardHeader step={2} title={t.converter.guide[1].title} aside={<span className="caps text-[10px] text-fg-3">{t.converter.optional}</span>} />
      <div className="thin-scroll lg:overflow-y-auto">
        <Section title={p.presets}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={p.presets}>
            {PRESET_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={preset === id}
                onClick={() => dispatch(applyPreset(id))}
                className={cn(
                  "state-layer inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-s border px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform,padding] duration-200 active:scale-[0.96]",
                  preset === id ? "border-transparent bg-tonal pl-2 text-on-tonal" : "border-line-2 text-fg-2 hover:text-fg",
                )}
              >
                {preset === id && <Check width={16} height={16} aria-hidden="true" />}
                {t.converter.presetNames[id]}
              </button>
            ))}
          </div>
        </Section>

        <Section title={p.output}>
          <Segmented label={p.format} value={o.format} options={FORMAT_OPTIONS} onChange={(format) => set({ format })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={p.bitrate}>
              {({ id }) => (
                <Select id={id} value={o.bitrate} disabled={lossless} onChange={(e) => set({ bitrate: Number(e.target.value) as AudioOptions["bitrate"] })}>
                  {BITRATE_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={p.sampleRate}>
              {({ id }) => (
                <Select id={id} value={o.sampleRate} onChange={(e) => set({ sampleRate: Number(e.target.value) as AudioOptions["sampleRate"] })}>
                  <option value={44100}>44.1 kHz</option>
                  <option value={48000}>48 kHz</option>
                </Select>
              )}
            </Field>
          </div>
          <Switch label={p.compress} hint={p.compressHint} checked={o.compress} onChange={(compress) => set({ compress })} />
          <Switch label={p.mono} hint={p.monoHint} checked={o.mono} onChange={(mono) => set({ mono })} />
        </Section>

        <Section title={p.tempo}>
          <Slider label={p.speed} {...LIMITS.speed} value={o.speed} defaultValue={1} format={speedLabel} onChange={(speed) => set({ speed })} />
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {SPEED_QUICK.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ speed: s })}
                className={cn(
                  "state-layer h-8 cursor-pointer rounded-full border px-3 font-mono text-[12px] transition-colors",
                  Math.abs(o.speed - s) < 1e-6 ? "border-transparent bg-accent text-on-accent" : "border-line-2 text-fg-2 hover:text-fg",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
          <Switch label={p.preservePitch} hint={p.preservePitchHint} checked={o.preservePitch} onChange={(preservePitch) => set({ preservePitch })} />
          <Slider label={p.pitch} {...LIMITS.pitch} value={o.pitch} defaultValue={0} format={semiLabel} onChange={(pitch) => set({ pitch })} />
        </Section>

        <Section title={p.effects} defaultOpen={false}>
          <Slider label={p.bass} {...LIMITS.bass} value={o.bass} defaultValue={0} format={dbLabel} onChange={(bass) => set({ bass })} />
          <Slider label={p.treble} {...LIMITS.treble} value={o.treble} defaultValue={0} format={dbLabel} onChange={(treble) => set({ treble })} />
          <Slider label={p.reverb} {...LIMITS.reverb} value={o.reverb} defaultValue={0} format={(v) => `${v}%`} onChange={(reverb) => set({ reverb })} />
          <Slider label={p.volume} {...LIMITS.volume} value={o.volume} defaultValue={0} format={dbLabel} onChange={(volume) => set({ volume })} />
          <Switch label={p.spatial8d} checked={o.spatial8d} onChange={(spatial8d) => set({ spatial8d })} />
          <Switch label={p.normalize} hint={p.normalizeHint} checked={o.normalize} onChange={(normalize) => set({ normalize })} />
        </Section>

        <Section title={p.fadeTrim} defaultOpen={false}>
          <Slider label={p.fadeIn} {...LIMITS.fade} value={o.fadeIn} defaultValue={0} format={secLabel} onChange={(fadeIn) => set({ fadeIn })} />
          <Slider label={p.fadeOut} {...LIMITS.fade} value={o.fadeOut} defaultValue={0} format={secLabel} onChange={(fadeOut) => set({ fadeOut })} />
          <div className="grid grid-cols-2 gap-3">
            <TimeInput key={`s${o.trimStart}`} label={p.trimStart} value={o.trimStart} onCommit={(trimStart) => set({ trimStart })} />
            <TimeInput key={`e${o.trimEnd}`} label={p.trimEnd} value={o.trimEnd} onCommit={(trimEnd) => set({ trimEnd })} />
          </div>
          <p className="-mt-2 text-[12.5px] leading-relaxed text-fg-3">{p.trimHint}</p>
        </Section>

        <Section title={p.roblox} defaultOpen={false}>
          <Switch
            label={p.autoUpload}
            hint={canAuto ? undefined : p.autoUploadHint}
            checked={autoUpload && canAuto}
            disabled={!canAuto}
            onChange={(enabled) => dispatch(setAutoUpload({ enabled }))}
          />
          {canAuto && autoUpload && (
            <>
              <Segmented
                label={t.upload.permission}
                value={autoPermission}
                options={[
                  { value: "none", label: t.upload.permNone },
                  { value: "place", label: t.upload.permPlace },
                  { value: "public", label: t.upload.permPublic },
                ]}
                onChange={(permission) => dispatch(setAutoUpload({ permission }))}
              />
              {autoPermission === "place" && (
                <Field label={t.upload.placeId}>
                  {({ id }) => (
                    <Input
                      id={id}
                      inputMode="numeric"
                      value={roblox.placeId}
                      onChange={(e) => dispatch(updateRoblox({ placeId: e.target.value.replace(/\D/g, "") }))}
                      className="font-mono"
                    />
                  )}
                </Field>
              )}
            </>
          )}
          {!canAuto && (
            <Link href="/settings" className="text-[13px] font-semibold text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
              {p.setupKey}
            </Link>
          )}
        </Section>

        <div className="p-5">
          <Button
            variant="subtle"
            size="sm"
            className="w-full"
            disabled={JSON.stringify(o) === JSON.stringify(DEFAULT_OPTIONS)}
            onClick={() => dispatch(resetOptions())}
          >
            {p.resetAll}
          </Button>
        </div>
      </div>
    </CardBox>
  );
}

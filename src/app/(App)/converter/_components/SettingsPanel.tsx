"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Check, CheckCircle, FloppyDisk, Refresh, Sparks, WarningTriangle, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  applyCustomPreset,
  applyPreset,
  deletePreset,
  MAX_CUSTOM_PRESETS,
  resetOptions,
  savePreset,
  setAutoUpload,
  setOptions,
} from "@/store/slices/converterSlice";
import { updateRoblox } from "@/store/slices/robloxSlice";
import { useMeQuery } from "@/store/api/baseApi";
import { DEFAULT_OPTIONS, LIMITS, ROBLOX_FORMATS, type AudioOptions } from "@/lib/schemas/convert.schema";
import { summarize } from "@/lib/audioSummary";
import { cn, formatBytes, formatDuration, parseTime } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useHydrated } from "@/hooks/useHydrated";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Segmented from "@/components/ui/Segmented";
import Slider from "@/components/ui/Slider";
import Switch from "@/components/ui/Switch";
import Field, { Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import { BITRATE_OPTIONS, FORMAT_OPTIONS, PRESET_ORDER, SPEED_QUICK } from "../_constants/converter.constants";
import { dbLabel, estimateBytes, secLabel, semiLabel, speedLabel } from "../_utils/helpers";
import RobloxTempoCard from "./RobloxTempoCard";

type Tab = "preset" | "output" | "tempo" | "effects" | "trim";
const TABS: Tab[] = ["preset", "output", "tempo", "effects", "trim"];
const ROBLOX_OPTIMAL: Partial<AudioOptions> = { format: "mp3", bitrate: 192, sampleRate: 44100, compress: true };

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

/** Ubin preset: nama + deskripsi singkat; aktif = garis bawah aksen + centang */
function PresetTile({
  name,
  desc,
  active,
  onClick,
  onDelete,
  deleteLabel,
  className,
}: {
  name: string;
  desc: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "state-layer relative flex h-[60px] w-full cursor-pointer flex-col items-start justify-center overflow-hidden rounded-s border px-3 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.97]",
          active ? "border-fg-3 bg-raised" : "border-line hover:border-line-2",
          onDelete && "pr-9",
        )}
      >
        <span className="flex w-full items-center gap-1.5 text-[13.5px] font-semibold text-fg">
          <span className="truncate">{name}</span>
          {active && <Check width={14} height={14} strokeWidth={2.2} aria-hidden="true" className="pick-pop shrink-0" />}
        </span>
        <span className="mt-0.5 w-full truncate text-[11.5px] text-fg-3">{desc}</span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-300 ease-[var(--ease)]",
            active ? "scale-x-100" : "scale-x-0",
          )}
        />
      </button>
      {onDelete && (
        <IconButton
          label={deleteLabel ?? ""}
          size="sm"
          icon={<Xmark width={14} height={14} />}
          onClick={onDelete}
          className="absolute right-0 top-1/2 size-9 -translate-y-1/2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
        />
      )}
    </div>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      {title && <p className="caps text-[10.5px] text-fg-3">{title}</p>}
      {children}
    </div>
  );
}

export default function SettingsPanel() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const converter = useAppSelector((s) => s.converter);
  const roblox = useAppSelector((s) => s.roblox);
  const { data: me } = useMeQuery();
  // Selama hydration pakai nilai default (sama dengan HTML server); preferensi tersimpan & sesi dipakai setelahnya
  const hydrated = useHydrated();
  const o = hydrated ? converter.options : DEFAULT_OPTIONS;
  const preset = hydrated ? converter.preset : "normal";
  const customPresets = hydrated ? converter.customPresets : [];
  const autoUpload = hydrated && converter.autoUpload;
  const autoPermission = converter.autoPermission;
  const { t, f } = useT();
  const c = t.converter;
  const p = c.panel;
  const [tab, setTab] = useState<Tab>("preset");
  const [presetName, setPresetName] = useState("");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const set = (patch: Partial<AudioOptions>) => dispatch(setOptions(patch));
  const lossless = o.format === "wav" || o.format === "flac";
  const canAuto = hydrated && Boolean(me?.user && roblox.apiKey && roblox.creatorId);
  const isDefault = JSON.stringify(o) === JSON.stringify(DEFAULT_OPTIONS);
  const robloxOk = (ROBLOX_FORMATS as readonly string[]).includes(o.format);
  const chips = summarize(o, t);
  const presetLabel = preset.startsWith("u:")
    ? customPresets.find((cp) => `u:${cp.id}` === preset)?.name
    : preset === "custom"
      ? c.modified
      : c.presetNames[preset as keyof typeof c.presetNames];

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = (TABS.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[i]);
    tabRefs.current[i]?.focus();
  };

  const save = () => {
    const name = presetName.trim();
    if (!name) return;
    dispatch(savePreset(name));
    setPresetName("");
    toast(f(c.presetSaved, { name }), "ok");
  };

  return (
    <CardBox as="aside" className="rise flex flex-col overflow-hidden [animation-delay:120ms] lg:max-h-[calc(100dvh-7rem)]">
      <CardHeader
        step={2}
        title={c.guide[1].title}
        aside={
          <Button variant="subtle" size="sm" disabled={isDefault} onClick={() => dispatch(resetOptions())} icon={<Refresh width={14} height={14} />} className="-mr-3 h-9 px-3">
            {p.resetAll}
          </Button>
        }
      />

      {/* Ringkasan setelan aktif — selalu terlihat apa pun tab-nya */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line/70 px-5 py-3" aria-live="polite">
        <span className="inline-flex h-7 items-center rounded-xs bg-accent px-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-on-accent">
          {presetLabel ?? c.modified}
        </span>
        <span className="inline-flex h-7 items-center rounded-xs bg-raised px-2 font-mono text-[11.5px] text-fg-2">
          {o.format.toUpperCase()} · {lossless ? `${o.sampleRate / 1000} kHz` : `${o.bitrate} kbps`}
          {o.mono && " · Mono"}
        </span>
        {chips.map((ch) => (
          <span key={ch} className="inline-flex h-7 items-center rounded-xs bg-raised px-2 font-mono text-[11.5px] text-fg-2">
            {ch}
          </span>
        ))}
      </div>

      {/* Tab — aktif = garis bawah (konvensi navbar) */}
      <div role="tablist" aria-label={c.guide[1].title} onKeyDown={onTabKey} className="grid grid-cols-5 border-b border-line/70 px-2">
        {TABS.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={cn(
              "state-layer relative h-12 cursor-pointer truncate px-1 text-[12.5px] font-semibold transition-colors duration-200",
              tab === id ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {c.tabs[id]}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 origin-center bg-accent transition-transform duration-300 ease-[var(--ease)]",
                tab === id ? "scale-x-100" : "scale-x-0",
              )}
            />
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} key={tab} className="thin-scroll fade-swap flex min-h-[300px] flex-1 flex-col gap-6 overflow-y-auto p-5">
        {tab === "preset" && (
          <>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={p.presets}>
              {PRESET_ORDER.map((id, n) => (
                <PresetTile
                  key={id}
                  name={c.presetNames[id]}
                  desc={c.presetDesc[id]}
                  active={preset === id}
                  onClick={() => dispatch(applyPreset(id))}
                  className={PRESET_ORDER.length % 2 && n === PRESET_ORDER.length - 1 ? "col-span-2" : undefined}
                />
              ))}
            </div>

            <Group title={c.myPresets}>
              {customPresets.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {customPresets.map((cp) => (
                    <PresetTile
                      key={cp.id}
                      name={cp.name}
                      desc={summarize(cp.options, t).join(" · ") || `${cp.options.format.toUpperCase()} · ${p.summaryNone}`}
                      active={preset === `u:${cp.id}`}
                      onClick={() => dispatch(applyCustomPreset(cp.id))}
                      onDelete={() => dispatch(deletePreset(cp.id))}
                      deleteLabel={f(c.deletePreset, { name: cp.name })}
                    />
                  ))}
                </div>
              ) : (
                <p className="-mt-1 text-[13px] leading-relaxed text-fg-3">{c.noCustom}</p>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <Input
                  aria-label={c.presetName}
                  placeholder={c.presetName}
                  maxLength={24}
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  disabled={customPresets.length >= MAX_CUSTOM_PRESETS && !customPresets.some((cp) => cp.name.toLowerCase() === presetName.trim().toLowerCase())}
                  className="h-10 text-[14px]"
                />
                <Button type="submit" variant="tonal" size="sm" disabled={!presetName.trim()} icon={<FloppyDisk width={16} height={16} />} className="shrink-0">
                  {c.savePreset}
                </Button>
              </form>
            </Group>
          </>
        )}

        {tab === "output" && (
          <>
            <Segmented label={p.format} value={o.format} options={FORMAT_OPTIONS} onChange={(format) => set({ format })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={p.bitrate}>
                {({ id }) => (
                  <Select id={id} value={o.bitrate} disabled={lossless} onChange={(e) => set({ bitrate: Number(e.target.value) as AudioOptions["bitrate"] })} className="h-11">
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
                  <Select id={id} value={o.sampleRate} onChange={(e) => set({ sampleRate: Number(e.target.value) as AudioOptions["sampleRate"] })} className="h-11">
                    <option value={44100}>44.1 kHz</option>
                    <option value={48000}>48 kHz</option>
                  </Select>
                )}
              </Field>
            </div>
            <Switch label={p.compress} hint={p.compressHint} checked={o.compress} onChange={(compress) => set({ compress })} />
            <Switch label={p.mono} hint={p.monoHint} checked={o.mono} onChange={(mono) => set({ mono })} />
            <button
              type="button"
              onClick={() => set(ROBLOX_OPTIMAL)}
              className="state-layer flex cursor-pointer items-start gap-3 rounded-s border border-dashed border-line-2 p-3 text-left transition-colors hover:border-fg-3"
            >
              <Sparks width={18} height={18} aria-hidden="true" className="mt-0.5 shrink-0 text-fg" />
              <span>
                <span className="block text-[13.5px] font-semibold text-fg">{c.optimizeRoblox}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-fg-3">{c.optimizeRobloxHint}</span>
              </span>
            </button>
        <div className="border-t border-line/60 pt-5">
          <Switch
            label={p.autoUpload}
            hint={canAuto ? undefined : p.autoUploadHint}
            checked={autoUpload && canAuto}
            disabled={!canAuto}
            onChange={(enabled) => dispatch(setAutoUpload({ enabled }))}
          />
          {canAuto && autoUpload && (
            <div className="mt-4 flex flex-col gap-3">
              <Segmented
                size="sm"
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
                <Input
                  aria-label={t.upload.placeId}
                  placeholder={t.upload.placeId}
                  inputMode="numeric"
                  value={roblox.placeId}
                  onChange={(e) => dispatch(updateRoblox({ placeId: e.target.value.replace(/\D/g, "") }))}
                  className="h-10 font-mono text-[14px]"
                />
              )}
            </div>
          )}
          {!canAuto && (
            <Link href="/settings" className="mt-2 inline-block text-[13px] font-semibold text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
              {p.setupKey}
            </Link>
          )}
        </div>
          </>
        )}

        {tab === "tempo" && (
          <>
            <Group>
              <Slider label={p.speed} {...LIMITS.speed} value={o.speed} defaultValue={1} format={speedLabel} onChange={(speed) => set({ speed })} />
              <div className="-mt-1 grid grid-cols-5 gap-1.5">
                {SPEED_QUICK.map((s) => {
                  const on = Math.abs(o.speed - s) < 1e-6;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ speed: s })}
                      className={cn(
                        "state-layer h-9 cursor-pointer rounded-xs border font-mono text-[12px] transition-colors active:scale-[0.96]",
                        on ? "btn-plate border-transparent bg-accent text-on-accent" : "border-line text-fg-2 hover:border-line-2 hover:text-fg",
                      )}
                    >
                      {s}×
                    </button>
                  );
                })}
              </div>
            </Group>
            <Switch label={p.preservePitch} hint={p.preservePitchHint} checked={o.preservePitch} onChange={(preservePitch) => set({ preservePitch })} />
            <Slider label={p.pitch} {...LIMITS.pitch} value={o.pitch} defaultValue={0} format={semiLabel} onChange={(pitch) => set({ pitch })} />
            <RobloxTempoCard options={o} />
          </>
        )}

        {tab === "effects" && (
          <>
            <Slider label={p.bass} {...LIMITS.bass} value={o.bass} defaultValue={0} format={dbLabel} onChange={(bass) => set({ bass })} />
            <Slider label={p.treble} {...LIMITS.treble} value={o.treble} defaultValue={0} format={dbLabel} onChange={(treble) => set({ treble })} />
            <Slider label={p.reverb} {...LIMITS.reverb} value={o.reverb} defaultValue={0} format={(v) => `${v}%`} onChange={(reverb) => set({ reverb })} />
            <Slider label={p.volume} {...LIMITS.volume} value={o.volume} defaultValue={0} format={dbLabel} onChange={(volume) => set({ volume })} />
            <Switch label={p.spatial8d} checked={o.spatial8d} onChange={(spatial8d) => set({ spatial8d })} />
            <Switch label={p.normalize} hint={p.normalizeHint} checked={o.normalize} onChange={(normalize) => set({ normalize })} />
          </>
        )}

        {tab === "trim" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TimeInput key={`s${o.trimStart}`} label={p.trimStart} value={o.trimStart} onCommit={(trimStart) => set({ trimStart })} />
              <TimeInput key={`e${o.trimEnd}`} label={p.trimEnd} value={o.trimEnd} onCommit={(trimEnd) => set({ trimEnd })} />
            </div>
            <p className="-mt-3 text-[12.5px] leading-relaxed text-fg-3">{p.trimHint}</p>
            <Slider label={p.fadeIn} {...LIMITS.fade} value={o.fadeIn} defaultValue={0} format={secLabel} onChange={(fadeIn) => set({ fadeIn })} />
            <Slider label={p.fadeOut} {...LIMITS.fade} value={o.fadeOut} defaultValue={0} format={secLabel} onChange={(fadeOut) => set({ fadeOut })} />
          </>
        )}
      </div>

      {/* Kaki panel: perkiraan ukuran + cek kecocokan Roblox (satu baris) */}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line/70 bg-bg/40 px-5 py-3 text-[12.5px]">
        <span className="font-mono tabular-nums text-fg-2" title={c.estimateLabel}>
          {f(c.estimate, { size: formatBytes(estimateBytes(o, 240)) })}
        </span>
        {robloxOk ? (
          <span className="flex items-center gap-1.5 text-ok">
            <CheckCircle width={15} height={15} aria-hidden="true" /> {c.robloxReady}
          </span>
        ) : (
          <button type="button" onClick={() => set({ format: "mp3" })} className="state-layer flex cursor-pointer items-center gap-1.5 rounded-xs px-1 text-warn" title={c.robloxFix}>
            <WarningTriangle width={15} height={15} aria-hidden="true" /> {c.robloxFormatBad} · <span className="underline underline-offset-2">{c.robloxFix}</span>
          </button>
        )}
      </div>
    </CardBox>
  );
}

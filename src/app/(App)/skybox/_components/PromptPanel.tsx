"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, WarningTriangle } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Field, { inputClass } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import { PLACEHOLDER, PROMPT_PRESETS, PROMPT_SOFT_LIMIT, buildPrompt, buildScene, type PromptFields, type PromptStyle } from "../_lib/prompts";

const STYLES: PromptStyle[] = ["realistic", "anime", "stylized", "painterly"];

function CopyBox({ title, hint, text, copyLabel, meta }: { title: string; hint: string; text: string; copyLabel: string; meta?: React.ReactNode }) {
  const { t } = useT();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast(t.skybox.promptCopied, "ok");
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* izin clipboard ditolak — teks tetap bisa diseleksi manual */
    }
  };
  return (
    <CardBox>
      <CardHeader title={title} aside={<Button size="sm" variant="tonal" icon={done ? <Check width={16} height={16} /> : <Copy width={16} height={16} />} onClick={() => void copy()}>{copyLabel}</Button>} />
      <div className="flex flex-col gap-3 p-5">
        <p className="select-all whitespace-pre-wrap rounded bg-fg/[0.06] p-4 font-mono text-[13px] leading-relaxed text-fg">{text}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] leading-relaxed text-fg-3">
          <span>{hint}</span>
          {meta}
        </div>
      </div>
    </CardBox>
  );
}

/** Tab AI Prompt: preset + kolom yang bisa diubah → prompt panorama 2:1 siap salin */
export default function PromptPanel({ onOpenConvert }: { onOpenConvert: () => void }) {
  const { t, f } = useT();
  const s = t.skybox;
  const [presetId, setPresetId] = useState(PROMPT_PRESETS[1].id);
  const [fields, setFields] = useState<PromptFields>(PROMPT_PRESETS[1]);
  const [style, setStyle] = useState<PromptStyle>("realistic");

  const pick = (id: string) => {
    const p = PROMPT_PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setFields({ scene: p.scene === PLACEHOLDER ? "" : p.scene, subject: p.subject, top: p.top, bottom: p.bottom, avoid: p.avoid });
  };
  const set = (k: keyof PromptFields) => (v: string) => {
    setFields((x) => ({ ...x, [k]: v }));
  };

  const prompt = buildPrompt(fields, style);
  const scene = buildScene(fields, style);
  const missing = !fields.scene.trim();
  const long = prompt.length > PROMPT_SOFT_LIMIT;

  const input = (k: keyof PromptFields, label: string, placeholder?: string) => (
    <Field label={label}>
      {({ id }) => <input id={id} className={inputClass} value={fields[k]} placeholder={placeholder} maxLength={160} onChange={(e) => set(k)(e.target.value)} />}
    </Field>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <CardBox>
        <CardHeader title={s.promptFields} />
        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-fg-2">{s.promptPresets}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={s.promptPresets}>
              {PROMPT_PRESETS.map((p) => {
                const active = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pick(p.id)}
                    className={cn(
                      "ios-press group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-s p-1.5 pr-3 text-left text-[13.5px] font-semibold transition-colors duration-150",
                      active ? "bg-fg/[0.12] text-fg ring-1 ring-fg/40" : "bg-fg/[0.05] text-fg-2 hover:bg-fg/[0.09] hover:text-fg",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-8 w-12 shrink-0 rounded-[6px] ring-1 ring-inset ring-white/10"
                      style={{ background: `linear-gradient(180deg, ${p.swatch[0]} 0%, ${p.swatch[1]} 55%, ${p.swatch[2]} 100%)` }}
                    />
                    <span className="truncate">{p.id === "blank" ? s.promptBlank : p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label={s.promptScene}>
            {({ id }) => (
              <textarea
                id={id}
                rows={3}
                maxLength={260}
                className={cn(inputClass, "h-auto min-h-[96px] resize-y py-3 leading-relaxed")}
                value={fields.scene}
                placeholder={s.promptScenePh}
                onChange={(e) => set("scene")(e.target.value)}
              />
            )}
          </Field>
          {input("subject", s.promptSubject)}
          <div className="grid gap-5 sm:grid-cols-2">
            {input("top", s.promptTop)}
            {input("bottom", s.promptBottom)}
          </div>
          {input("avoid", s.promptAvoid)}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-fg-2">{s.promptStyle}</p>
            <Segmented label={s.promptStyle} value={style} onChange={setStyle} options={STYLES.map((v) => ({ value: v, label: s.promptStyles[v] }))} />
          </div>
        </div>
      </CardBox>

      <div className="flex min-w-0 flex-col gap-6">
        {missing && (
          <p className="flex items-center gap-2 rounded-l border border-[var(--hairline)] bg-warn/[0.08] px-4 py-3 text-[13.5px] text-warn">
            <WarningTriangle width={16} height={16} className="shrink-0" /> {s.promptPlaceholderWarn}
          </p>
        )}
        <CopyBox
          title={s.promptFull}
          hint={s.promptFullHint}
          text={prompt}
          copyLabel={s.copyPrompt}
          meta={<span className={cn("tabular-nums", long && "text-warn")}>{long ? f(s.promptLong, { n: prompt.length, max: PROMPT_SOFT_LIMIT }) : f(s.promptChars, { n: prompt.length })}</span>}
        />
        <CopyBox title={s.promptOnlyScene} hint={s.promptOnlySceneHint} text={scene} copyLabel={s.copyScene} />
        <CardBox>
          <CardHeader title={s.promptTipsTitle} />
          <ul className="flex flex-col gap-2.5 p-5">
            {s.promptTips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-[14px] leading-relaxed text-fg-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-fg-3" />
                {tip}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] px-5 py-4">
            <p className="text-[14px] font-semibold">{s.promptNext}</p>
            <Button size="sm" variant="primary" iconRight={<ArrowRight width={16} height={16} />} onClick={onOpenConvert}>
              {s.promptOpenConvert}
            </Button>
          </div>
        </CardBox>
      </div>
    </div>
  );
}

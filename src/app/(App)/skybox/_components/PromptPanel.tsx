"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, Copy, Sparks, WarningTriangle } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Field, { inputClass } from "@/components/ui/Field";
import Segmented from "@/components/ui/Segmented";
import { PLACEHOLDER, PRESET_CATS, PROMPT_PRESETS, PROMPT_SOFT_LIMIT, buildPrompt, buildScene, type PresetCat, type PromptFields, type PromptStyle } from "../_lib/prompts";
import { aiCompose, failureOf, localCompose } from "../_lib/aiPrompt";

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
  const [cat, setCat] = useState<PresetCat | "all">("all");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const aiCtrl = useRef<AbortController | null>(null);
  const toast = useToast();
  const shown = PROMPT_PRESETS.filter((p) => cat === "all" || p.cat === cat || p.id === "blank");

  const compose = async (text = idea) => {
    const q = text.trim();
    if (!q || busy) return;
    setIdea(q);
    setBusy(true);
    aiCtrl.current?.abort();
    const ctrl = new AbortController();
    aiCtrl.current = ctrl;
    try {
      setFields(await aiCompose(q, style, ctrl.signal));
      toast(s.aiDone, "ok");
    } catch (e) {
      if (ctrl.signal.aborted && aiCtrl.current !== ctrl) return;
      setFields(localCompose(q));
      toast(failureOf(e) === "off" ? s.aiOff : s.aiFallback, "info");
    } finally {
      if (aiCtrl.current === ctrl) setBusy(false);
    }
    setPresetId("");
  };

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
        <div className="flex flex-col gap-5 p-5 desk:gap-4 desk:p-4">
          {/* Ide → AI: kolom satu baris + saran cepat */}
          <form
            className="flex flex-col gap-2.5 rounded-[12px] bg-fg/[0.05] p-3 ring-1 ring-inset ring-[var(--hairline)]"
            onSubmit={(e) => {
              e.preventDefault();
              void compose();
            }}
          >
            <div className="flex items-center gap-2">
              <Sparks width={16} height={16} aria-hidden="true" className="shrink-0 text-fg-2" />
              <p className="text-[13.5px] font-semibold">{s.aiTitle}</p>
            </div>
            <p className="text-[12.5px] leading-snug text-fg-3">{s.aiSub}</p>
            <div className="flex gap-2">
              <input
                className={cn(inputClass, "flex-1")}
                value={idea}
                maxLength={300}
                placeholder={s.aiPh}
                aria-label={s.aiTitle}
                onChange={(e) => setIdea(e.target.value)}
              />
              <Button type="submit" variant="primary" loading={busy} disabled={!idea.trim()} icon={<Sparks width={16} height={16} />} className="shrink-0">
                {busy ? s.aiBusy : s.aiGo}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.aiIdeas.map((x) => (
                <button
                  key={x}
                  type="button"
                  disabled={busy}
                  onClick={() => void compose(x)}
                  className="ios-press h-7 cursor-pointer rounded-full bg-fg/[0.06] px-3 text-[12px] font-medium text-fg-2 transition-colors hover:bg-fg/[0.1] hover:text-fg disabled:opacity-40 desk:rounded-[7px]"
                >
                  {x}
                </button>
              ))}
            </div>
          </form>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-fg-2">{s.promptPresets}</p>
              <div className="thin-scroll -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label={s.promptPresets}>
                {(["all", ...PRESET_CATS] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={cat === k}
                    onClick={() => setCat(k)}
                    className={cn(
                      "h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[12px] font-semibold transition-colors desk:rounded-[7px]",
                      cat === k ? "bg-fg text-bg" : "text-fg-3 hover:bg-fg/[0.07] hover:text-fg",
                    )}
                  >
                    {s.promptCats[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={s.promptPresets}>
              {shown.map((p) => {
                const active = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pick(p.id)}
                    className={cn(
                      "ios-press group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-s p-1.5 pr-3 text-left text-[13.5px] font-semibold transition-colors duration-150 desk:min-h-10 desk:gap-2 desk:rounded-[10px] desk:pr-2 desk:text-[12.5px]",
                      active ? "bg-fg/[0.12] text-fg ring-1 ring-fg/40" : "bg-fg/[0.05] text-fg-2 hover:bg-fg/[0.09] hover:text-fg",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-8 w-12 shrink-0 rounded-[6px] ring-1 ring-inset ring-white/10 desk:h-7 desk:w-7"
                      style={{ background: `linear-gradient(180deg, ${p.swatch[0]} 0%, ${p.swatch[1]} 55%, ${p.swatch[2]} 100%)` }}
                    />
                    <span className="truncate" title={p.label}>
                      {p.id === "blank" ? s.promptBlank : p.label}
                    </span>
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

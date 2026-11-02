"use client";

import { CheckCircle, Copy, InfoCircle, NavArrowDown, WarningTriangle } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn, copyText } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch } from "@/store/hooks";
import { setRobloxMode, type RobloxMode } from "@/store/slices/converterSlice";
import { restoreScript, robloxPlayback, round, semis } from "@/lib/robloxPlayback";
import type { AudioOptions } from "@/lib/schemas/convert.schema";
import ArrCard from "@/components/arr/ArrCard";
import Button from "@/components/ui/Button";
import RobloxSetupGuide from "./RobloxSetupGuide";

/**
 * "Di Roblox" — dibuat untuk user awam: pilih mode lewat dua kartu besar, lalu SATU angka yang tinggal disalin
 * + 3 langkah bernomor. Cara teknis (script Command Bar, config music player) dilipat untuk developer.
 * Hitungan di lib/robloxPlayback.ts:
 *  - "Langsung pakai" (asIs): PlaybackSpeed 1 → terdengar persis setelan.
 *  - "Suara asli" (restore): PlaybackSpeed 1/speed → tempo & nada kembali seperti lagu asli.
 */
export default function RobloxTempoCard({ options: o, mode }: { options: AudioOptions; mode: RobloxMode }) {
  const { t, f } = useT();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const c = t.converter;
  const r = c.rbx;
  const pb = robloxPlayback(o);
  const changed = pb.speed !== 1;
  const restore = mode === "restore" && changed;
  const fill = pb.restoreSpeed;
  const canScript = restore && (pb.exact || pb.octaveOk);

  const copy = async (text: string, msg: string) => {
    if (await copyText(text)) toast(msg, "ok");
  };

  // shrink-0: di panel tab (flex kolom + scroll), kartu tidak boleh menyusut & terpotong
  return (
    <section aria-label={r.title} className="flex shrink-0 flex-col gap-3">
      <p className="caps text-[10.5px] text-fg-3">{r.title}</p>

      {/* Tanpa perubahan kecepatan: tidak ada yang perlu dilakukan */}
      {pb.untouched && (
        <p className="flex items-start gap-2 rounded-s bg-ok/[0.08] px-3 py-3 text-[13px] leading-snug text-ok">
          <CheckCircle width={16} height={16} aria-hidden="true" className="mt-px shrink-0" /> {r.nothing}
        </p>
      )}

      {/* Hanya nada yang diubah (speed 1×): PlaybackSpeed tidak bisa membalik */}
      {pb.speed === 1 && !pb.untouched && (
        <p className="flex items-start gap-2 rounded-s bg-raised px-3 py-3 text-[12.5px] leading-snug text-fg-2">
          <InfoCircle width={15} height={15} aria-hidden="true" className="mt-px shrink-0" />
          {f(c.robloxPitchOnly, { pitch: semis(pb.filePitch), octave: round(2 ** (-pb.filePitch / 12), 3) })}
        </p>
      )}

      {changed && (
        <>
          {/* Mode = dua kartu besar, bukan segmented berlabel teknis */}
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={r.title}>
            <ArrCard
              variant="preset"
              tone="high"
              pressed={restore}
              onClick={() => dispatch(setRobloxMode("restore" as RobloxMode))}
              meta={[<span key="b" className="arr-badge">{r.recommended}</span>]}
              title={r.restoreTitle}
              className="arr-wrap"
              text={f(r.restoreDesc, { n: fill })}
            />
            <ArrCard
              variant="preset"
              pressed={!restore}
              onClick={() => dispatch(setRobloxMode("asIs" as RobloxMode))}
              title={r.asIsTitle}
              className="arr-wrap"
              text={f(r.asIsDesc, { speed: pb.speed })}
            />
          </div>

          {restore ? (
            <div className="rounded-s bg-fg/[0.05] p-4 desk:rounded-[10px]">
              {/* Satu angka yang perlu diingat — besar & bisa disalin sekali klik */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-fg-3">{r.fillLabel}</p>
                  <p className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums text-fg">{fill}</p>
                </div>
                <Button size="sm" variant="primary" icon={<Copy width={14} height={14} />} onClick={() => copy(String(fill), f(r.copied, { n: fill }))}>
                  {f(r.copy, { n: fill })}
                </Button>
              </div>

              <ol className="mt-4 flex flex-col gap-2.5">
                {r.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug text-fg-2">
                    <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-fg/[0.1] text-[11px] font-semibold tabular-nums text-fg">
                      {i + 1}
                    </span>
                    <span>{f(s, { n: fill })}</span>
                  </li>
                ))}
              </ol>

              {pb.exact ? (
                <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ok">
                  <CheckCircle width={14} height={14} aria-hidden="true" /> {r.result}
                </p>
              ) : pb.octaveOk ? (
                <p className="mt-4 flex items-start gap-1.5 text-[12.5px] leading-snug text-warn">
                  <WarningTriangle width={14} height={14} aria-hidden="true" className="mt-px shrink-0" />
                  {f(c.robloxPitchFix, { pitch: semis(pb.residual), octave: pb.octave })}
                </p>
              ) : (
                <p className="mt-4 flex items-start gap-1.5 text-[12.5px] leading-snug text-err">
                  <WarningTriangle width={14} height={14} aria-hidden="true" className="mt-px shrink-0" />
                  {f(c.robloxPitchFixOut, { pitch: semis(pb.residual) })}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-s bg-fg/[0.05] p-4 desk:rounded-[10px]">
              <p className="flex items-start gap-2 text-[13px] leading-snug text-fg">
                <CheckCircle width={16} height={16} aria-hidden="true" className="mt-px shrink-0 text-ok" /> {r.asIsDo}
              </p>
              <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug text-warn">
                <WarningTriangle width={14} height={14} aria-hidden="true" className="mt-px shrink-0" />
                {f(c.robloxDouble, { speed: pb.speed, double: round(pb.speed * pb.speed, 2) })}
              </p>
            </div>
          )}

          {/* Cara otomatis untuk developer — dilipat supaya user awam tidak bingung */}
          {canScript && (
            <details className="group rounded-s border border-line/70 desk:rounded-[10px]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-[13px] font-semibold text-fg-2 hover:text-fg [&::-webkit-details-marker]:hidden">
                <span>
                  {r.devTitle}
                  <span className="block text-[11.5px] font-normal text-fg-3">{r.devSub}</span>
                </span>
                <NavArrowDown width={16} height={16} aria-hidden="true" className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className={cn("flex flex-col gap-3 border-t border-line/60 p-3")}>
                <Button variant="tonal" size="sm" onClick={() => copy(restoreScript(pb), c.robloxScriptCopied)} icon={<Copy width={16} height={16} />}>
                  {c.robloxScript}
                </Button>
                <p className="-mt-1 text-[11.5px] leading-snug text-fg-3">{c.robloxScriptHint}</p>
                <RobloxSetupGuide speed={fill} />
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

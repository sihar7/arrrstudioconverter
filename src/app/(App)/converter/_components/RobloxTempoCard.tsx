"use client";

import type { ReactNode } from "react";
import { CheckCircle, Copy, InfoCircle, WarningTriangle } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch } from "@/store/hooks";
import { setRobloxMode, type RobloxMode } from "@/store/slices/converterSlice";
import { restoreScript, robloxPlayback, round, semis } from "@/lib/robloxPlayback";
import type { AudioOptions } from "@/lib/schemas/convert.schema";
import Segmented from "@/components/ui/Segmented";
import Button from "@/components/ui/Button";

/** Ubin angka: label · nilai besar · keterangan — dua ubin selalu sejajar & setinggi */
function Stat({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: "ok" }) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xs bg-raised px-3 py-2.5", tone === "ok" && "ring-1 ring-inset ring-ok/35")}>
      <p className="truncate text-[11.5px] text-fg-3">{label}</p>
      <p className={cn("mt-1.5 font-display text-[22px] font-bold tabular-nums leading-none", tone === "ok" ? "text-ok" : "text-fg")}>{value}</p>
      <p className="mt-1.5 truncate text-[11px] text-fg-3">{caption}</p>
    </div>
  );
}

/** Baris catatan berikon */
function Note({ icon, className, children }: { icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2 px-3 py-2.5 text-[12.5px] leading-snug", className)}>
      <span aria-hidden="true" className="mt-px shrink-0">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * Playback di Roblox untuk setelan ini (hitungan di lib/robloxPlayback.ts):
 *  - "Pakai hasil ini": PlaybackSpeed 1 → terdengar persis setelan (kecepatan & nada tertanam di file).
 *  - "Balik ke asli": PlaybackSpeed 1/speed → tempo 1×; sisa nada dikoreksi PitchShiftSoundEffect bila perlu.
 */
export default function RobloxTempoCard({ options: o, mode }: { options: AudioOptions; mode: RobloxMode }) {
  const { t, f } = useT();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const c = t.converter;
  const setMode = (m: RobloxMode) => dispatch(setRobloxMode(m));
  const pb = robloxPlayback(o);
  const pitchText = (v: number) => (Math.abs(v) < 0.05 ? c.robloxHeardPitchNone : f(c.robloxHeardPitch, { pitch: semis(v) }));

  // Hanya nada yang berubah (speed 1×): PlaybackSpeed tidak bisa membantu, langsung tawarkan PitchShift
  const pitchOnly = pb.speed === 1 && !pb.untouched;
  const restore = mode === "restore" && pb.speed !== 1;
  const fill = restore ? pb.restoreSpeed : 1;
  const heardTempo = restore ? 1 : pb.speed;
  const heardPitch = restore ? pb.residual : pb.filePitch;
  const canScript = restore && (pb.exact || pb.octaveOk);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(restoreScript(pb));
      toast(c.robloxScriptCopied, "ok");
    } catch {
      /* izin clipboard ditolak — tidak ada yang perlu dibersihkan */
    }
  };

  return (
    <section aria-label={c.robloxTitle} className="overflow-hidden rounded-s border border-line bg-bg/40">
      <p className="caps border-b border-line/60 px-3 py-2.5 text-[10.5px] text-fg-3">{c.robloxTitle}</p>

      {pb.speed !== 1 && (
        <div className="px-3 pt-3">
          <Segmented
            size="sm"
            label={c.robloxMode}
            value={mode}
            onChange={setMode}
            options={[
              { value: "asIs", label: c.robloxModeAsIs },
              { value: "restore", label: c.robloxModeRestore },
            ]}
          />
        </div>
      )}

      {/* Dua angka yang dicari user: yang diisi (utama) & yang terdengar */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <Stat label={c.robloxFill} value={String(fill)} caption={fill === 1 ? c.robloxFillValue : `Sound.PlaybackSpeed`} tone="ok" />
        <Stat label={c.robloxHeard} value={`${round(heardTempo, 2)}×`} caption={pitchText(heardPitch)} />
      </div>

      <ul className="divide-y divide-line/60 border-t border-line/60">
        {pb.untouched && (
          <Note icon={<CheckCircle width={14} height={14} />} className="text-ok">
            {c.robloxNormal}
          </Note>
        )}

        {pitchOnly && (
          <Note icon={<InfoCircle width={14} height={14} />} className="text-fg-2">
            {f(c.robloxPitchOnly, { pitch: semis(pb.filePitch), octave: round(2 ** (-pb.filePitch / 12), 3) })}
          </Note>
        )}

        {pb.speed !== 1 && !restore && (
          <>
            <Note icon={<InfoCircle width={14} height={14} />} className="text-fg-2">
              {f(c.robloxWhy, { speed: pb.speed })}
              {o.pitch !== 0 && ` ${f(c.robloxPitchNote, { pitch: semis(o.pitch) })}`}
            </Note>
            <Note icon={<WarningTriangle width={14} height={14} />} className="bg-warn/[0.06] text-warn">
              {f(c.robloxDouble, { speed: pb.speed, double: round(pb.speed * pb.speed, 2) })}
            </Note>
          </>
        )}

        {restore && (
          <>
            <Note icon={<InfoCircle width={14} height={14} />} className="text-fg-2">
              {f(c.robloxRestoreWhy, { back: pb.restoreSpeed, speed: pb.speed })}
            </Note>
            {pb.exact ? (
              <Note icon={<CheckCircle width={14} height={14} />} className="text-ok">
                {c.robloxRestoreExact}
                {o.speed > 1 && <span className="mt-1 block text-fg-3">{c.robloxBypassNote}</span>}
              </Note>
            ) : pb.octaveOk ? (
              <Note icon={<WarningTriangle width={14} height={14} />} className="bg-warn/[0.06] text-warn">
                {f(c.robloxPitchFix, { pitch: semis(pb.residual), octave: pb.octave })}
                {o.preservePitch && o.pitch === 0 && <span className="mt-1 block text-fg-3">{c.robloxPitchTip}</span>}
              </Note>
            ) : (
              <Note icon={<WarningTriangle width={14} height={14} />} className="bg-err/[0.06] text-err">
                {f(c.robloxPitchFixOut, { pitch: semis(pb.residual) })}
              </Note>
            )}
          </>
        )}
      </ul>

      {canScript && (
        <div className="flex flex-col gap-2 border-t border-line/60 p-3">
          <Button variant="tonal" size="sm" onClick={copyScript} icon={<Copy width={16} height={16} />}>
            {c.robloxScript}
          </Button>
          <p className="text-[11.5px] leading-snug text-fg-3">{c.robloxScriptHint}</p>
        </div>
      )}
    </section>
  );
}

"use client";

import { useT } from "@/hooks/useT";
import { DEFAULT_OPTIONS, type AudioOptions } from "@/lib/schemas/convert.schema";
import type { RobloxMode } from "@/store/slices/converterSlice";
import type { Dictionary } from "@/utils/languages/id";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import RobloxTempoCard from "./RobloxTempoCard";

type Row = { label: string; value: string; hint: string };

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Setelan → kalimat sehari-hari: apa yang diubah & artinya untuk telinga (hanya yang beda dari bawaan) */
function describe(o: AudioOptions, t: Dictionary, f: (s: string, v: Record<string, string | number>) => string): Row[] {
  const n = t.converter.note;
  const p = t.converter.panel;
  const rows: Row[] = [];
  if (o.speed !== 1) {
    const pct = Math.round(Math.abs(o.speed - 1) * 100);
    rows.push({ label: p.speed, value: `${o.speed}×`, hint: f(o.speed > 1 ? n.faster : n.slower, { n: pct }) });
    rows.push({ label: n.pitchMode, value: o.preservePitch ? n.pitchKept : n.pitchFollows, hint: o.preservePitch ? n.pitchKeptHint : n.pitchFollowsHint });
  }
  if (o.pitch) rows.push({ label: p.pitch, value: `${sign(o.pitch)} st`, hint: o.pitch > 0 ? n.pitchUp : n.pitchDown });
  if (o.bass) rows.push({ label: p.bass, value: `${sign(o.bass)} dB`, hint: o.bass > 0 ? n.bassUp : n.bassDown });
  if (o.treble) rows.push({ label: p.treble, value: `${sign(o.treble)} dB`, hint: o.treble > 0 ? n.trebleUp : n.trebleDown });
  if (o.reverb) rows.push({ label: p.reverb, value: `${o.reverb}%`, hint: n.reverb });
  if (o.spatial8d) rows.push({ label: "8D", value: n.on, hint: n.eightD });
  if (o.volume) rows.push({ label: p.volume, value: `${sign(o.volume)} dB`, hint: o.volume > 0 ? n.louder : n.quieter });
  if (o.master) rows.push({ label: p.master, value: n.on, hint: n.master });
  else if (o.normalize) rows.push({ label: p.normalize, value: n.on, hint: n.normalize });
  if (o.compress !== DEFAULT_OPTIONS.compress) rows.push({ label: p.compress, value: o.compress ? n.on : n.off, hint: o.compress ? n.compressOn : n.compressOff });
  rows.push({
    label: p.format,
    value: `${o.format.toUpperCase()} · ${o.format === "wav" || o.format === "flac" ? `${o.sampleRate / 1000} kHz` : `${o.bitrate} kbps`}`,
    hint: n.format,
  });
  return rows;
}

/** Pop-up catatan setelah memilih preset: apa saja yang disetel + apa yang perlu dilakukan di game Roblox */
export default function PresetNoteDialog({
  open,
  onClose,
  name,
  options,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  options: AudioOptions;
  mode: RobloxMode;
}) {
  const { t, f } = useT();
  const n = t.converter.note;
  const rows = describe(options, t, f);

  return (
    <Dialog open={open} onClose={onClose} title={f(n.title, { name })} sub={n.sub} footer={<Button onClick={onClose}>{n.ok}</Button>}>
      <div className="flex flex-col gap-6">
        <section aria-label={n.setTitle}>
          <p className="caps text-[10.5px] text-fg-3">{n.setTitle}</p>
          <dl className="mt-2 divide-y divide-fg/[0.06] overflow-hidden rounded-[12px] bg-fg/[0.04]">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4 px-3.5 py-3">
                <div className="min-w-0">
                  <dt className="text-[13.5px] font-semibold text-fg">{r.label}</dt>
                  <dd className="mt-0.5 text-[12.5px] leading-snug text-fg-3">{r.hint}</dd>
                </div>
                <dd className="shrink-0 font-mono text-[13px] tabular-nums text-fg">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Panduan di game — dipindah dari tab Tempo supaya dibaca tepat saat memilih preset */}
        <RobloxTempoCard options={options} mode={mode} />
      </div>
    </Dialog>
  );
}

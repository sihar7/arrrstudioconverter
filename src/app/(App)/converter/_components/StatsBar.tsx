"use client";

import { useAppSelector } from "@/store/hooks";
import { formatBytes, formatDuration } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { DEFAULT_OPTIONS } from "@/lib/schemas/convert.schema";
import { estimateBytes, outputDuration } from "../_utils/helpers";

/**
 * Ringkasan antrean dalam satu baris sel sama lebar: jumlah · selesai · durasi · perkiraan ukuran.
 * Ukuran = hasil nyata untuk yang selesai, perkiraan dari setelan untuk sisanya.
 */
export default function StatsBar() {
  const { t } = useT();
  const s = t.converter.stats;
  const hydrated = useHydrated();
  const items = useAppSelector((st) => st.converter.items);
  const stored = useAppSelector((st) => st.converter.options);
  const options = hydrated ? stored : DEFAULT_OPTIONS;

  let seconds = 0;
  let bytes = 0;
  for (const i of items) {
    const o = i.options ?? options;
    const dur = i.result?.duration ?? outputDuration(o, i.duration) ?? 0;
    seconds += dur;
    bytes += i.result?.size ?? estimateBytes(o, dur);
  }
  const done = items.filter((i) => i.status === "done").length;

  const cells = [
    { label: s.songs, value: String(items.length) },
    { label: s.done, value: items.length ? `${done}/${items.length}` : "0" },
    { label: s.duration, value: seconds ? formatDuration(seconds) : "0:00" },
    { label: s.size, value: bytes ? `≈ ${formatBytes(bytes)}` : "—" },
  ];

  return (
    <dl className="rise grid grid-cols-2 overflow-hidden rounded-l border border-line/60 bg-surface sm:grid-cols-4 [animation-delay:40ms]">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={
            "flex flex-col gap-1 px-5 py-4 " +
            (i % 2 === 1 ? "border-l border-line/60 " : "") +
            (i >= 2 ? "border-t border-line/60 sm:border-t-0 sm:border-l" : "")
          }
        >
          <dt className="caps text-[10.5px] text-fg-3">{c.label}</dt>
          <dd className="font-display text-[22px] font-bold tabular-nums tracking-[-0.02em] text-fg">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

"use client";

import { Check } from "iconoir-react";
import { useAppSelector } from "@/store/hooks";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

/** id seksi tujuan tiap langkah (dipasang di ConverterScreen) */
export const STEP_TARGETS = ["step-source", "step-settings", "step-queue"] as const;

const BUSY = new Set(["pending", "queued", "downloading", "processing"]);

/**
 * Panduan 3 langkah yang mengikuti progres nyata:
 * belum ada lagu → 01 aktif · ada lagu → 02 aktif (atur / langsung convert) · sedang/selesai convert → 03.
 * Klik langkah = gulir ke bagiannya (berguna di HP saat kolom ditumpuk).
 */
export default function StepGuide() {
  const { t } = useT();
  const items = useAppSelector((s) => s.converter.items);
  const anyDone = items.some((i) => i.status === "done");
  const anyBusy = items.some((i) => BUSY.has(i.status));
  const current = !items.length ? 0 : anyDone || anyBusy ? 2 : 1;
  const allDone = anyDone && !anyBusy && items.every((i) => i.status === "done" || i.status === "error");

  const go = (i: number) => {
    const el = document.getElementById(STEP_TARGETS[i]);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.querySelector<HTMLElement>("textarea, button, input")?.focus({ preventScroll: true });
  };

  return (
    <nav aria-label={t.converter.guideLabel} className="rise [animation-delay:40ms]">
      <ol className="grid gap-px overflow-hidden rounded-l border border-line/60 bg-line/60 sm:grid-cols-3">
        {t.converter.guide.map((s, i) => {
          const done = i < current || (allDone && i === 2);
          const now = i === current && !done;
          return (
            <li key={s.title} className="bg-surface">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={now ? "step" : undefined}
                className={cn(
                  "state-layer group relative flex h-full w-full cursor-pointer items-start gap-4 px-5 py-4 text-left transition-colors duration-300",
                  now ? "text-fg" : "text-fg-2 hover:text-fg",
                )}
              >
                {/* Indikator progres di tepi atas */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 top-0 h-0.5 origin-left bg-accent transition-transform duration-700 ease-[var(--ease)]",
                    done || now ? "scale-x-100" : "scale-x-0",
                    now && "opacity-100",
                    done && "opacity-50",
                  )}
                />
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-s border font-mono text-[12px] transition-colors duration-300",
                    done && "border-transparent bg-tonal text-on-tonal",
                    now && "btn-plate border-transparent bg-accent text-on-accent",
                    !done && !now && "border-line-2 text-fg-3",
                  )}
                >
                  {done ? <Check width={15} height={15} strokeWidth={2.2} /> : String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold">{s.title}</span>
                    {now && <span className="caps text-[10px] text-accent">{t.converter.stepNow}</span>}
                    {i === 1 && !now && !done && <span className="caps text-[10px] text-fg-3">{t.converter.optional}</span>}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-fg-3">{s.desc}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

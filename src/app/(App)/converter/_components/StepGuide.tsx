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
    <nav aria-label={t.converter.guideLabel}>
      {/* Stepper ringkas: nomor + judul, garis penghubung terisi mengikuti progres */}
      <ol className="flex items-center">
        {t.converter.guide.map((s, i) => {
          const done = i < current || (allDone && i === 2);
          const now = i === current && !done;
          return (
            <li key={s.title} className="flex items-center">
              {i > 0 && (
                <span aria-hidden="true" className="relative mx-1 h-px w-5 overflow-hidden bg-line-2 sm:w-8">
                  <span
                    className={cn(
                      "absolute inset-0 origin-left bg-accent transition-transform duration-700 ease-[var(--ease)]",
                      i <= current ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </span>
              )}
              <button
                type="button"
                onClick={() => go(i)}
                title={s.desc}
                aria-current={now ? "step" : undefined}
                className={cn(
                  "state-layer group flex h-11 cursor-pointer items-center gap-2 rounded-full pl-1.5 pr-3 transition-colors duration-300",
                  now ? "text-fg" : done ? "text-fg-2 hover:text-fg" : "text-fg-3 hover:text-fg-2",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-[background-color,border-color,color,transform] duration-300 group-active:scale-90",
                    done && "border-transparent bg-tonal text-on-tonal",
                    now && "btn-plate border-transparent bg-accent text-on-accent",
                    !done && !now && "border-line-2",
                  )}
                >
                  {done ? <Check width={14} height={14} strokeWidth={2.2} /> : i + 1}
                </span>
                <span className={cn("whitespace-nowrap text-[13px] font-semibold", !now && "hidden md:inline")}>{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

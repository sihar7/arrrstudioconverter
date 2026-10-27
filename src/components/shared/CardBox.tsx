import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Kartu grouped ala iOS (.mat) — permukaan utama semua kartu. App desktop: panel datar 14px (kedalaman lewat tone). */
export default function CardBox({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "aside" }) {
  return <Tag className={cn("mat rounded-l border border-[var(--hairline)] bg-surface desk:rounded-[14px]", className)}>{children}</Tag>;
}

/** Kepala kartu: nomor langkah opsional (01, 02…) agar urutan pakai langsung terbaca */
export function CardHeader({ title, aside, step, className }: { title: ReactNode; aside?: ReactNode; step?: number; className?: string }) {
  return (
    <div className={cn("flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] px-5 py-3 desk:min-h-12 desk:px-4 desk:py-2", className)}>
      <h2 className="flex items-center gap-3 font-display text-[17px] font-semibold text-fg desk:gap-2 desk:text-[14px]">
        {step != null && (
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-fg/[0.08] text-[12px] font-semibold tabular-nums text-fg-2 desk:hidden">
            {step}
          </span>
        )}
        {title}
      </h2>
      {aside}
    </div>
  );
}

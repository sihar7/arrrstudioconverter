import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Kartu grouped ala iOS (.mat) — permukaan utama semua kartu */
export default function CardBox({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "aside" }) {
  return <Tag className={cn("mat rounded-l border border-[var(--hairline)] bg-surface", className)}>{children}</Tag>;
}

/** Kepala kartu: nomor langkah opsional (01, 02…) agar urutan pakai langsung terbaca */
export function CardHeader({ title, aside, step, className }: { title: ReactNode; aside?: ReactNode; step?: number; className?: string }) {
  return (
    <div className={cn("flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] px-5 py-3", className)}>
      <h2 className="flex items-center gap-3 font-display text-[17px] font-semibold text-fg">
        {step != null && (
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-fg/[0.08] text-[12px] font-semibold tabular-nums text-fg-2">
            {step}
          </span>
        )}
        {title}
      </h2>
      {aside}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Pelat satin (.mat) — permukaan utama semua kartu */
export default function CardBox({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "aside" }) {
  return <Tag className={cn("mat rounded-l border border-line/60 bg-surface", className)}>{children}</Tag>;
}

/** Kepala kartu: nomor langkah opsional (01, 02…) agar urutan pakai langsung terbaca */
export function CardHeader({ title, aside, step, className }: { title: ReactNode; aside?: ReactNode; step?: number; className?: string }) {
  return (
    <div className={cn("flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3", className)}>
      <h2 className="flex items-center gap-3 font-display text-[15px] font-semibold tracking-[-0.005em] text-fg">
        {step != null && (
          <span aria-hidden="true" className="font-mono text-[11px] font-medium tracking-[0.1em] text-fg-3">
            {String(step).padStart(2, "0")}
          </span>
        )}
        {title}
      </h2>
      {aside}
    </div>
  );
}

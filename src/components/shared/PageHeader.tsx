import type { ReactNode } from "react";

/**
 * Kepala halaman editorial: eyebrow kapital · judul lebar · sub · aksi.
 */
export default function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="rise relative">
      <div className="relative flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[clamp(32px,4.6vw,56px)] font-bold leading-[1] tracking-[-0.035em] [text-wrap:balance]">{title}</h1>
          {sub && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-2">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      <hr className="engrave" />
    </div>
  );
}

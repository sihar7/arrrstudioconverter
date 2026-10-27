import type { ReactNode } from "react";

/**
 * Kepala halaman editorial: eyebrow kapital · judul lebar · sub · aksi.
 * App desktop: "large title" ala macOS — tanpa eyebrow, judul 30px, sub satu baris; judul pindah ke toolbar saat discroll.
 */
export default function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="rise relative">
      <div className="relative flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between desk:gap-4 desk:border-b desk:border-[var(--hairline)] desk:pb-4">
        <div className="min-w-0">
          {/* .eyebrow di luar layer Tailwind → disembunyikan lewat pembungkus, bukan utilitas di elemennya */}
          <div className="desk:hidden">
            <p className="eyebrow">{eyebrow}</p>
          </div>
          <h1 className="mt-4 font-display text-[clamp(32px,4.6vw,56px)] font-bold leading-[1] tracking-[-0.035em] [text-wrap:balance] desk:mt-0 desk:text-[26px] desk:leading-tight desk:tracking-[-0.025em]">
            {title}
          </h1>
          {sub && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-2 desk:mt-1 desk:max-w-2xl desk:truncate desk:text-[13px] desk:text-fg-3">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      <hr className="engrave desk:hidden" />
    </div>
  );
}

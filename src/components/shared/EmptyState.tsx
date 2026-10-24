import type { ReactNode } from "react";

/** Keadaan kosong: ikon di atas ubin forged + judul + langkah berikutnya yang jelas */
export default function EmptyState({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="forged-tile relative flex size-16 items-center justify-center rounded-l text-fg">{icon}</div>
      <p className="mt-6 font-display text-[18px] font-bold tracking-[-0.02em]">{title}</p>
      {sub && <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-fg-2">{sub}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

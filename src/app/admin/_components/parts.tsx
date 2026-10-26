"use client";

import type { ReactNode } from "react";
import { RefreshDouble, WarningTriangle } from "iconoir-react";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// Potongan UI kecil yang dipakai semua tab admin

/**
 * Kartu angka. size "lg" = KPI utama (baris atas dashboard); onClick → kartu jadi tombol (mis. buka tab Order).
 * tone "warn" dipakai untuk angka yang butuh tindakan.
 */
export function StatTile({
  label,
  value,
  sub,
  icon,
  size = "md",
  tone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  size?: "md" | "lg";
  tone?: "warn";
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="caps text-[10.5px] text-fg-3">{label}</p>
        {icon && (
          <span aria-hidden="true" className={cn("flex size-8 items-center justify-center rounded-s bg-raised", tone === "warn" ? "text-warn" : "text-fg-2")}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <p
          className={cn(
            "font-display font-bold leading-none tabular-nums tracking-[-0.03em]",
            size === "lg" ? "text-[clamp(26px,2.6vw,34px)]" : "text-[26px]",
            tone === "warn" && "text-warn",
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-2 text-[13px] text-fg-2">{sub}</p>}
      </div>
    </>
  );
  const cls = cn(
    "mat flex flex-col justify-between gap-4 rounded-l border border-line/60 bg-surface p-5 text-left",
    size === "lg" ? "min-h-[136px]" : "min-h-[112px]",
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "state-layer cursor-pointer transition-[border-color,transform] duration-200 hover:border-line-2 active:scale-[0.98]")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 border-l-2 border-err bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex gap-3 text-[14px] text-fg-2">
        <WarningTriangle width={18} height={18} className="mt-0.5 shrink-0 text-err" aria-hidden="true" />
        {message}
      </p>
      <Button size="sm" variant="ghost" onClick={onRetry} icon={<RefreshDouble aria-hidden="true" />}>
        Coba lagi
      </Button>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Memuat">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

/** Baris toolbar di atas daftar: info kiri, aksi kanan */
export function Toolbar({ children, actions, className }: { children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} loading={loading} icon={<RefreshDouble aria-hidden="true" />}>
      Muat ulang
    </Button>
  );
}

/** Wadah daftar bergaris (dipakai tabel responsif: grid di desktop, tumpuk di HP) */
export function ListBox({ children, head }: { children: ReactNode; head?: ReactNode }) {
  return (
    <div className="mat overflow-hidden rounded-l border border-line/60 bg-surface">
      {head && <div className="caps hidden border-b border-line/70 px-5 py-3 text-[10.5px] text-fg-3 md:grid">{head}</div>}
      <ul className="divide-y divide-line/60">{children}</ul>
    </div>
  );
}

export const ago = (ts: number | null) => {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
};

export const nf = (n: number) => n.toLocaleString("id-ID");

export const dateShort = (ts: number | null) =>
  ts ? new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

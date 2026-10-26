"use client";

import Link from "next/link";
import { Download } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";

/** Tombol "Download app" di navbar — kapsul berlabel di layar lebar, ikon saja di HP. Hilang di dalam app desktop. */
export default function DownloadAppButton({ active }: { active?: boolean }) {
  const { t } = useT();
  const hydrated = useHydrated();
  if (hydrated && getDesktop()) return null;
  return (
    <Link
      href="/download"
      aria-label={t.nav.downloadApp}
      title={t.nav.downloadApp}
      aria-current={active ? "page" : undefined}
      className={cn(
        "state-layer ios-press inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-[13.5px] font-semibold transition-colors",
        "w-11 lg:w-auto lg:bg-fg/[0.08] lg:px-4 lg:hover:bg-fg/[0.13]",
        active ? "text-fg" : "text-fg-2 hover:text-fg lg:text-fg",
      )}
    >
      <Download width={18} height={18} />
      <span className="hidden lg:inline">{t.nav.downloadApp}</span>
    </Link>
  );
}

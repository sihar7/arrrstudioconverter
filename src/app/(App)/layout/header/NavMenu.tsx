"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, NavArrowDown } from "iconoir-react";
import { cn } from "@/lib/utils";
import AppIcon from "@/components/ui/AppIcon";
import { useT } from "@/hooks/useT";
import { useMeQuery } from "@/store/api/baseApi";
import { PLANS, cheapestPlan } from "@/lib/schemas/plans";
import type { NavItem } from "./Header";

/**
 * Dropdown navbar desktop (xl+) — mengelompokkan beberapa tujuan di balik satu label.
 * Dibuat "proper": buka lewat hover & klik & fokus keyboard, tutup saat Esc / klik luar / pindah halaman,
 * panel kaca melayang dengan micro-animation (fade + naik) dan baris ikon-tile + deskripsi.
 */
export default function NavMenu({
  label,
  items,
  activeHref,
}: {
  label: string;
  items: readonly NavItem[];
  activeHref?: string;
}) {
  const { t } = useT();
  const { data: me } = useMeQuery();
  // Label gembok "Pro" di Audio saya bila plan user belum membukanya (guest: tidak ditampilkan)
  const libraryLock = me?.user && PLANS[me.plan?.id ?? "free"].library === "off" ? t.plan.names[cheapestPlan((p) => p.library !== "off")] : null;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupActive = items.some((i) => i.href === activeHref);

  // tutup saat pindah halaman (tanpa setState-in-effect: bandingkan path saat render)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  // tutup saat klik luar / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hoverOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120); // jeda kecil → tidak ketutup saat geser ke panel
  };

  return (
    <div ref={ref} className="relative flex items-stretch" onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group relative flex items-center gap-1.5 px-3.5 text-[14px] font-medium transition-colors duration-200",
          groupActive || open ? "text-fg" : "text-fg-2 hover:text-fg",
        )}
      >
        {label}
        <NavArrowDown
          width={13}
          height={13}
          strokeWidth={2}
          aria-hidden="true"
          className={cn("mt-px transition-transform duration-300", open && "rotate-180")}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-3.5 bottom-0 h-[2px] origin-left rounded-full bg-fg transition-[scale,background-color] duration-[var(--spring-dur)] ease-[var(--spring)]",
            groupActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:bg-fg-3",
          )}
        />
      </button>

      {/* Panel flyout */}
      <div
        role="menu"
        data-open={open}
        style={{ "--origin": "top left" } as CSSProperties}
        className="ios-pop mat absolute left-0 top-[calc(100%+10px)] z-50 w-[320px] overflow-hidden rounded-l border border-line/70 bg-[var(--glass)] p-1.5 shadow-[var(--shadow)] backdrop-blur-xl backdrop-saturate-150"
      >
        {items.map(({ href, key, icon: Icon, tone }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              role="menuitem"
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "group/item flex items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors duration-150",
                active ? "text-fg" : "text-fg-2 hover:bg-fg/[0.06] hover:text-fg",
              )}
            >
              <AppIcon tone={tone} size={36}>
                <Icon filled />
              </AppIcon>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.005em]">
                  {t.nav[key as keyof typeof t.nav] as string}
                  {key === "library" && libraryLock && (
                    <span className="caps inline-flex items-center gap-1 rounded-xs bg-raised px-1.5 py-0.5 text-[9.5px] text-fg-2">
                      <Lock width={10} height={10} aria-hidden="true" />
                      {libraryLock}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-fg-3">
                  {t.nav.desc[key as keyof typeof t.nav.desc]}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

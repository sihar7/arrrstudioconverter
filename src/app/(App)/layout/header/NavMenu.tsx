"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavArrowDown } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
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
          "caps group relative flex items-center gap-1.5 px-3.5 transition-colors duration-300",
          groupActive || open ? "text-fg" : "text-fg-3 hover:text-fg",
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
            "absolute inset-x-3.5 bottom-0 h-px origin-left bg-fg transition-transform duration-500 ease-[var(--ease)]",
            groupActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:bg-fg-3",
          )}
        />
      </button>

      {/* Panel flyout */}
      <div
        role="menu"
        className={cn(
          "mat absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] origin-top-left overflow-hidden rounded-l border border-line/70 bg-[var(--glass)] p-1.5 shadow-[var(--shadow)] backdrop-blur-xl backdrop-saturate-150 transition-[opacity,transform] duration-200 ease-[var(--ease)]",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        {items.map(({ href, key, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              role="menuitem"
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "state-layer group/item flex items-center gap-3.5 rounded-s px-3 py-2.5 transition-colors",
                active ? "bg-fg/[0.06] text-fg" : "text-fg-2 hover:text-fg",
              )}
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-s transition-colors",
                  active ? "btn-plate bg-accent text-on-accent" : "bg-tonal text-fg-2 group-hover/item:text-fg",
                )}
              >
                <Icon width={19} height={19} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold tracking-[-0.005em]">
                  {t.nav[key as keyof typeof t.nav] as string}
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

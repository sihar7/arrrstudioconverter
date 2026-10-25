"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, NavArrowRight, Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { QuotaPill } from "@/components/shared/UserMenu";
import IconButton from "@/components/ui/IconButton";
import { NAV } from "./Header";

/**
 * Menu navigasi HP (< xl): panel turun dari atas berisi tujuan utama + deskripsi singkat.
 * <dialog> modal → fokus terkunci, Esc menutup; tertutup otomatis saat pindah halaman.
 */
export default function MobileMenu({ activeHref }: { activeHref?: string }) {
  const { t } = useT();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Pindah halaman → tutup
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <IconButton
        label={t.nav.menu}
        aria-expanded={open}
        aria-haspopup="dialog"
        icon={<Menu width={20} height={20} />}
        onClick={() => setOpen(true)}
        className="xl:hidden"
      />
      <dialog
        ref={ref}
        aria-label={t.nav.menu}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        className="menu-sheet mat m-0 mt-2 w-[calc(100%-16px)] max-w-none translate-x-2 overflow-hidden rounded-l border border-line/70 bg-raised p-0 text-fg backdrop:bg-[var(--scrim)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2 pl-5 pr-2">
          <span className="caps text-[11px] text-fg-3">{t.nav.menu}</span>
          <div className="flex items-center gap-1">
            <QuotaPill />
            <IconButton label={t.common.close} icon={<Xmark width={18} height={18} />} onClick={() => setOpen(false)} />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-px bg-line/60 sm:grid-cols-2">
          {NAV.map(({ href, key, icon: Icon }, i) => {
            const active = href === activeHref;
            return (
              <li key={href} className="menu-item bg-raised" style={{ animationDelay: `${60 + i * 40}ms` }}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "state-layer group relative flex min-h-[64px] items-center gap-4 px-5 py-3.5 transition-colors",
                    active ? "text-fg" : "text-fg-2 hover:text-fg",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-s transition-colors",
                      active ? "btn-plate bg-accent text-on-accent" : "bg-tonal text-fg-2 group-hover:text-fg",
                    )}
                  >
                    <Icon width={20} height={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{t.nav[key]}</span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-fg-3">{t.nav.desc[key]}</span>
                  </span>
                  <NavArrowRight
                    width={16}
                    height={16}
                    className="shrink-0 text-fg-3 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                  {/* Aktif = garis bawah (konvensi navbar) */}
                  {active && <span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-0.5 bg-accent" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}

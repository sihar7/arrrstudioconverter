"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, NavArrowRight, Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { QuotaPill } from "@/components/shared/UserMenu";
import IconButton from "@/components/ui/IconButton";
import AppIcon from "@/components/ui/AppIcon";
import { NAV, type NavItem } from "./Header";

/**
 * Menu navigasi HP (< xl): panel turun dari atas berisi tujuan utama + deskripsi singkat.
 * <dialog> modal → fokus terkunci, Esc menutup; tertutup otomatis saat pindah halaman.
 */
export default function MobileMenu({ activeHref, items = NAV }: { activeHref?: string; items?: readonly NavItem[] }) {
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
        {/* Daftar grouped-inset ala iOS: garis rambut dimulai setelah ikon */}
        <ul className="m-3 overflow-hidden rounded-[14px] bg-fg/[0.045]">
          {items.map(({ href, key, icon: Icon, tone }, i) => {
            const active = href === activeHref;
            return (
              <li key={href} className="menu-item group/row relative" style={{ animationDelay: `${40 + i * 35}ms` }}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-[60px] items-center gap-3.5 px-3.5 py-2.5 transition-colors duration-150 active:bg-fg/[0.08]",
                    active ? "text-fg" : "text-fg-2 hover:text-fg",
                  )}
                >
                  <AppIcon tone={tone} size={38}>
                    <Icon filled />
                  </AppIcon>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold tracking-[-0.01em]">{t.nav[key as keyof typeof t.nav] as string}</span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-fg-3">
                      {t.nav.desc[key as keyof typeof t.nav.desc]}
                    </span>
                  </span>
                  <NavArrowRight
                    width={16}
                    height={16}
                    className="shrink-0 text-fg-3 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                  <span aria-hidden="true" className="absolute bottom-0 left-[66px] right-0 h-[0.5px] bg-[var(--hairline)] group-last/row:hidden" />
                  {/* Aktif = garis bawah (konvensi situs) */}
                  {active && <span aria-hidden="true" className="absolute bottom-0 left-[66px] right-3.5 h-[2px] rounded-full bg-fg" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </dialog>
    </>
  );
}

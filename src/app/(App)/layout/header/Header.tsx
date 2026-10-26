"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Album, ClockRotateRight, Crown, Lock, MusicDoubleNote, Settings } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { useScrolled } from "@/hooks/useScrollState";
import { useMeQuery } from "@/store/api/baseApi";
import Logo, { LogoMark } from "@/components/shared/Logo";
import UserMenu, { QuotaPill } from "@/components/shared/UserMenu";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import ScrollTopFab from "@/components/shared/ScrollTopFab";
import MobileMenu from "./MobileMenu";
import NavMenu from "./NavMenu";

export const NAV = [
  { href: "/converter", key: "converter", icon: MusicDoubleNote },
  { href: "/library", key: "library", icon: Album },
  { href: "/history", key: "history", icon: ClockRotateRight },
  { href: "/pricing", key: "pricing", icon: Crown },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

// Tab bar bawah HP maksimal 4 tujuan (label tetap terbaca di 375px) — Harga ada di menu & dropdown akun
const TAB_NAV = NAV.filter((n) => n.href !== "/pricing");

// Menu khusus admin aplikasi (lihat isAppAdmin di BE) — hanya muncul di navbar untuk admin.
export const ADMIN_NAV = [{ href: "/obfuscator", key: "obfuscator", icon: Lock }] as const;

export type NavItem = { href: string; key: string; icon: typeof MusicDoubleNote };

/**
 * Navbar tunggal untuk SEMUA halaman (landing & app) — tata letak editorial ala ferrari.com.
 * Desktop (xl+): tautan kapital di kiri · logo di tengah · utilitas & akun di kanan.
 * < xl: logo kiri + utilitas + tombol menu (panel navigasi) — tab bar bawah tetap ada untuk jangkauan jempol.
 * Saat discroll bar TIDAK berubah bentuk (tinggi & lebar tetap) — hanya muncul latar kaca + garis bawah
 * supaya teks tetap terbaca di atas konten. overlay = landing: posisinya fixed di atas hero.
 */
export default function Header({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname();
  const { t } = useT();
  const scrolled = useScrolled();
  const { data: me } = useMeQuery();
  const isAdmin = Boolean(me?.user?.isAdmin);
  const items: readonly NavItem[] = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  const activeHref = items.find((n) => pathname.startsWith(n.href))?.href;
  // Desktop: Converter + Audio saya digabung ke dropdown "Studio"; sisanya tetap tautan datar.
  const grouped = new Set<string>(["/converter", "/library"]);
  const groupItems = items.filter((n) => grouped.has(n.href));
  const flatItems = items.filter((n) => !grouped.has(n.href));

  return (
    <>
      <header
        className={cn(
          "top-0 z-50 h-[var(--nav-h)] animate-[nav-in_.8s_var(--ease)_both] border-b transition-[background-color,border-color,box-shadow] duration-300 ease-[var(--ease)]",
          overlay ? "fixed inset-x-0" : "sticky",
          // Latar + garis bawah hanya muncul setelah discroll; bentuk bar tetap sama (tanpa morph "island")
          scrolled
            ? "border-line/70 bg-[var(--glass)] shadow-[var(--shadow)] backdrop-blur-xl backdrop-saturate-150"
            : overlay
              ? "border-transparent bg-transparent"
              : "border-line/50 bg-transparent",
        )}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[70] focus:rounded-s focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
        >
          {t.common.skip}
        </a>
        <div className="relative mx-auto grid h-[var(--nav-h)] max-w-[var(--wrap)] grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-8">
          {/* Kiri: logo (< xl) / tautan utama (xl+) */}
          <div className="flex min-w-0 items-center">
            <span className="xl:hidden">
              <Logo />
            </span>
            <nav aria-label="Main" className="hidden h-full items-stretch gap-1 xl:flex">
              {groupItems.length > 0 && <NavMenu label={t.nav.studio} items={groupItems} activeHref={activeHref} />}
              {flatItems.map(({ href, key }) => {
                const active = href === activeHref;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "caps group relative flex items-center px-3.5 transition-colors duration-300",
                      active ? "text-fg" : "text-fg-3 hover:text-fg",
                    )}
                  >
                    {t.nav[key as keyof typeof t.nav] as string}
                    {/* Garis bawah aktif menempel di tepi bawah navbar; hover memberi pratinjau */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-3.5 bottom-0 h-px origin-left bg-fg transition-transform duration-500 ease-[var(--ease)]",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:bg-fg-3",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Tengah: emblem simetris (xl+) — absolut di tengah bar, tidak terdorong lebar sisi kiri/kanan */}
          <Link
            href="/"
            aria-label="ARRR Studio Converter"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-fg transition-opacity hover:opacity-80 xl:flex"
          >
            <LogoMark priority />
            <span className="whitespace-nowrap pl-[0.3em] text-[9px] font-bold tracking-[0.3em]">ARRR STUDIO</span>
          </Link>

          {/* Kanan: utilitas & akun */}
          <div className="flex items-center justify-end gap-1">
            <span className="hidden xl:contents">
              <QuotaPill />
            </span>
            <LangToggle />
            <ThemeToggle />
            <span aria-hidden="true" className="mx-1.5 hidden h-5 w-px bg-line sm:block" />
            <UserMenu />
            <MobileMenu activeHref={activeHref} items={items} />
          </div>
        </div>
      </header>

      {/* Tab bar tampil di SEMUA halaman (< xl) — termasuk landing, supaya pindah menu selalu satu ketukan */}
      <TabBar activeHref={activeHref} />
      {/* Di luar <header>: backdrop-filter membuat elemen fixed di dalamnya ikut terkunci ke header */}
      <ScrollTopFab lifted />
    </>
  );
}

/** Tab bar bawah (< xl) — ikon + label, indikator garis atas. Tetap 4 menu inti (menu admin cukup di navbar/menu HP). */
function TabBar({ activeHref }: { activeHref?: string }) {
  const { t } = useT();
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/70 bg-[var(--glass)] pb-[env(safe-area-inset-bottom)] shadow-[inset_0_1px_0_var(--mat-edge)] backdrop-blur-md xl:hidden"
    >
      <ul className="mx-auto grid h-[68px] max-w-xl grid-cols-4">
        {TAB_NAV.map(({ href, key, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "state-layer group relative flex h-full flex-col items-center justify-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300 active:scale-95",
                  active ? "bg-fg/[0.06] text-fg" : "text-fg-3 hover:text-fg",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-4 top-0 h-0.5 bg-accent transition-transform duration-500 ease-[var(--ease)]",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                />
                <Icon width={22} height={22} strokeWidth={active ? 1.9 : 1.6} />
                {t.nav[key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

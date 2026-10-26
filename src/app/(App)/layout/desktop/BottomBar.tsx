"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder } from "iconoir-react";
import { SfClock, SfCube, SfCutout, SfEnlarge, SfGear, SfPlayRect, SfStack, SfWaveform } from "@/components/icons/SfIcons";
import { QuotaPill } from "@/components/shared/UserMenu";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/type/desktop";
import type { NavItem } from "../header/Header";
import GroupMenu, { type NavGroup } from "./GroupMenu";

const CONVERTER: NavItem = { href: "/converter", key: "converter", icon: SfWaveform, tone: "pink" };
const YOUTUBE: NavItem = { href: "/youtube", key: "youtube", icon: SfPlayRect, tone: "red" };
const SKYBOX: NavItem = { href: "/skybox", key: "skybox", icon: SfCube, tone: "teal" };
const REMOVE_BG: NavItem = { href: "/remove-bg", key: "removeBg", icon: SfCutout, tone: "indigo" };
const UPSCALE: NavItem = { href: "/upscale", key: "upscale", icon: SfEnlarge, tone: "yellow" };
const LIBRARY: NavItem = { href: "/library", key: "library", icon: SfStack, tone: "purple" };
const HISTORY: NavItem = { href: "/history", key: "history", icon: SfClock, tone: "blue" };
const SETTINGS: NavItem = { href: "/settings", key: "settings", icon: SfGear, tone: "gray" };

// Urutan = pintasan Ctrl/⌘+1… (desktop/src/config.js NAV_SHORTCUTS)
const SHORTCUTS = [CONVERTER, YOUTUBE, SKYBOX, REMOVE_BG, UPSCALE, LIBRARY, HISTORY].map((n) => n.href);
const shortcut = (href: string) => {
  const i = SHORTCUTS.indexOf(href);
  return i < 0 ? undefined : i + 1;
};

/**
 * Bottom bar app desktop — menempel di tepi bawah jendela: kiri sisa kuota · tengah kapsul grup
 * (Studio · Gambar · Pustaka → popover) + Pengaturan · kanan folder simpan. Thumb di kapsul meluncur
 * dengan pegas ke grup yang memuat halaman aktif (garis bawah kecil = konvensi aktif situs).
 * Harga sengaja tidak ada di app desktop (upgrade lewat kartu paket di menu profil).
 */
export default function BottomBar() {
  const pathname = usePathname();
  const { t, lang } = useT();
  const { data: me } = useMeQuery();
  const member = Boolean(me?.user);
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);

  const groups: NavGroup[] = [
    {
      id: "studio",
      label: t.nav.studio,
      icon: SfWaveform,
      // YouTube di dalam app butuh app desktop v1.1+ (bridge youtube)
      items: [CONVERTER, ...(getDesktop()?.youtube ? [YOUTUBE] : []), ...(member ? [SKYBOX] : [])],
    },
    ...(member ? [{ id: "images", label: t.nav.images, icon: SfCutout, items: [REMOVE_BG, UPSCALE] }] : []),
    { id: "shelf", label: t.desktop.shelf, icon: SfStack, items: [LIBRARY, HISTORY] },
  ];
  const activeHref = [...groups.flatMap((g) => g.items), SETTINGS].find((n) => pathname.startsWith(n.href))?.href;
  const settingsActive = activeHref === SETTINGS.href;

  // Pindah halaman → panel tertutup
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
  }

  // Klik di luar bar / Esc → tutup
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Thumb ditulis langsung ke DOM (tanpa render ulang); ukur ulang saat lebar tombol berubah (ganti bahasa)
  const listRef = useRef<HTMLUListElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    const thumb = thumbRef.current;
    if (!list || !thumb) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(":scope > li > [data-group-active], :scope > li > a[aria-current='page']");
      thumb.style.opacity = el ? "1" : "0";
      if (!el) return;
      thumb.style.translate = `${el.getBoundingClientRect().left - list.getBoundingClientRect().left - list.clientLeft}px 0`;
      thumb.style.width = `${el.offsetWidth}px`;
    };
    measure();
    const frame = requestAnimationFrame(() => thumb.removeAttribute("data-init"));
    const ro = new ResizeObserver(measure);
    list.querySelectorAll(":scope > li").forEach((li) => ro.observe(li));
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [activeHref, member, lang]);

  const desktop = getDesktop();

  return (
    <nav
      ref={root}
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-50 grid h-[var(--dock-h)] grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line/60 bg-bg px-4"
    >
      <div className="min-w-0 max-[899px]:invisible">
        <QuotaPill />
      </div>

      <ul ref={listRef} className="relative flex h-11 items-center gap-0.5 rounded-[14px] border border-line/50 bg-surface p-1">
        <span
          ref={thumbRef}
          aria-hidden="true"
          data-init=""
          className="absolute left-0 top-1 h-9 rounded-[10px] bg-raised shadow-[0_1px_2px_rgb(0_0_0/0.18),inset_0_0.5px_0_rgb(255_255_255/0.06)] transition-[translate,width,opacity] duration-[var(--spring-dur)] ease-[var(--spring)] data-[init]:transition-none light:bg-surface light:shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.06)]"
        >
          <span className="absolute inset-x-0 bottom-[3px] mx-auto h-[2px] w-4 rounded-full bg-fg" />
        </span>

        {groups.map((g) => (
          <GroupMenu
            key={g.id}
            group={g}
            open={open === g.id}
            activeHref={activeHref}
            shortcut={shortcut}
            onOpen={() => setOpen(g.id)}
            onClose={() => setOpen(null)}
            onHover={() => open && open !== g.id && setOpen(g.id)}
          />
        ))}

        <li aria-hidden="true" className="mx-1 size-1 shrink-0 rounded-full bg-fg/20" />
        <li>
          <Link
            href={SETTINGS.href}
            aria-current={settingsActive ? "page" : undefined}
            title={t.nav.settings}
            className={cn(
              "group relative z-10 flex h-9 items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150 active:scale-[0.97]",
              settingsActive ? "text-fg" : "text-fg-3 hover:bg-fg/[0.05] hover:text-fg",
            )}
          >
            <SfGear size={18} filled={settingsActive} />
            <span className="whitespace-nowrap max-[999px]:sr-only">{t.nav.settings}</span>
          </Link>
        </li>
      </ul>

      <div className="flex min-w-0 justify-end max-[899px]:invisible">
        {desktop && (
          <button
            type="button"
            onClick={() => desktop.openDownloadsFolder()}
            title={t.desktop.openFolder}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium text-fg-3 transition-colors duration-150 hover:bg-fg/[0.05] hover:text-fg active:scale-[0.97]"
          >
            <Folder width={17} height={17} strokeWidth={1.8} />
            <span className="whitespace-nowrap max-[1199px]:sr-only">{t.desktop.openFolder}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChatBubble, Search, SidebarCollapse, SidebarExpand, ViewGrid } from "iconoir-react";
import ConvList from "../../alice/_components/ConvList";
import ClaudeSidebar from "../../alice/_components/ClaudeSidebar";
import { useAlice } from "../../alice/_lib/store";
import { claudeBridge } from "../../alice/_lib/claudeView";
import { LogoMark } from "@/components/shared/Logo";
import UserMenu, { useQuotaText } from "@/components/shared/UserMenu";
import { useAppSelector } from "@/store/hooks";
import { isRunning } from "@/store/slices/converterSlice";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import type { NavItem } from "../header/Header";
import { D_CONVERTER, D_SETTINGS, isMac, navSections, shortcutOf } from "./nav";

interface Props {
  rail: boolean;
  onToggleRail: () => void;
  onOpenPalette: () => void;
}

/**
 * Sidebar app desktop (acuan: source list Apple Music): pencarian/command palette · bagian Studio, Gambar,
 * Pustaka · kuota · Pengaturan · akun. Sorotan aktif = satu pill yang meluncur vertikal dengan pegas.
 * Lebar dari CSS var --side-w; mode rail (ikon saja) otomatis di jendela sempit atau lewat tombol ciutkan.
 */
export default function Sidebar({ rail, onToggleRail, onOpenPalette }: Props) {
  const pathname = usePathname();
  const { t, lang } = useT();
  const { data: me } = useMeQuery();
  const member = Boolean(me?.user);
  // Admin: dua mode sidebar — Studio (menu app) & Alice (daftar chat, acuan Claude Desktop)
  const isAdmin = Boolean(me?.user?.isAdmin);
  const aliceMode = isAdmin && pathname.startsWith(ALICE_HREF);
  // Mode Alice memakai Claude.ai asli (langganan) bila app desktop mendukung, selain itu chat API
  const engine = useAlice((s) => s.engine);
  const claudeOn = engine === "claude" && Boolean(claudeBridge());
  useEffect(() => {
    if (!pathname.startsWith(ALICE_HREF)) sessionStorage.setItem(LAST_STUDIO_KEY, pathname);
  }, [pathname]);
  const sections = navSections(member);
  const all = [...sections.flatMap((s) => s.items), D_SETTINGS];
  const activeHref = all.find((n) => pathname.startsWith(n.href))?.href;
  const labels = { studio: t.nav.studio, images: t.nav.images, shelf: t.desktop.shelf };

  // Pill aktif ditulis langsung ke DOM (tanpa render ulang); ukur ulang saat isi berubah (login, bahasa, rail)
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const measure = () => {
      const el = nav.querySelector<HTMLElement>("a[aria-current='page']");
      pill.style.opacity = el ? "1" : "0";
      if (!el) return;
      const top = el.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
      pill.style.translate = `0 ${top}px`;
      pill.style.height = `${el.offsetHeight}px`;
    };
    measure();
    const frame = requestAnimationFrame(() => pill.removeAttribute("data-init"));
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [activeHref, member, lang, rail]);

  return (
    <aside
      aria-label="App"
      className="side-glass fixed inset-y-0 left-0 z-50 flex w-[var(--side-w)] flex-col border-r border-[var(--hairline)] transition-[width] duration-[var(--spring-dur)] ease-[var(--spring)]"
    >
      {/* Strip atas = area seret jendela (macOS: tempat tombol lampu lalu lintas) */}
      <div className="app-drag flex h-[var(--bar-h)] shrink-0 items-center gap-2.5 px-4 mac:justify-end mac:pl-[84px] rail:justify-center rail:px-0 mac:rail:pl-0 mac:rail:pt-7">
        <span className={cn("flex min-w-0 flex-1 items-center gap-2.5 mac:hidden", rail && "hidden")}>
          <LogoMark size={28} priority />
          <span className="truncate text-[11px] font-bold tracking-[0.22em]">ARRR STUDIO</span>
        </span>
        <button
          type="button"
          onClick={onToggleRail}
          aria-label={rail ? t.desktop.shell.expand : t.desktop.shell.collapse}
          title={rail ? t.desktop.shell.expand : t.desktop.shell.collapse}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95"
        >
          {rail ? <SidebarExpand width={18} height={18} /> : <SidebarCollapse width={18} height={18} />}
        </button>
      </div>

      <div className="px-3 pb-2 rail:px-2.5">
        <button
          type="button"
          onClick={onOpenPalette}
          title={rail ? t.desktop.shell.search : undefined}
          className="group flex h-9 w-full cursor-pointer items-center gap-2 rounded-[10px] bg-fg/[0.06] px-2.5 text-[13px] text-fg-3 ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-fg/[0.09] hover:text-fg-2 active:scale-[0.98] rail:justify-center rail:px-0"
        >
          <Search width={15} height={15} strokeWidth={2} className="shrink-0" />
          <span className="flex-1 truncate text-left rail:hidden">{t.desktop.shell.search}</span>
          <kbd className="rounded-[5px] bg-fg/[0.07] px-1.5 py-px font-sans text-[11px] font-medium text-fg-3 rail:hidden">{isMac() ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </div>

      {isAdmin && <ModeSwitch alice={aliceMode} rail={rail} />}

      {aliceMode && (
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1.5 rail:px-2.5">
          {claudeOn ? <ClaudeSidebar rail={rail} /> : <ConvList rail={rail} />}
        </div>
      )}

      <nav ref={navRef} hidden={aliceMode} className="thin-scroll relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 rail:px-2.5">
        <span
          ref={pillRef}
          aria-hidden="true"
          data-init=""
          className="absolute inset-x-3 top-0 rounded-[9px] bg-fg/[0.09] shadow-[inset_0_0.5px_0_rgb(255_255_255/0.06)] transition-[translate,height,opacity] duration-[var(--spring-dur)] ease-[var(--spring)] data-[init]:transition-none light:bg-black/[0.07] rail:inset-x-2.5"
        />
        {sections.map((s) => (
          <div key={s.id} className="mt-4 first:mt-1.5">
            <p className="mb-1 px-2.5 text-[11px] font-semibold text-fg-3 rail:sr-only">{labels[s.id]}</p>
            <ul className="flex flex-col gap-px">
              {s.items.map((n) => (
                <li key={n.href}>
                  <SideLink item={n} active={activeHref === n.href} rail={rail} trailing={n.href === D_CONVERTER.href ? <QueueBadge /> : undefined} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-[var(--hairline)] p-3 rail:px-2.5">
        <QuotaMeter rail={rail} />
        <SideLink item={D_SETTINGS} active={activeHref === D_SETTINGS.href} rail={rail} solid />
        <div className="mt-1">
          <UserMenu placement="up" full={!rail} />
        </div>
      </div>
    </aside>
  );
}

const ALICE_HREF = "/alice";
const LAST_STUDIO_KEY = "arrc:last-studio";

/**
 * Pengalih mode (admin): kapsul Studio | Alice dengan thumb yang meluncur. Studio → halaman terakhir sebelum masuk
 * Alice. Rail: satu tombol ikon yang berganti mode.
 */
function ModeSwitch({ alice, rail }: { alice: boolean; rail: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const go = (toAlice: boolean) => {
    if (toAlice === alice) return;
    router.push(toAlice ? ALICE_HREF : sessionStorage.getItem(LAST_STUDIO_KEY) || D_CONVERTER.href);
  };
  if (rail) {
    const label = alice ? t.alice.modeStudio : t.alice.modeAlice;
    return (
      <div className="px-2.5 pb-1">
        <button
          type="button"
          onClick={() => go(!alice)}
          aria-label={label}
          title={label}
          className="grid h-9 w-full cursor-pointer place-items-center rounded-[9px] text-fg-2 transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          {alice ? <ViewGrid width={18} height={18} /> : <ChatBubble width={18} height={18} />}
        </button>
      </div>
    );
  }
  return (
    <div className="px-3 pb-1">
      <div role="tablist" aria-label="Mode" className="relative grid h-8 grid-cols-2 rounded-[9px] bg-fg/[0.06] p-0.5 ring-1 ring-inset ring-[var(--hairline)]">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[7px] bg-[var(--seg-thumb)] shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-[var(--spring-dur)] ease-[var(--spring)]",
            alice && "translate-x-full",
          )}
        />
        {([false, true] as const).map((isAlice) => (
          <button
            key={String(isAlice)}
            type="button"
            role="tab"
            aria-selected={alice === isAlice}
            onClick={() => go(isAlice)}
            className={cn(
              "relative z-10 flex cursor-pointer items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-colors",
              alice === isAlice ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {isAlice ? <ChatBubble width={14} height={14} /> : <ViewGrid width={14} height={14} />}
            {isAlice ? t.alice.modeAlice : t.alice.modeStudio}
          </button>
        ))}
      </div>
    </div>
  );
}

function SideLink({ item, active, rail, trailing, solid }: { item: NavItem; active: boolean; rail: boolean; trailing?: ReactNode; solid?: boolean }) {
  const { t } = useT();
  const Icon = item.icon;
  const label = t.nav[item.key as keyof typeof t.nav] as string;
  const key = shortcutOf(item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={rail ? label : undefined}
      className={cn(
        "group/link relative z-10 flex h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium tracking-[-0.01em] transition-[color,background-color,scale] duration-150 active:scale-[0.97] rail:justify-center rail:px-0",
        active ? "text-fg" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg",
        // Pengaturan di luar <nav> → sorotan sendiri (pill meluncur hanya untuk menu utama)
        solid && active && "bg-fg/[0.09] light:bg-black/[0.07]",
      )}
    >
      <Icon
        size={18}
        filled={active}
        className={cn("shrink-0 transition-transform duration-200 group-hover/link:scale-105", active ? "text-fg" : "text-fg-3 group-hover/link:text-fg-2")}
      />
      <span className="min-w-0 flex-1 truncate rail:sr-only">{label}</span>
      {trailing}
      {key && !trailing && (
        <kbd className="font-sans text-[11px] text-fg-3 opacity-0 transition-opacity group-hover/link:opacity-100 rail:hidden">
          {isMac() ? "⌘" : "Ctrl "}
          {key}
        </kbd>
      )}
    </Link>
  );
}

/** Jumlah lagu di antrean (belum selesai); titik berdenyut saat ada yang sedang diproses */
function QueueBadge() {
  const open = useAppSelector((s) => s.converter.items.filter((i) => i.status !== "done").length);
  const running = useAppSelector((s) => s.converter.items.some((i) => isRunning(i.status)));
  if (!open) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5 rail:absolute rail:right-1 rail:top-1">
      {running && <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-[var(--ios-green)] rail:hidden" />}
      <span className="min-w-5 rounded-full bg-fg/[0.1] px-1.5 text-center text-[11px] font-semibold leading-5 tabular-nums text-fg-2 rail:min-w-4 rail:px-1 rail:text-[10px] rail:leading-4">
        {open}
      </span>
    </span>
  );
}

/** Sisa token (tamu: gratis) sebagai meter tipis + kapan terisi lagi; admin tanpa batas → disembunyikan */
function QuotaMeter({ rail }: { rail: boolean }) {
  const q = useQuotaText();
  if (!q) return null;
  const { left, limit, low } = q;
  const pct = limit ? Math.max(0, Math.min(1, left / limit)) : 0;
  if (rail) {
    return (
      <span title={q.long} className={cn("mx-auto mb-1 text-[11px] font-semibold tabular-nums", low ? "text-warn" : "text-fg-3")}>
        {left}/{limit}
      </span>
    );
  }
  return (
    <div className="mb-1 px-2.5 py-1.5" title={q.long}>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-medium text-fg-2">{q.short}</span>
        {q.reset && <span className="truncate text-fg-3">{q.reset}</span>}
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fg/[0.08]">
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease)]", low ? "bg-warn" : "bg-accent")} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { NavArrowUp } from "iconoir-react";
import AppIcon from "@/components/ui/AppIcon";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/type/desktop";
import type { NavItem } from "../header/Header";

export type NavGroup = { id: string; label: string; icon: NavItem["icon"]; items: readonly NavItem[] };

/**
 * Satu grup bottom bar + popover-nya (gaya sama dengan menu profil): muncul dari tombol ke atas dengan pegas.
 * Isi: ubin ikon · nama · deskripsi · pintasan Ctrl+angka. Keyboard: ↑/↓ antar item, Esc tutup.
 */
export default function GroupMenu({
  group,
  open,
  activeHref,
  shortcut,
  onOpen,
  onClose,
  onHover,
}: {
  group: NavGroup;
  open: boolean;
  activeHref?: string;
  /** href → nomor pintasan (Ctrl/⌘ + n) */
  shortcut: (href: string) => number | undefined;
  onOpen: () => void;
  onClose: () => void;
  /** Panel lain sedang terbuka → pindah ke grup ini saat kursor lewat (perilaku menubar) */
  onHover: () => void;
}) {
  const { t } = useT();
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const active = group.items.find((n) => n.href === activeHref);
  const TriggerIcon = active?.icon ?? group.icon;
  const isMac = getDesktop()?.platform === "darwin";

  // Dibuka lewat keyboard → fokus item pertama (atau yang aktif)
  const focusOnOpen = useRef(false);
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    const items = panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const current = panel.current?.querySelector<HTMLElement>('[aria-current="page"]');
    (current ?? items?.[0])?.focus();
  }, [open]);

  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusOnOpen.current = true;
      onOpen();
    }
  };

  const onPanelKey = (e: KeyboardEvent) => {
    const items = [...(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      trigger.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };

  return (
    <li className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? onClose() : onOpen())}
        onKeyDown={onTriggerKey}
        onPointerEnter={onHover}
        data-group-active={active ? "" : undefined}
        style={active ? ({ "--tone": `var(--ios-${active.tone})` } as CSSProperties) : undefined}
        className={cn(
          "group relative z-10 flex h-9 cursor-pointer items-center gap-2 rounded-[10px] pl-3 pr-2.5 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150 active:scale-[0.97]",
          active || open ? "text-fg" : "text-fg-3 hover:bg-fg/[0.05] hover:text-fg",
        )}
      >
        <span className={cn("grid place-items-center transition-colors duration-200", active ? "text-[var(--tone)]" : "group-hover:text-fg-2")}>
          <TriggerIcon size={18} filled={Boolean(active)} />
        </span>
        <span className="whitespace-nowrap">{group.label}</span>
        <NavArrowUp
          width={13}
          height={13}
          strokeWidth={2.2}
          className={cn("text-fg-3 transition-transform duration-[var(--spring-dur)] ease-[var(--spring-bounce)]", open ? "rotate-0" : "rotate-180")}
        />
      </button>

      {/* Popover gaya menu profil (iOS): muncul dari tombol ke atas */}
      <div
        ref={panel}
        id={menuId}
        role="menu"
        aria-label={group.label}
        data-open={open}
        onKeyDown={onPanelKey}
        style={{ "--origin": "bottom center" } as CSSProperties}
        className="ios-pop mat absolute bottom-[calc(100%+12px)] left-1/2 -ml-[150px] w-[300px] rounded-l border border-line/70 bg-raised p-1.5 shadow-[var(--elev-3)] data-[open=false]:translate-y-1"
      >
        <p className="caps px-3 pb-1 pt-2 text-[10.5px] text-fg-3">{group.label}</p>
        {group.items.map((n) => {
          const Icon = n.icon;
          const current = n.href === activeHref;
          const key = shortcut(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              role="menuitem"
              aria-current={current ? "page" : undefined}
              onClick={onClose}
              className={cn(
                "state-layer flex min-h-11 items-center gap-3 rounded-s px-2.5 py-2 transition-colors hover:bg-hover",
                current && "bg-hover",
              )}
            >
              <AppIcon tone={n.tone} size={32}>
                <Icon filled />
              </AppIcon>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold tracking-[-0.01em] text-fg">{t.nav[n.key as keyof typeof t.nav] as string}</span>
                <span className="block truncate text-[12px] text-fg-3">{t.nav.desc[n.key as keyof typeof t.nav.desc]}</span>
              </span>
              {key && (
                <span className="shrink-0 text-[11.5px] tabular-nums text-fg-3">
                  {isMac ? "⌘" : "Ctrl+"}
                  {key}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </li>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Folder, HalfMoon, Language, Plus, Search, Youtube } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLang, setTheme } from "@/store/slices/preferencesSlice";
import { switchTheme } from "@/components/shared/PrefToggles";
import { useMeQuery } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/type/desktop";
import { searchLink } from "../../converter/_utils/helpers";
import { useQuickAdd } from "../../youtube/_hooks/useQuickAdd";
import { D_SETTINGS, navSections, shortcutOf, YT_SEARCH_EVENT } from "./nav";

interface Cmd {
  id: string;
  group: "nav" | "actions";
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

/**
 * Command palette app desktop (Ctrl/⌘+K): lompat ke menu, tempel link YouTube → langsung ke antrean,
 * ketik judul → cari di YouTube, plus aksi cepat (tema, bahasa, folder). Panah ↑↓ + Enter, Esc menutup.
 */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, f, lang } = useT();
  const p = t.desktop.palette;
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.preferences.theme);
  const { data: me } = useMeQuery();
  const { add } = useQuickAdd();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // Dibuka → kosongkan & fokus (state diatur saat render, bukan di effect)
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setQ("");
      setSel(0);
    }
  }
  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => router.push(href);
    const term = q.trim();
    const link = searchLink(term);
    const nav = [...navSections(Boolean(me?.user)).flatMap((s) => s.items), D_SETTINGS].map<Cmd>((n) => {
      const Icon = n.icon;
      const key = shortcutOf(n.href);
      return {
        id: n.href,
        group: "nav",
        label: t.nav[n.key as keyof typeof t.nav] as string,
        hint: key ? `Ctrl ${key}` : undefined,
        icon: <Icon size={17} />,
        run: go(n.href),
      };
    });
    const actions: Cmd[] = [];
    if (link) actions.push({ id: "add", group: "actions", label: p.addLink, hint: link.replace(/^https?:\/\/(www\.)?/, "").slice(0, 42), icon: <Plus width={17} height={17} />, run: () => void add(link) });
    else if (term)
      actions.push({
        id: "yt",
        group: "actions",
        label: f(p.searchYt, { q: term }),
        icon: <Youtube width={17} height={17} />,
        run: () => {
          if (pathname.startsWith("/youtube")) window.dispatchEvent(new CustomEvent(YT_SEARCH_EVENT, { detail: term }));
          else router.push(`/youtube?q=${encodeURIComponent(term)}`);
        },
      });
    actions.push(
      {
        id: "theme",
        group: "actions",
        label: p.theme,
        icon: <HalfMoon width={17} height={17} />,
        run: () => {
          const next = theme === "dark" ? "light" : "dark";
          switchTheme(next);
          dispatch(setTheme(next));
        },
      },
      { id: "lang", group: "actions", label: p.lang, icon: <Language width={17} height={17} />, run: () => dispatch(setLang(lang === "id" ? "en" : "id")) },
    );
    const desktop = getDesktop();
    if (desktop) actions.push({ id: "folder", group: "actions", label: p.folder, icon: <Folder width={17} height={17} />, run: () => void desktop.openDownloadsFolder() });

    if (!term || link) return [...actions.slice(0, link ? 1 : 0), ...nav, ...actions.slice(link ? 1 : 0)];
    const needle = term.toLowerCase();
    const hit = (c: Cmd) => c.label.toLowerCase().includes(needle);
    // Kata kunci bebas: menu yang cocok dulu, lalu "Cari di YouTube" (selalu ada), lalu aksi lain yang cocok
    return [...nav.filter(hit), actions[0], ...actions.slice(1).filter(hit)];
  }, [q, me?.user, t, f, p, lang, theme, pathname, router, dispatch, add]);

  const active = Math.min(sel, Math.max(0, cmds.length - 1));
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (c: Cmd | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  let lastGroup: Cmd["group"] | null = null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-center px-4 pt-[14vh]" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div aria-hidden="true" className="fade-in pointer-events-none absolute inset-0 bg-[var(--scrim)] backdrop-blur-[3px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p.placeholder}
        className="palette-in mat relative flex max-h-[min(520px,70vh)] w-full max-w-[620px] flex-col overflow-hidden rounded-[16px] border border-line/70 bg-raised shadow-[0_24px_80px_-12px_rgb(0_0_0/0.55),0_0_0_0.5px_rgb(255_255_255/0.04)]"
      >
        <label className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--hairline)] px-4">
          <Search width={18} height={18} className="shrink-0 text-fg-3" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setSel((i) => (i + 1) % cmds.length);
              else if (e.key === "ArrowUp") setSel((i) => (i - 1 + cmds.length) % cmds.length);
              else if (e.key === "Enter") run(cmds[active]);
              else if (e.key === "Escape") onClose();
              else return;
              e.preventDefault();
            }}
            placeholder={p.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={cmds[active] ? `cmd-${cmds[active].id}` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-3"
          />
          <kbd className="shrink-0 rounded-[5px] bg-fg/[0.07] px-1.5 py-0.5 font-sans text-[11px] text-fg-3">Esc</kbd>
        </label>
        <ul ref={list} id="palette-list" role="listbox" className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {cmds.length === 0 && <li className="px-3 py-8 text-center text-[13.5px] text-fg-3">{p.empty}</li>}
          {cmds.map((c, i) => {
            const header = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <li key={c.id} role="presentation">
                {header && <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold text-fg-3 first:pt-1">{c.group === "nav" ? p.nav : p.actions}</p>}
                <button
                  type="button"
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-i={i}
                  onPointerMove={() => i !== active && setSel(i)}
                  onClick={() => run(c)}
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center gap-3 rounded-[9px] px-2.5 text-left text-[14px] transition-colors duration-100",
                    i === active ? "bg-fg/[0.09] text-fg" : "text-fg-2",
                  )}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-[7px] bg-fg/[0.06]", i === active ? "text-fg" : "text-fg-3")}>{c.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="shrink-0 truncate font-mono text-[11px] text-fg-3">{c.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="shrink-0 border-t border-[var(--hairline)] px-4 py-2 text-[11.5px] text-fg-3">{p.hint}</p>
      </div>
    </div>
  );
}

"use client";

import { HalfMoon, SunLight } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLang, setTheme } from "@/store/slices/preferencesSlice";
import { useT } from "@/hooks/useT";
import IconButton from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/useHydrated";

export function switchTheme(next: "dark" | "light") {
  const html = document.documentElement;
  html.classList.add("theme-switching");
  html.dataset.theme = next;
  window.setTimeout(() => html.classList.remove("theme-switching"), 350);
}

export function ThemeToggle({ className }: { className?: string }) {
  // Gerbang hydration: nilai tersimpan baru dipakai setelah komponen ini selesai hydrate (lihat useT)
  const stored = useAppSelector((s) => s.preferences.theme);
  const theme = useHydrated() ? stored : "dark";
  const dispatch = useAppDispatch();
  const { t } = useT();
  return (
    <IconButton
      label={t.nav.theme}
      size="sm"
      className={className}
      icon={theme === "dark" ? <SunLight width={20} height={20} /> : <HalfMoon width={20} height={20} />}
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        switchTheme(next);
        dispatch(setTheme(next));
      }}
    />
  );
}

export function LangToggle({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const { t, lang } = useT(); // lang dari useT sudah melewati gerbang hydration
  // Dua pilihan terlihat sekaligus; yang aktif diberi garis bawah (sama dengan navbar)
  return (
    <div role="radiogroup" aria-label={t.nav.language} className={cn("flex h-10 items-center", className)}>
      {(["id", "en"] as const).map((l) => {
        const on = lang === l;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => dispatch(setLang(l))}
            className={cn(
              "relative flex h-full w-9 cursor-pointer items-center justify-center text-[12.5px] font-semibold uppercase transition-colors",
              on ? "text-fg" : "text-fg-3 hover:text-fg",
            )}
          >
            {l}
            <span
              aria-hidden="true"
              className={cn(
                "absolute bottom-1.5 h-0.5 w-4 rounded-full bg-fg transition-[transform,opacity] duration-300 ease-[var(--ease)]",
                on ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

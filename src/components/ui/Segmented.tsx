"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface Props<T extends string | number> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Radiogroup ber-indikator geser; panah kiri/kanan untuk keyboard */
export default function Segmented<T extends string | number>({ label, value, options, onChange, size = "md", className }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    for (let i = 1; i <= options.length; i++) {
      const n = (idx + dir * i + options.length) % options.length;
      if (!options[n].disabled) {
        onChange(options[n].value);
        refs.current[n]?.focus();
        break;
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cn("relative grid rounded-[11px] bg-fg/[0.08] p-[2px] desk:rounded-[8px]", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        // Thumb iOS: abu sistem (gelap) / putih (terang) ber-bayangan, meluncur dengan pegas
        className="absolute inset-y-[2px] left-[2px] rounded-[9px] bg-[var(--seg-thumb)] desk:rounded-[6px] shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-[var(--spring-dur)] ease-[var(--spring-bounce)]"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 cursor-pointer truncate rounded-[9px] px-2 font-semibold transition-colors duration-200 active:opacity-60 disabled:cursor-not-allowed disabled:opacity-35",
              "desk:rounded-[6px]",
              size === "md" ? "h-9 text-[13.5px] desk:h-7 desk:text-[12.5px]" : "h-7 text-[12.5px] desk:h-6 desk:text-[12px]",
              active ? "text-fg" : "text-fg-2 hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

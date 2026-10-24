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
      className={cn("relative grid rounded-s border border-line-2 p-[3px]", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="btn-plate absolute inset-y-[3px] left-[3px] rounded-xs bg-accent transition-transform duration-500 ease-[var(--ease)]"
        style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
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
              "state-layer relative z-10 cursor-pointer truncate rounded-xs px-2 font-semibold uppercase tracking-[0.1em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-35",
              size === "md" ? "h-10 text-[12px]" : "h-8 text-[11px]",
              active ? "text-on-accent" : "text-fg-2 hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

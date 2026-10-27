"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/**
 * Visual switch iOS (dipakai Switch & tombol toggle lain di dalam <button role="switch">):
 * kapsul hijau sistem saat aktif, knob putih meluncur dengan pegas & melebar saat ditekan (group-active).
 * size "sm" = 40×24 untuk baris rapat (toolbar, daftar lapisan).
 */
export function SwitchTrack({ on, size = "md" }: { on: boolean; size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-300",
        sm ? "h-6 w-10" : "h-[31px] w-[51px] desk:h-6 desk:w-10",
        on ? "bg-[var(--ios-green)]" : "bg-fg/[0.16]",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-[translate,width,margin] duration-[var(--spring-dur)] ease-[var(--spring-bounce)]",
          sm ? "h-5 w-5 group-active:w-6" : "h-[27px] w-[27px] group-active:w-[33px] desk:h-5 desk:w-5 desk:group-active:w-6",
          on ? (sm ? "translate-x-4 group-active:-ml-1" : "translate-x-5 group-active:-ml-1.5 desk:translate-x-4 desk:group-active:-ml-1") : "translate-x-0",
        )}
      />
    </span>
  );
}

export default function Switch({ label, hint, checked, onChange, disabled }: Props) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", disabled && "opacity-45")}>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[15px] font-medium text-fg desk:text-[13.5px]">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[13px] leading-snug text-fg-3 desk:text-[12px]">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group mt-0.5 shrink-0 cursor-pointer rounded-full disabled:cursor-not-allowed"
      >
        <SwitchTrack on={checked} />
      </button>
    </div>
  );
}

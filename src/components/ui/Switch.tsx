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

export default function Switch({ label, hint, checked, onChange, disabled }: Props) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4", disabled && "opacity-45")}>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[14px] font-medium text-fg">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-fg-3">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "group relative mt-0.5 inline-flex h-7 w-[50px] shrink-0 cursor-pointer items-center rounded-s border transition-colors duration-200",
          checked ? "btn-plate border-accent bg-accent" : "border-line-2 bg-hover",
        )}
      >
        <span
          className={cn(
            "inline-block shadow-[var(--elev-1)] transition-[transform,background-color] duration-300 ease-[var(--ease)]",
            checked ? "h-5 w-5 translate-x-[25px] rounded-xs bg-on-accent" : "h-5 w-5 translate-x-[3px] rounded-xs bg-line-2",
          )}
        />
      </button>
    </div>
  );
}

"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}

/** Slider dengan nilai tampil; klik nilai / dobel-klik track = kembali ke default */
export default function Slider({ label, value, min, max, step, defaultValue, onChange, format, disabled }: Props) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const changed = Math.abs(value - defaultValue) > 1e-9;
  return (
    <div className={cn("flex flex-col gap-1", disabled && "opacity-45")}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[14px] font-medium text-fg">
          {label}
        </label>
        <button
          type="button"
          onClick={() => onChange(defaultValue)}
          disabled={!changed || disabled}
          title={changed ? "Reset" : undefined}
          className={cn(
            "h-7 rounded-s px-2.5 font-mono text-[12px] tabular-nums transition-colors",
            changed ? "state-layer cursor-pointer bg-tonal text-on-tonal" : "text-fg-3",
          )}
        >
          {format ? format(value) : value}
        </button>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(defaultValue)}
        style={{ "--pct": `${pct}%` } as React.CSSProperties}
        aria-valuetext={format ? format(value) : String(value)}
      />
    </div>
  );
}

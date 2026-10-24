"use client";

import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { NAME_STYLES, type NameStyle } from "@/lib/shortName";

interface Props {
  value: NameStyle | null;
  onChange: (style: NameStyle) => void;
}

/** Pilihan potong nama otomatis dari judul — tab teks, yang aktif bergaris bawah */
export default function NameStylePicker({ value, onChange }: Props) {
  const { t } = useT();
  const u = t.upload;
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
      <span className="mr-1 text-[12.5px] text-fg-3">{u.nameStyle}</span>
      <div role="radiogroup" aria-label={u.nameStyle} className="flex flex-wrap">
        {NAME_STYLES.map((s) => {
          const on = value === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(s)}
              className={cn(
                "relative h-9 cursor-pointer px-2.5 text-[13px] font-medium transition-colors",
                on ? "text-fg" : "text-fg-3 hover:text-fg",
              )}
            >
              {u.nameStyles[s]}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-fg transition-[transform,opacity] duration-300 ease-[var(--ease)]",
                  on ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

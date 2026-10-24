import { cn } from "@/lib/utils";

interface Props {
  /** 0–100; null = indeterminate */
  value: number | null;
  label?: string;
  tone?: "accent" | "ok" | "err";
  className?: string;
}

export default function Progress({ value, label, tone = "accent", className }: Props) {
  const color = tone === "ok" ? "bg-ok" : tone === "err" ? "bg-err" : "bg-accent";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      className={cn("h-1 w-full overflow-hidden rounded-xs bg-tonal", value == null && "indeterminate", className)}
    >
      {value != null && (
        <div
          className={cn("h-full origin-left transition-transform duration-500 ease-[var(--ease)]", color)}
          style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }}
        />
      )}
    </div>
  );
}

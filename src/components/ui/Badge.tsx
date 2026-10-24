import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "ok" | "warn" | "err";

const tones: Record<Tone, string> = {
  neutral: "text-fg-2",
  accent: "text-fg",
  ok: "text-ok",
  warn: "text-warn",
  err: "text-err",
};

/** Status ringkas: titik + teks, tanpa bingkai (warna tidak jadi satu-satunya penanda — selalu ada teks) */
export default function Badge({ tone = "neutral", children, className, dot = true }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-xs bg-current/10 px-2 text-[11px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

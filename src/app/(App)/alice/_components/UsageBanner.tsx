"use client";

import { useState } from "react";
import { WarningTriangle, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { alice, type Usage } from "../_lib/store";

// Ambang peringatan (acuan Claude: "percakapan panjang" & "mendekati batas pemakaian")
const CONTEXT_WARN = 0.6;
const CONTEXT_DANGER = 0.85;
const RATE_WARN = 0.2;

/**
 * Peringatan di atas kotak tulis: percakapan sudah memakai sebagian besar jendela konteks (jawaban makin mahal &
 * detail awal mudah terlewat → ajak mulai chat baru), atau sisa batas pemakaian API Anthropic tinggal sedikit.
 */
export default function UsageBanner({ usage, convId }: { usage?: Usage; convId: string }) {
  const { t, f } = useT();
  const u = t.alice.usage;
  const [hidden, setHidden] = useState<string | null>(null);
  if (!usage) return null;

  const ctx = usage.context / usage.window;
  const kind = usage.rate != null && usage.rate < RATE_WARN ? "rate" : ctx >= CONTEXT_WARN ? "context" : null;
  // Ditutup → baru muncul lagi bila tingkatnya naik (kunci = jenis + level)
  const key = kind && `${convId}:${kind}:${kind === "context" ? (ctx >= CONTEXT_DANGER ? 2 : 1) : 1}`;
  if (!kind || hidden === key) return null;
  const danger = kind === "rate" || ctx >= CONTEXT_DANGER;

  return (
    <div
      role="status"
      className={cn(
        "mb-2 flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5 text-[13px]",
        danger ? "border-warn/30 bg-warn/[0.1] text-fg" : "border-[var(--hairline)] bg-fg/[0.05] text-fg-2",
      )}
    >
      <WarningTriangle width={16} height={16} className={cn("mt-0.5 shrink-0", danger ? "text-warn" : "text-fg-3")} />
      <p className="min-w-0 flex-1 leading-snug">
        {kind === "rate" ? f(u.rate, { p: Math.max(0, Math.round((usage.rate ?? 0) * 100)) }) : f(danger ? u.contextDanger : u.context, { p: Math.round(ctx * 100) })}
        {kind === "context" && (
          <button type="button" onClick={() => alice.open(null)} className="ml-1.5 cursor-pointer font-semibold text-fg underline-offset-2 hover:underline">
            {u.newChat}
          </button>
        )}
      </p>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={() => setHidden(key)}
        className="-mr-1 -mt-0.5 grid size-6 shrink-0 cursor-pointer place-items-center rounded-[6px] text-fg-3 transition-colors hover:bg-fg/[0.08] hover:text-fg"
      >
        <Xmark width={14} height={14} />
      </button>
    </div>
  );
}

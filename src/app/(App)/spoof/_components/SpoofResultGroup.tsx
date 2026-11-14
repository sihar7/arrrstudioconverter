"use client";

import { useState } from "react";
import { CheckCircle, Copy, Redo, WarningTriangle, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

const PREVIEW = 8;

interface Props {
  ok: boolean;
  message: string;
  ids: string[];
  onDismiss: () => void;
  /** Hanya untuk grup gagal: isi ulang kolom ID */
  onRefill?: () => void;
}

/** Satu baris untuk banyak aset dengan hasil yang sama (bukan 37 baris pesan kembar) */
export default function SpoofResultGroup({ ok, message, ids, onDismiss, onRefill }: Props) {
  const { t, f } = useT();
  const S = t.spoof;
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const many = ids.length > 1;
  const shown = expanded ? ids : ids.slice(0, PREVIEW);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      toast(f(S.idsCopied, { n: ids.length }), "ok");
    } catch {
      /* clipboard diblokir — abaikan */
    }
  };

  const action =
    "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-fg-2 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-[0.97]";

  return (
    <div className="flex items-start gap-3 border-b border-[var(--hairline)] px-5 py-4 text-[14px] desk:px-4 desk:py-3 desk:text-[13px]">
      {ok ? (
        <CheckCircle width={16} height={16} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
      ) : (
        <WarningTriangle width={16} height={16} className="mt-0.5 shrink-0 text-err" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="leading-relaxed text-fg-2">
          {many ? (
            <span className={cn("font-semibold", ok ? "text-ok" : "text-fg")}>{f(S.groupCount, { n: ids.length })}</span>
          ) : (
            <span className="font-mono text-fg">{ids[0]}</span>
          )}{" "}
          — {message}
        </p>
        {many && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {shown.map((id) => (
              <span key={id} className="rounded-full bg-fg/[0.06] px-2 py-0.5 font-mono text-[11.5px] text-fg-2">
                {id}
              </span>
            ))}
            {ids.length > PREVIEW && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="cursor-pointer rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg"
              >
                {expanded ? S.lessIds : f(S.moreIds, { n: ids.length - PREVIEW })}
              </button>
            )}
          </div>
        )}
        {(many || onRefill) && (
          <div className="-ml-3 mt-2 flex flex-wrap items-center gap-0.5">
            {many && (
              <button type="button" onClick={() => void copy()} className={action}>
                <Copy width={14} height={14} aria-hidden="true" /> {S.copyIds}
              </button>
            )}
            {onRefill && (
              <button type="button" onClick={onRefill} title={S.refillHint} className={action}>
                <Redo width={14} height={14} aria-hidden="true" /> {S.refill}
              </button>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={S.dismiss}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
      >
        <Xmark width={16} height={16} aria-hidden="true" />
      </button>
    </div>
  );
}

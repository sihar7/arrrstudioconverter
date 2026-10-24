"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import IconButton from "./IconButton";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** <dialog> native: fokus terkunci, Esc menutup, klik scrim menutup */
export default function Dialog({ open, onClose, title, sub, children, footer, width = "max-w-[560px]" }: Props) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dlg-title"
      className={cn(
        "mat m-auto w-[calc(100%-32px)] max-h-[88dvh] overflow-hidden rounded-l border border-line/60 bg-raised p-0 text-fg shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)] backdrop:backdrop-blur-[6px] open:flex open:flex-col open:animate-[dlg-in_.5s_var(--ease)]",
        width,
      )}
    >
      {open && (
        <>
          <header className="flex items-start justify-between gap-4 border-b border-line/60 px-6 pb-5 pt-6 sm:px-7">
            <div className="min-w-0">
              <h2 id="dlg-title" className="font-display text-[22px] font-bold tracking-[-0.02em]">
                {title}
              </h2>
              {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">{sub}</p>}
            </div>
            <IconButton label={t.common.close} icon={<Xmark width={20} height={20} />} onClick={onClose} className="-mr-2 -mt-1" />
          </header>
          <div className="thin-scroll flex-1 overflow-y-auto px-6 pb-6 pt-5 sm:px-7">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line/60 px-6 py-4 sm:px-7">{footer}</footer>}
        </>
      )}
    </dialog>
  );
}

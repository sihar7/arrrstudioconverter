"use client";

import { useEffect, useId, useState } from "react";
import { NavArrowDown } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import Button from "@/components/ui/Button";
import { getDesktop } from "@/type/desktop";

const KEY = "arrc_consent";
type Choice = "all" | "essential";

/**
 * Banner persetujuan cookie — muncul sekali per perangkat, di atas tab bar HP.
 * App desktop: tidak ditampilkan (aplikasi, bukan situs; hanya cookie sesi yang wajib).
 */
export default function CookieConsent() {
  const { t } = useT();
  const C = t.consent;
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved || getDesktop()) return;
    // Tunda sedikit supaya tidak berebut perhatian dengan konten pertama
    const id = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(id);
  }, []);

  const choose = (c: Choice) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice: c, at: Date.now() }));
    } catch {}
    setOpen(false);
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-hidden={!open}
      className={cn(
        "fixed inset-x-4 z-50 transition-[transform,opacity] duration-500 ease-[var(--ease)] bottom-[calc(88px+env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-6 sm:w-[400px] tabless:bottom-6 desk:bottom-[calc(var(--dock-h)+16px)]",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <div className="mat rounded-l border border-line/70 bg-raised p-5 shadow-[var(--elev-3)]">
        <h2 id="consent-title" className="text-[15px] font-semibold">
          {C.title}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{C.body}</p>

        <button
          type="button"
          aria-expanded={details}
          aria-controls={detailsId}
          tabIndex={open ? 0 : -1}
          onClick={() => setDetails((d) => !d)}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-medium text-fg-3 hover:text-fg"
        >
          {details ? C.hideDetails : C.details}
          <NavArrowDown width={14} height={14} className={cn("transition-transform duration-300", details && "rotate-180")} />
        </button>
        <div id={detailsId} hidden={!details}>
          <dl className="mt-3 grid gap-2 border-t border-line/70 pt-3">
            {C.items.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 text-[12.5px] leading-snug">
                <dt className="font-mono text-fg-2">{k}</dt>
                <dd className="text-fg-3">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 [&>*]:min-w-fit [&>*]:flex-1">
          <Button variant="tonal" tabIndex={open ? 0 : -1} onClick={() => choose("essential")}>
            {C.essential}
          </Button>
          <Button variant="primary" tabIndex={open ? 0 : -1} onClick={() => choose("all")}>
            {C.accept}
          </Button>
        </div>
      </div>
    </section>
  );
}

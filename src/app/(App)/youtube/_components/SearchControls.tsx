"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { Check, NavArrowDown, NavArrowLeft, NavArrowRight, Xmark } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, type SearchFilters } from "../_types/youtube.type";

/**
 * Kontrol pencarian YouTube: rel jelajah (pilihan cepat + genre), segmented Versi/Urutan, dropdown, token filter aktif.
 * Indikator "meluncur" diukur dari elemen nyata (offsetLeft/Width) + ResizeObserver → ikut ukuran font/bahasa/layar.
 * Semua listener/observer dilepas saat unmount; tidak ada yang menumpuk per klik.
 */

type Box = { x: number; y: number; w: number; h: number };

/** Ukur elemen aktif ([data-on=true]) di dalam container; null = tidak ada yang aktif */
function useThumb(ref: RefObject<HTMLElement | null>, activeKey: string) {
  const [box, setBox] = useState<Box | null>(null);
  // Pengukuran pertama tanpa animasi (jangan meluncur dari kiri saat halaman dibuka)
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const measure = () => {
      const el = c.querySelector<HTMLElement>("[data-on='true']");
      setBox(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
  }, [ref, activeKey]);
  useEffect(() => {
    if (!box || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [box, ready]);
  const style: CSSProperties | undefined = box
    ? { transform: `translate3d(${box.x}px, ${box.y}px, 0)`, width: box.w, height: box.h }
    : undefined;
  return { style, visible: Boolean(box), animate: ready };
}

/* ---------------- Rel jelajah ---------------- */

export function ExploreRail({ query, onPick }: { query: string; onPick: (q: string) => void }) {
  const { t } = useT();
  const y = t.youtube;
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const active = [...y.chips, ...y.genres].some(([, q]) => q === query) ? query : "";
  const thumb = useThumb(scroller, active);

  // Tepi bisa digeser → panah & fade muncul (scroll pasif + ResizeObserver)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      const l = el.scrollLeft > 4;
      const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setEdge((e) => (e.l === l && e.r === r ? e : { l, r }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  // Chip aktif selalu terlihat (mis. dipilih dari palette / bahasa berganti)
  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>("[data-on='true']")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const mask = `linear-gradient(to right, ${edge.l ? "transparent 0, #000 56px" : "#000 0"}, ${edge.r ? "#000 calc(100% - 56px), transparent 100%" : "#000 100%"})`;

  const chip = ([label, q]: [string, string]) => {
    const on = q === active;
    return (
      <button
        key={q}
        type="button"
        data-on={on}
        aria-pressed={on}
        onClick={() => onPick(q)}
        className={cn(
          "ios-press relative z-[1] h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 text-[13.5px] font-medium transition-[color,background-color] duration-200 desk:h-8 desk:rounded-[8px] desk:px-3 desk:text-[12.5px]",
          on ? "text-bg" : "bg-fg/[0.06] text-fg-2 hover:bg-fg/[0.11] hover:text-fg",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="relative -mx-1">
      <div
        ref={scroller}
        role="group"
        aria-label={`${y.quick} · ${y.genre}`}
        className="relative flex items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {/* Indikator meluncur di belakang chip aktif */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-0 top-0 rounded-full bg-fg desk:rounded-[8px]",
            thumb.animate && "transition-[transform,width,opacity] duration-300 ease-[var(--ease)] motion-reduce:transition-none",
            thumb.visible ? "opacity-100" : "opacity-0",
          )}
          style={thumb.style}
        />
        <RailLabel>{y.quick}</RailLabel>
        {y.chips.map(chip)}
        <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-fg/12" />
        <RailLabel>{y.genre}</RailLabel>
        {y.genres.map(chip)}
      </div>
      <RailArrow side="left" show={edge.l} label={y.scrollLeft} onClick={() => nudge(-1)} />
      <RailArrow side="right" show={edge.r} label={y.scrollRight} onClick={() => nudge(1)} />
    </div>
  );
}

function RailLabel({ children }: { children: ReactNode }) {
  return <span className="caps mr-1 shrink-0 pl-0.5 text-[10.5px] text-fg-3">{children}</span>;
}

function RailArrow({ side, show, label, onClick }: { side: "left" | "right"; show: boolean; label: string; onClick: () => void }) {
  const Icon = side === "left" ? NavArrowLeft : NavArrowRight;
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      onClick={onClick}
      className={cn(
        "ios-press absolute top-1/2 z-[2] hidden size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line/70 bg-raised text-fg shadow-[var(--elev-3)] transition-[opacity,scale] duration-200 hover:bg-hover sm:grid desk:size-8",
        side === "left" ? "left-0" : "right-0",
        show ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
      )}
    >
      <Icon width={16} height={16} strokeWidth={2} />
    </button>
  );
}

/* ---------------- Segmented ---------------- */

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
}

/** Segmented ala iOS: thumb terangkat meluncur ke pilihan aktif. Radiogroup + panah kiri/kanan (roving tabindex). */
export function Segmented<V extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: V;
  options: SegmentOption<V>[];
  onChange: (v: V) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const thumb = useThumb(ref, value);

  const onKey = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = options.findIndex((o) => o.value === value);
      const next = options[(i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
      onChange(next.value);
      requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("[data-on='true']")?.focus());
    },
    [options, value, onChange],
  );

  return (
    <div className={cn("max-w-full overflow-x-auto rounded-full [scrollbar-width:none] desk:rounded-[9px] [&::-webkit-scrollbar]:hidden", className)}>
      <div
        ref={ref}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKey}
        className="relative flex w-max items-center rounded-full bg-fg/[0.06] p-1 desk:rounded-[9px] desk:p-[3px]"
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-0 top-0 rounded-full bg-raised shadow-[0_1px_2px_rgb(0_0_0/0.2),0_0_0_0.5px_rgb(0_0_0/0.06)] desk:rounded-[7px]",
            thumb.animate && "transition-[transform,width] duration-300 ease-[var(--ease)] motion-reduce:transition-none",
            thumb.visible ? "opacity-100" : "opacity-0",
          )}
          style={thumb.style}
        />
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              data-on={on}
              tabIndex={on ? 0 : -1}
              onClick={() => !on && onChange(o.value)}
              className={cn(
                "relative z-[1] inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent desk:h-[26px] desk:rounded-[7px] desk:px-2.5 desk:text-[12.5px]",
                on ? "font-semibold text-fg" : "text-fg-3 hover:text-fg",
              )}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Dropdown ringkas ---------------- */

/**
 * Pill dropdown: "Durasi | < 4 mnt". Bawaan = netral; terisi = pill terang.
 * Listener luar/keyboard hanya terpasang selama menu terbuka & dilepas saat tutup/unmount.
 */
export function FilterSelect({
  label,
  value,
  options,
  changed,
  onPick,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  changed: boolean;
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(options);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [])];
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLButtonElement>("[aria-selected=true]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "ios-press inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full pl-4 pr-3 text-[13px] font-medium transition-colors desk:h-8 desk:rounded-[9px] desk:pl-3 desk:pr-2 desk:text-[12.5px]",
          changed ? "bg-fg text-bg" : "bg-fg/[0.06] text-fg-2 hover:bg-fg/[0.11] hover:text-fg",
          open && !changed && "bg-fg/[0.11] text-fg",
        )}
      >
        <span className={cn(!changed && "text-fg-3")}>{label}</span>
        <span aria-hidden="true" className={cn("h-3 w-px", changed ? "bg-bg/30" : "bg-fg/15")} />
        <span>{options[value]}</span>
        <NavArrowDown width={14} height={14} aria-hidden="true" className={cn("transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="ios-pop mat absolute right-0 top-[calc(100%+6px)] z-[60] min-w-48 rounded-l border border-line/70 bg-raised p-1.5 shadow-[var(--elev-3)] sm:left-0 sm:right-auto"
        >
          {entries.map(([v, text]) => (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={v === value}
              onClick={() => {
                setOpen(false);
                if (v !== value) onPick(v);
              }}
              className={cn(
                "state-layer flex min-h-10 w-full cursor-pointer items-center justify-between gap-6 rounded-s px-3 text-left text-[13.5px] transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none desk:min-h-8 desk:text-[12.5px]",
                v === value ? "font-semibold text-fg" : "text-fg-2 hover:text-fg",
              )}
            >
              {text}
              {v === value && <Check width={15} height={15} strokeWidth={2.2} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Token filter aktif ---------------- */

type FilterKey = keyof SearchFilters;
const TOKEN_KEYS: FilterKey[] = ["version", "sort", "duration", "upload"];

/** Filter yang tidak bawaan tampil sebagai token di judul hasil; × menghapus satu, Reset semua */
export function ActiveFilters({ filters, onChange }: { filters: SearchFilters; onChange: (patch: Partial<SearchFilters>) => void }) {
  const { t, f } = useT();
  const y = t.youtube;
  const on = TOKEN_KEYS.filter((k) => filters[k] !== DEFAULT_FILTERS[k]);
  if (!on.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {on.map((k) => {
        const text = (y.filters[k].options as Record<string, string>)[filters[k]];
        return (
          <span key={k} className="rise inline-flex h-7 items-center gap-1 rounded-full bg-fg/[0.07] pl-3 pr-1 text-[12.5px] font-medium text-fg desk:h-6 desk:rounded-[7px] desk:text-[11.5px]">
            <span className="text-fg-3">{y.filters[k].label}</span> {text}
            <button
              type="button"
              aria-label={f(y.removeFilter, { name: `${y.filters[k].label} ${text}` })}
              onClick={() => onChange({ [k]: DEFAULT_FILTERS[k] } as Partial<SearchFilters>)}
              className="ios-press grid size-5 cursor-pointer place-items-center rounded-full text-fg-3 transition-colors hover:bg-fg/[0.12] hover:text-fg"
            >
              <Xmark width={13} height={13} strokeWidth={2.2} />
            </button>
          </span>
        );
      })}
      {on.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="ios-press h-7 cursor-pointer px-2 text-[12.5px] font-medium text-fg-3 transition-colors hover:text-fg desk:h-6 desk:text-[11.5px]"
        >
          {y.filterReset}
        </button>
      )}
    </div>
  );
}

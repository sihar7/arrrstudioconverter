"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { CheckCircle, InfoCircle, WarningTriangle, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissToast, type Toast } from "@/store/slices/toastSlice";
import { cn } from "@/lib/utils";
import QueueNotice from "./QueueNotice";

const GAP = 8;
const PEEK = 10;
const MAX_VISIBLE = 3;

/** Tutup otomatis; berhenti saat deck di-hover/fokus, sisa waktu dilanjutkan */
function useAutoDismiss(ms: number, paused: boolean, onDone: () => void) {
  const left = useRef(ms);
  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    const id = setTimeout(onDone, left.current);
    return () => {
      clearTimeout(id);
      left.current = Math.max(800, left.current - (Date.now() - start));
    };
  }, [paused, onDone]);
}

function ToastRow({ toast, paused }: { toast: Toast; paused: boolean }) {
  const dispatch = useAppDispatch();
  const close = useCallback(() => dispatch(dismissToast(toast.id)), [dispatch, toast.id]);
  useAutoDismiss(toast.kind === "err" ? 6500 : 4200, paused, close);

  const Icon = toast.kind === "ok" ? CheckCircle : toast.kind === "err" ? WarningTriangle : InfoCircle;
  return (
    <div
      role={toast.kind === "err" ? "alert" : "status"}
      className="group/t flex w-full items-center gap-3 rounded-[14px] border border-line/60 bg-raised/95 py-2.5 pl-2.5 pr-2 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.5),inset_0_0.5px_0_rgb(255_255_255/0.06)] backdrop-blur-xl light:bg-white/95 light:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.06)]"
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          toast.kind === "ok" ? "bg-ok/14 text-ok" : toast.kind === "err" ? "bg-err/14 text-err" : "bg-fg/[0.08] text-fg-2",
        )}
        aria-hidden="true"
      >
        <Icon width={17} height={17} />
      </span>
      <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug [overflow-wrap:anywhere]">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={close}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-fg-3 opacity-60 transition-[opacity,background-color,color] hover:bg-fg/[0.07] hover:text-fg hover:opacity-100 focus-visible:opacity-100 group-hover/t:opacity-100"
      >
        <Xmark width={15} height={15} />
      </button>
    </div>
  );
}

/** Satu kartu deck: mengukur tinggi isinya sendiri (untuk susunan terbuka/tertutup) */
function DeckCard({
  id,
  onHeight,
  children,
  ...rest
}: { id: string; onHeight: (id: string, px: number) => void; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onHeight(id, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, onHeight]);
  return (
    <div {...rest}>
      <div ref={inner} className="toast-enter">
        {children}
      </div>
    </div>
  );
}

/**
 * Deck toast (kanan bawah; app desktop: di atas transport bar). Kartu bertumpuk seperti notifikasi sistem:
 * yang terbaru di depan, yang lama mengintip di belakang (mengecil). Hover/fokus → deck terbuka penuh
 * dan semua timer berhenti. Popup "Masuk antrean" ikut dalam deck yang sama.
 */
export default function Toaster() {
  const items = useAppSelector((s) => s.toast.items);
  // Popup antrean hanya ikut deck kalau itemnya masih ada (QueueNotice merender null bila tidak)
  const queue = useAppSelector((s) => (s.toast.queue && s.converter.items.some((i) => i.key === s.toast.queue!.keys.at(-1)) ? s.toast.queue : null));
  const [open, setOpen] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const entries: { id: string; at: number; node: ReactNode }[] = [
    ...items.map((t) => ({ id: t.id, at: t.at, node: <ToastRow toast={t} paused={open} /> })),
    ...(queue ? [{ id: "queue", at: queue.stamp, node: <QueueNotice paused={open} /> }] : []),
  ].sort((a, b) => b.at - a.at); // terbaru di depan (index 0)

  // Deck kosong → pasti tertutup lagi (hover tidak pernah "lepas" kalau elemennya hilang)
  const [wasEmpty, setWasEmpty] = useState(!entries.length);
  if (wasEmpty !== !entries.length) {
    setWasEmpty(!entries.length);
    if (!entries.length) setOpen(false);
  }

  const onHeight = useCallback((id: string, px: number) => setHeights((h) => (h[id] === px ? h : { ...h, [id]: px })), []);

  const h = (id: string) => heights[id] ?? 64;
  const front = entries[0] ? h(entries[0].id) : 0;
  const visible = entries.slice(0, open ? entries.length : MAX_VISIBLE);
  const total = open ? visible.reduce((sum, e) => sum + h(e.id), 0) + GAP * Math.max(0, visible.length - 1) : front + PEEK * Math.min(entries.length - 1, MAX_VISIBLE - 1);

  return (
    <div
      aria-live="polite"
      data-toaster=""
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      style={{ height: total }}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] transition-[height] duration-300 ease-[var(--ease)] sm:left-auto sm:right-6 sm:w-[380px] desk:bottom-[calc(var(--dock-h)+14px)] desk:right-5"
    >
      {entries.map((e, i) => {
        // Terbuka: tumpuk vertikal penuh · tertutup: kartu lama mengintip PEEK px di atas, mengecil 5%/lapis
        const lift = open ? entries.slice(0, i).reduce((sum, x) => sum + h(x.id) + GAP, 0) : i * PEEK;
        const scale = open ? 1 : 1 - Math.min(i, MAX_VISIBLE) * 0.05;
        const hidden = !open && i >= MAX_VISIBLE;
        return (
          <DeckCard
            key={e.id}
            id={e.id}
            onHeight={onHeight}
            aria-hidden={hidden || undefined}
            style={{
              transform: `translateY(${-lift}px) scale(${scale})`,
              zIndex: entries.length - i,
              opacity: hidden ? 0 : 1,
              // Tertutup: kartu belakang setinggi kartu depan (tepinya rata, isi tidak menyembul)
              height: !open && i > 0 ? front : undefined,
            }}
            className={cn("toast-card absolute inset-x-0 bottom-0 origin-bottom overflow-hidden rounded-[14px]", hidden ? "pointer-events-none" : "pointer-events-auto")}
          >
            {/* Kartu di belakang dibuat redup supaya tidak bersaing dengan yang di depan */}
            <div className={cn("transition-opacity duration-300", !open && i > 0 && "opacity-70")}>{e.node}</div>
          </DeckCard>
        );
      })}
    </div>
  );
}

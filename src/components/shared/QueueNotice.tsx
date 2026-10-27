"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, NavArrowRight, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dismissQueueNotice } from "@/store/slices/toastSlice";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

const SHOW_MS = 5500;

/**
 * Popup kanan bawah setelah lagu dikirim ke antrean: cover + judul + artis, klik → halaman Converter.
 * Tambahan beruntun memperbarui popup yang sama (+N lagu lain) dan mengulang timer; hover/fokus menjeda timer.
 */
export default function QueueNotice() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { t, f } = useT();
  const y = t.youtube;
  const notice = useAppSelector((s) => s.toast.queue);
  const lastKey = notice?.keys.at(-1);
  const item = useAppSelector((s) => s.converter.items.find((i) => i.key === lastKey));
  const queued = useAppSelector((s) => s.converter.items.filter((i) => i.status !== "done").length);
  const [paused, setPaused] = useState(false);
  const left = useRef(SHOW_MS);
  const close = useCallback(() => dispatch(dismissQueueNotice()), [dispatch]);

  // Tambahan baru → hitung ulang dari awal
  useEffect(() => {
    left.current = SHOW_MS;
  }, [notice?.stamp]);

  useEffect(() => {
    if (!notice || paused) return;
    const start = Date.now();
    const id = setTimeout(close, left.current);
    return () => {
      clearTimeout(id);
      left.current = Math.max(800, left.current - (Date.now() - start));
    };
  }, [notice, paused, close]);

  // Sudah di Converter → antrean terlihat langsung, popup tidak perlu
  useEffect(() => {
    if (notice && pathname === "/converter") close();
  }, [notice, pathname, close]);

  if (!notice || !item) return null;
  const more = notice.keys.length - 1;
  const artist = item.artist ?? item.author;

  return (
    <div
      key={notice.stamp}
      className="group/qn rise pointer-events-auto relative w-full overflow-hidden rounded border border-line-2 bg-raised shadow-[var(--shadow)]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Link
        href="/converter"
        onClick={close}
        className="state-layer flex min-h-[72px] items-center gap-3 py-3 pl-3 pr-12 transition-transform duration-150 active:scale-[0.985]"
      >
        <span className="relative size-12 shrink-0 overflow-hidden rounded-[10px] bg-fg/[0.07]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={item.cover ?? item.thumbnail}
            src={item.cover ?? item.thumbnail}
            alt=""
            decoding="async"
            className="fade-in size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="pick-pop absolute -bottom-px -right-px grid size-[18px] place-items-center rounded-tl-[8px] bg-[var(--ios-green)] text-white"
          >
            <Check width={12} height={12} strokeWidth={2.6} />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-2">
            {notice.dup ? y.queueAlready : y.queueAdded}
            {more > 0 && <span className="rounded-full bg-fg/[0.08] px-1.5 py-px text-[11px] tabular-nums text-fg-2">{f(y.queueMore, { n: more })}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[14px] font-semibold leading-snug" title={item.title}>
            {item.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-fg-3">
            <span className="truncate">{artist}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex shrink-0 items-center font-semibold text-fg-2 transition-colors group-hover/qn:text-fg">
              {y.queueOpen}
              <NavArrowRight width={14} height={14} strokeWidth={2.2} className="transition-transform duration-200 group-hover/qn:translate-x-0.5" />
            </span>
          </span>
          <span className="sr-only">{f(y.queueCount, { n: queued })}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={t.common.close}
        onClick={close}
        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg"
      >
        <Xmark width={16} height={16} />
      </button>
      {/* Sisa waktu tampil — berhenti saat dijeda */}
      <span
        aria-hidden="true"
        className={cn("qn-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-fg/25", paused && "[animation-play-state:paused]")}
        style={{ animationDuration: `${SHOW_MS}ms` }}
      />
    </div>
  );
}

"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Folder, MusicDoubleNote, Pause, Play, Xmark } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { enqueue, isRunning } from "@/store/slices/converterSlice";
import { previewPlayer, usePreview } from "@/lib/previewPlayer";
import { useT } from "@/hooks/useT";
import { cn, formatDuration } from "@/lib/utils";
import { getDesktop } from "@/type/desktop";
import Button from "@/components/ui/Button";

/**
 * Transport bar di dasar area kerja (acuan: control bar Logic Pro + player Splice):
 * kiri mini-player preview · tengah "LCD" status antrean (klik → Converter) · kanan Convert & folder simpan.
 */
export default function TransportBar() {
  const { t, f } = useT();
  const s = t.desktop.shell;
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const ready = useAppSelector((st) => st.converter.items.filter((i) => i.status === "idle" || i.status === "error").length);
  const desktop = getDesktop();

  return (
    <footer className="fixed bottom-0 right-0 z-40 grid h-[var(--dock-h)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-t border-[var(--hairline)] bg-[var(--glass)] px-4 backdrop-blur-xl backdrop-saturate-150 transition-[left] duration-[var(--spring-dur)] ease-[var(--spring)] left-[var(--side-w)] max-[979px]:grid-cols-[auto_minmax(0,1fr)_auto]">
      <MiniPlayer />
      <QueueLcd />
      <div className="flex items-center justify-end gap-1.5">
        {ready > 0 && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              dispatch(enqueue());
              if (!pathname.startsWith("/converter")) router.push("/converter");
            }}
            className="whitespace-nowrap"
          >
            {f(s.convert, { n: ready })}
          </Button>
        )}
        {desktop && (
          <button
            type="button"
            onClick={() => desktop.openDownloadsFolder()}
            aria-label={t.desktop.openFolder}
            title={t.desktop.openFolder}
            className="grid size-10 cursor-pointer place-items-center rounded-[10px] text-fg-3 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95"
          >
            <Folder width={18} height={18} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </footer>
  );
}

/** Preview hasil convert: cover · judul/artis · scrubber tipis · putar/jeda · tutup */
function MiniPlayer() {
  const { t } = useT();
  const s = t.desktop.shell;
  const { track, playing, time, duration } = usePreview();
  const bar = useRef<HTMLDivElement>(null);

  if (!track) {
    return (
      <div className="flex min-w-0 items-center gap-3 text-fg-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-fg/[0.06] ring-1 ring-inset ring-[var(--hairline)]">
          <MusicDoubleNote width={18} height={18} />
        </span>
        <span className="min-w-0 max-[1179px]:hidden">
          <span className="block truncate text-[12.5px] font-medium text-fg-2">{s.nothingPlaying}</span>
          <span className="block truncate text-[11.5px]">{s.nothingPlayingSub}</span>
        </span>
      </div>
    );
  }

  const pct = duration ? (time / duration) * 100 : 0;
  const seekAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = bar.current?.getBoundingClientRect();
    if (r && duration) previewPlayer.seek(((e.clientX - r.left) / r.width) * duration);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") previewPlayer.seek(time + 5);
    else if (e.key === "ArrowLeft") previewPlayer.seek(time - 5);
    else return;
    e.preventDefault();
  };

  return (
    <div className="group/mp flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={() => previewPlayer.toggle(track)}
        aria-label={playing ? s.pause : s.play}
        className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-[9px] bg-fg/[0.06] active:scale-95"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.cover} alt="" className="size-full object-cover" />
        <span className={cn("absolute inset-0 grid place-items-center bg-black/45 text-white transition-opacity", playing ? "opacity-0 group-hover/mp:opacity-100" : "opacity-100")}>
          {playing ? <Pause width={16} height={16} /> : <Play width={16} height={16} className="translate-x-px" />}
        </span>
      </button>
      <div className="min-w-0 flex-1 max-[979px]:hidden">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold" title={track.title}>
            {track.title}
          </p>
          <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-fg-3">
            {formatDuration(time)} / {formatDuration(duration || null)}
          </span>
        </div>
        <p className="truncate text-[11.5px] text-fg-3">{track.artist}</p>
        {/* Scrubber: klik/seret untuk lompat, panah kiri/kanan ±5 detik */}
        <div
          ref={bar}
          role="slider"
          tabIndex={0}
          aria-label={s.seek}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${formatDuration(time)} / ${formatDuration(duration || null)}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekAt(e);
          }}
          onPointerMove={(e) => e.buttons === 1 && seekAt(e)}
          onKeyDown={onKey}
          className="group/bar mt-1 flex h-2.5 cursor-pointer items-center"
        >
          <div className="relative h-[3px] w-full rounded-full bg-fg/[0.1]">
            <div className="absolute inset-y-0 left-0 rounded-full bg-fg/80" style={{ width: `${pct}%` }} />
            <span
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-fg shadow transition-transform duration-150 group-hover/bar:scale-100 group-focus-visible/bar:scale-100"
              style={{ left: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => previewPlayer.stop()}
        aria-label={s.close}
        title={s.close}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] text-fg-3 opacity-0 transition-[opacity,color] hover:bg-fg/[0.07] hover:text-fg focus-visible:opacity-100 group-hover/mp:opacity-100 max-[979px]:hidden"
      >
        <Xmark width={15} height={15} />
      </button>
    </div>
  );
}

/** "LCD" antrean: lagu yang sedang diproses + hitungan monospace + progres batch di garis bawah */
function QueueLcd() {
  const { t, f } = useT();
  const s = t.desktop.shell;
  const router = useRouter();
  const items = useAppSelector((st) => st.converter.items);
  const started = items.filter((i) => i.status !== "idle");
  const runningItems = items.filter((i) => isRunning(i.status));
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const ready = items.filter((i) => i.status === "idle").length;
  const current = runningItems.find((i) => i.status === "downloading" || i.status === "processing") ?? runningItems[0];
  const shown = current ?? items.at(-1);
  const pct = started.length
    ? started.reduce((sum, i) => sum + (i.status === "done" || i.status === "error" ? 100 : isRunning(i.status) ? i.progress : 0), 0) / started.length
    : 0;

  const [line1, line2] = current
    ? [current.title, [f(s.running, { n: runningItems.length }), f(s.done, { done, total: started.length }), `${Math.round(pct)}%`]]
    : ready
      ? [f(s.ready, { n: ready }), [f(s.done, { done, total: items.length })]]
      : items.length
        ? [failed ? f(s.failed, { n: failed }) : s.allDone, [f(s.done, { done, total: items.length })]]
        : [s.idle, [s.idleSub]];

  return (
    <button
      type="button"
      onClick={() => router.push("/converter")}
      title={s.openQueue}
      className="lcd group/lcd relative flex h-11 w-[clamp(260px,32vw,440px)] cursor-pointer items-center gap-3 overflow-hidden rounded-[12px] px-2.5 text-left transition-[scale] active:scale-[0.985] max-[979px]:w-full"
    >
      <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-fg/[0.07]">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown.cover ?? shown.thumbnail} alt="" className={cn("size-full object-cover", !current && "opacity-70")} />
        ) : (
          <MusicDoubleNote width={15} height={15} className="text-fg-3" />
        )}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-2">
          {current && (
            <span className="eq shrink-0 text-accent" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <span className="truncate text-[12.5px] font-semibold text-fg">{line1}</span>
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-fg-3">{line2.join("  ·  ")}</span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-fg-3 opacity-0 transition-opacity group-hover/lcd:opacity-100">{s.openQueue} ›</span>
      {started.length > 0 && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-fg/[0.06]">
          <span className="block h-full bg-accent transition-[width] duration-700 ease-[var(--ease)]" style={{ width: `${pct}%` }} />
        </span>
      )}
    </button>
  );
}
